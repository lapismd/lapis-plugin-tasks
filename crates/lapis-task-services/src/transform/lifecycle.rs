use super::{TaskMutation, TaskTransformError, action::patch, observations::byte_offset};
use crate::{
    ParsedTaskDocument, RecurrenceAnalysis, RecurrenceEngine, RecurrenceOptions, RepeatOptions,
    analyze_recurrence_rule, resolve_effective_occurrence,
};
use serde_json::{Value, json};

fn date(at: &str, explicit: &Option<String>) -> Result<String, TaskTransformError> {
    let date = explicit
        .clone()
        .unwrap_or_else(|| at.chars().take(10).collect());
    if !crate::document::dates::local(&json!(date)) {
        return Err(TaskTransformError::plain(format!(
            "Expected a local YYYY-MM-DD date; received {date}."
        )));
    }
    Ok(date)
}
fn require(task: &Value) -> Result<Value, TaskTransformError> {
    let Some(repeat) = task.get("repeat") else {
        return Err(TaskTransformError::recurrence(
            if task.get("unparsedRepeat").is_some() {
                "This recurrence is invalid or legacy. Replace or remove it before completion or skip."
            } else {
                "This task does not recur."
            },
        ));
    };
    match analyze_recurrence_rule(repeat["rrule"].as_str().unwrap()) {
        RecurrenceAnalysis::Supported => {}
        RecurrenceAnalysis::Unsupported { parts } => {
            return Err(TaskTransformError::recurrence(format!(
                "Replace unsupported recurrence properties before advancement: {}.",
                parts.join(", ")
            )));
        }
        RecurrenceAnalysis::Invalid { message } => {
            return Err(TaskTransformError::recurrence(message));
        }
    }
    if repeat["paused"] == true {
        return Err(TaskTransformError::recurrence(
            "Resume this recurrence before completion or skip.",
        ));
    }
    Ok(repeat.clone())
}
fn next(
    repeat: &Value,
    after: &str,
    inclusive: bool,
) -> Result<Option<String>, TaskTransformError> {
    let options: RepeatOptions = serde_json::from_value(repeat.clone()).unwrap();
    let Some(start) = options.start else {
        return Err(TaskTransformError::plain(
            "Completion-anchored recurrence has not established a start.",
        ));
    };
    let engine = RecurrenceEngine::new(RecurrenceOptions {
        start,
        rrule: options.rrule,
        rdate: options.rdate,
        exdate: options.exdate,
    })?;
    let mut candidate = engine.next(after, inclusive)?;
    while let Some(date) = &candidate {
        if !options
            .pause_ranges
            .iter()
            .any(|range| range.start <= *date && *date <= range.end)
        {
            break;
        }
        candidate = engine.next(date, false)?;
    }
    Ok(candidate)
}
fn plan(task: &mut Value, next: Option<String>) {
    let next = task.get("plan").cloned().and_then(|mut plan| {
        plan["date"] = json!(next?);
        Some(plan)
    });
    patch(task, "plan", next);
}
fn reset(document: &mut ParsedTaskDocument) {
    let items = crate::scan_task_structure(
        &document.body,
        &crate::TaskStructureOptions {
            document_id: "checklist-reset".into(),
            document_path: "checklist-reset.md".into(),
            document_kind: crate::TaskDocumentKind::Task,
        },
    )
    .checklist;
    let pattern = regex::Regex::new(r"^(\s*[-*+]\s+)\[(?: |x|X)\]").unwrap();
    for item in items.iter().rev() {
        let from = byte_offset(&document.body, item.source_start).unwrap();
        let to = byte_offset(&document.body, item.source_end).unwrap();
        let source = pattern
            .replace(&document.body[from..to], "${1}[ ]")
            .into_owned();
        document.body.replace_range(from..to, &source);
    }
    if let Some(items) = &mut document.checklist {
        for item in items {
            item.checked = false;
        }
    }
}

pub(super) fn apply(
    document: &mut ParsedTaskDocument,
    task: &mut Value,
    action: &TaskMutation,
) -> Result<bool, TaskTransformError> {
    match action {
        TaskMutation::Complete { at, local_date } => {
            if task.get("repeat").is_none() && task.get("unparsedRepeat").is_none() {
                task["status"] = json!("completed");
                task["completedAt"] = json!(at);
                task["inbox"] = json!(false);
                return Ok(true);
            }
            let mut repeat = require(task)?;
            let today = date(at, local_date)?;
            if repeat["anchor"] == "completion" && repeat.get("start").is_none() {
                repeat["start"] = json!(today);
                repeat["missed"] = json!("carry");
            }
            let occurrence = resolve_effective_occurrence(
                &serde_json::from_value(repeat.clone()).unwrap(),
                task["plan"]["date"].as_str(),
                &today,
            )?;
            if ["future", "exhausted", "paused", "unsupported"].contains(&occurrence.state.as_str())
            {
                return Err(TaskTransformError::recurrence(format!(
                    "Cannot complete a recurrence in {} state.",
                    occurrence.state
                )));
            }
            let anchor = if repeat["anchor"] == "completion" {
                today.as_str()
            } else {
                occurrence.date.as_deref().unwrap_or(&today)
            };
            let next = next(&repeat, anchor, false)?;
            if repeat["resetChecklist"] == true {
                reset(document);
            }
            task["status"] = json!("open");
            patch(task, "completedAt", None);
            task["inbox"] = json!(false);
            plan(task, next);
            repeat["lastCompletedAt"] = json!(at);
            repeat["completionCount"] =
                json!(repeat["completionCount"].as_f64().unwrap_or(0.0) + 1.0);
            task["repeat"] = repeat;
        }
        TaskMutation::Skip { at, local_date } => {
            if task.get("repeat").is_none() && task.get("unparsedRepeat").is_none() {
                return Ok(false);
            }
            let repeat = require(task)?;
            let today = date(at, local_date)?;
            let occurrence = resolve_effective_occurrence(
                &serde_json::from_value(repeat.clone()).unwrap(),
                task["plan"]["date"].as_str(),
                &today,
            )?;
            let Some(date) = occurrence.date else {
                return Ok(false);
            };
            if occurrence.state == "exhausted" {
                return Ok(false);
            }
            let next = next(&repeat, &date, false)?;
            task["status"] = json!("open");
            plan(task, next);
        }
        TaskMutation::Pause { at, local_date } => {
            if task["repeat"]["paused"] == true {
                return Ok(false);
            }
            let mut repeat = require(task)?;
            repeat["paused"] = json!(true);
            repeat["pausedSince"] = json!(date(at, local_date)?);
            task["repeat"] = repeat;
        }
        TaskMutation::Resume { at, local_date } => {
            let mut repeat = task["repeat"].clone();
            if repeat["paused"] != true || repeat["pausedSince"].as_str().is_none_or(str::is_empty)
            {
                return Ok(false);
            }
            let resumed = date(at, local_date)?;
            let end = chrono::NaiveDate::parse_from_str(&resumed, "%Y-%m-%d")
                .unwrap()
                .pred_opt()
                .unwrap()
                .format("%Y-%m-%d")
                .to_string();
            let mut ranges = repeat["pauseRanges"]
                .as_array()
                .cloned()
                .unwrap_or_default();
            if repeat["pausedSince"].as_str().unwrap() <= end.as_str() {
                ranges.push(json!({"start":repeat["pausedSince"],"end":end}));
            }
            repeat["paused"] = json!(false);
            patch(&mut repeat, "pausedSince", None);
            repeat["pauseRanges"] = json!(ranges);
            let next = if repeat["start"]
                .as_str()
                .is_some_and(|value| !value.is_empty())
            {
                next(&repeat, &resumed, true)?
            } else {
                Some(resumed)
            };
            plan(task, next);
            task["repeat"] = repeat;
        }
        _ => unreachable!(),
    }
    Ok(true)
}
