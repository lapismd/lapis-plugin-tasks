mod records;

use serde_json::Value;

use crate::{
    EffectiveOccurrence, ParsedTaskDocument, RecurrenceError, RepeatOptions, TaskDocumentKind,
    resolve_effective_occurrence,
};

use records::TaskFields;
pub use records::TaskProjectionRecord;

pub const TASK_PROJECTION_VERSION: u32 = 4;

fn string(value: &Value) -> Option<String> {
    value.as_str().map(String::from)
}

/// Derive one disposable summary from a normalized parser snapshot and explicit
/// local date. This performs no clock, graph, storage, publication or write work.
pub fn project_task(
    document: &ParsedTaskDocument,
    today: &str,
) -> Result<TaskProjectionRecord, RecurrenceError> {
    let mut row = TaskProjectionRecord {
        document_path: document.path.clone(),
        document_id: document.id.clone(),
        kind: document.kind.clone(),
        title: document.title.clone(),
        status: "active".into(),
        inbox: false,
        start_kind: "anytime".into(),
        checklist_total: 0,
        checklist_completed: 0,
        comment_count: 0,
        projection_version: TASK_PROJECTION_VERSION,
        task: None,
    };
    match document.kind {
        TaskDocumentKind::TaskListNavigation => return Ok(row),
        TaskDocumentKind::TaskList => {
            let list = document
                .list
                .as_ref()
                .ok_or_else(|| RecurrenceError::invalid("Missing normalized Task List metadata"))?;
            row.status = string(&list["status"])
                .ok_or_else(|| RecurrenceError::invalid("Missing normalized Task List status"))?;
            return Ok(row);
        }
        TaskDocumentKind::Task => {}
    }
    let task = document
        .task
        .as_ref()
        .ok_or_else(|| RecurrenceError::invalid("Missing normalized Task metadata"))?;
    let checklist = document
        .checklist
        .as_ref()
        .ok_or_else(|| RecurrenceError::invalid("Missing normalized Task checklist"))?;
    let plan = &task["plan"];
    let effective = if let Some(repeat) = task.get("repeat") {
        let repeat: RepeatOptions = serde_json::from_value(repeat.clone())
            .map_err(|error| RecurrenceError::invalid(error.to_string()))?;
        Some(resolve_effective_occurrence(
            &repeat,
            plan["date"].as_str(),
            today,
        )?)
    } else if task.get("unparsedRepeat").is_some() {
        Some(EffectiveOccurrence {
            date: string(&plan["date"]),
            state: "unsupported".into(),
            effective_for_date: today.into(),
            warning: None,
        })
    } else {
        None
    };
    row.status = string(&task["status"])
        .ok_or_else(|| RecurrenceError::invalid("Missing normalized Task status"))?;
    row.inbox = task["inbox"] == true;
    row.start_kind = string(&task["start"]["kind"])
        .ok_or_else(|| RecurrenceError::invalid("Missing normalized Task start"))?;
    row.checklist_total = checklist.len();
    row.checklist_completed = checklist.iter().filter(|item| item.checked).count();
    row.comment_count = task["comments"].as_array().map_or(0, Vec::len);
    row.task = Some(TaskFields {
        priority: task["priority"].clone(),
        start_date: (row.start_kind == "date")
            .then(|| string(&task["start"]["date"]))
            .flatten(),
        plan_date: string(&plan["date"]),
        plan_kind: string(&plan["at"]),
        plan_time: string(&plan["time"]),
        duration_minutes: plan["durationMinutes"].as_f64(),
        deadline: string(&task["deadline"]),
        completed_at: string(&task["completedAt"]),
        repeat: task
            .get("repeat")
            .or_else(|| task.get("unparsedRepeat"))
            .cloned()
            .unwrap_or_default(),
        tracking: task["tracking"].clone(),
        effective_occurrence_date: effective.as_ref().and_then(|value| value.date.clone()),
        effective_occurrence_state: effective.as_ref().map(|value| value.state.clone()),
        effective_for_date: effective.map(|value| value.effective_for_date),
    });
    Ok(row)
}
