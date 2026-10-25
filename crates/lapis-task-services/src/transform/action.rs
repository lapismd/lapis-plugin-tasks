use super::{TaskMutation, TaskTransformError, observations::byte_offset};
use crate::{ParsedTaskDocument, TaskDocumentKind};
use regex::Regex;
use serde_json::{Value, json};

pub(super) fn patch(target: &mut Value, key: &str, value: Option<Value>) {
    let object = target.as_object_mut().expect("normalized task object");
    if let Some(value) = value {
        object.insert(key.into(), value);
    } else {
        object.remove(key);
    }
}
pub(super) fn value<T: serde::Serialize>(value: &Option<T>) -> Option<Value> {
    value
        .as_ref()
        .map(|value| serde_json::to_value(value).expect("pure value"))
}

fn checklist(
    document: &mut ParsedTaskDocument,
    position: f64,
    expected: &str,
    checked: bool,
) -> Result<(), TaskTransformError> {
    let item = document
        .checklist
        .as_mut()
        .and_then(|items| {
            items
                .iter_mut()
                .find(|item| item.position as f64 == position)
        })
        .filter(|item| item.text == crate::marker::trim(expected))
        .ok_or_else(TaskTransformError::checklist)?;
    let body_from = document.raw.encode_utf16().count() - document.body.encode_utf16().count();
    let from = item
        .source_start
        .checked_sub(body_from)
        .and_then(|from| byte_offset(&document.body, from))
        .ok_or_else(TaskTransformError::checklist)?;
    let to = item
        .source_end
        .checked_sub(body_from)
        .and_then(|to| byte_offset(&document.body, to))
        .ok_or_else(TaskTransformError::checklist)?;
    if document.body.get(from..to) != Some(item.source.as_str()) {
        return Err(TaskTransformError::checklist());
    }
    let replacement = Regex::new(r"^(\s*[-*+]\s+\[)( |x|X)(\])").unwrap().replace(
        &item.source,
        if checked { "${1}x${3}" } else { "${1} ${3}" },
    );
    if replacement == item.source && item.checked != checked {
        return Err(TaskTransformError::checklist());
    }
    document.body.replace_range(from..to, &replacement);
    item.checked = checked;
    Ok(())
}

pub(super) fn mutate(
    mut document: ParsedTaskDocument,
    action: &TaskMutation,
) -> Result<ParsedTaskDocument, TaskTransformError> {
    if document.kind != TaskDocumentKind::Task {
        return Err(TaskTransformError::plain("Expected a task document."));
    }
    if let TaskMutation::Checklist {
        position,
        expected_text,
        checked,
    } = action
    {
        checklist(&mut document, *position, expected_text, *checked)?;
        return Ok(document);
    }
    let mut task = document.task.take().expect("task snapshot");
    let at = match action {
        TaskMutation::Plan { plan, at } => {
            if task["start"]["kind"] == "someday" && plan.is_some() {
                task["start"] = json!({"kind":"anytime"});
            }
            patch(&mut task, "plan", value(plan));
            at
        }
        TaskMutation::Start { start, at } => {
            task["start"] = serde_json::to_value(start).unwrap();
            if matches!(start, super::TaskStart::Someday) {
                patch(&mut task, "plan", None);
            }
            at
        }
        TaskMutation::Deadline { deadline, at } => {
            patch(&mut task, "deadline", value(deadline));
            at
        }
        TaskMutation::Inbox { inbox, at } => {
            task["inbox"] = json!(inbox);
            at
        }
        TaskMutation::Tracking { tracking, at } => {
            if tracking.is_some() && task.get("repeat").is_none() {
                return Err(TaskTransformError::plain("Tracking requires recurrence."));
            }
            patch(&mut task, "tracking", value(tracking));
            patch(&mut task, "unparsedTracking", None);
            at
        }
        TaskMutation::Repeat { repeat, at } => {
            if let Some(repeat) = repeat {
                if let crate::RecurrenceAnalysis::Invalid { message } =
                    crate::analyze_recurrence_rule(&repeat.rrule)
                {
                    return Err(TaskTransformError::plain(message));
                }
                if repeat.anchor == super::TaskRepeatAnchor::Schedule
                    && repeat.start.as_deref().is_none_or(str::is_empty)
                {
                    return Err(TaskTransformError::plain(
                        "Schedule-anchored recurrence requires start.",
                    ));
                }
            }
            let mut next = value(repeat);
            if let Some(next) = next.as_mut() {
                if next["anchor"] == "completion" {
                    next["missed"] = json!("carry");
                }
                for field in ["lastCompletedAt", "completionCount"] {
                    if next.get(field).is_none() {
                        if let Some(previous) = task["repeat"].get(field) {
                            next[field] = previous.clone();
                        }
                    }
                }
            } else {
                patch(&mut task, "tracking", None);
                patch(&mut task, "unparsedTracking", None);
            }
            patch(&mut task, "repeat", next);
            patch(&mut task, "unparsedRepeat", None);
            at
        }
        TaskMutation::Cancel { at } => {
            task["status"] = json!("canceled");
            task["inbox"] = json!(false);
            at
        }
        TaskMutation::Reopen { at } => {
            task["status"] = json!("open");
            patch(&mut task, "completedAt", None);
            at
        }
        TaskMutation::Complete { at, .. }
        | TaskMutation::Skip { at, .. }
        | TaskMutation::Pause { at, .. }
        | TaskMutation::Resume { at, .. } => {
            let changed = super::lifecycle::apply(&mut document, &mut task, action)?;
            if !changed {
                document.task = Some(task);
                return Ok(document);
            }
            at
        }
        TaskMutation::Checklist { .. } => unreachable!(),
    };
    document.updated = Some(at.clone());
    document.task = Some(task);
    Ok(document)
}
