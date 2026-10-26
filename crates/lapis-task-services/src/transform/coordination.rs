use super::{
    TaskDayPartSettings, TaskMutation, TaskOccurrenceCompletion, TaskOccurrenceMaterialization,
    TaskPlan, TaskTracking, TaskTransformError, apply_task_mutation, task_occurrence_day_part,
    tracking_completion,
};
use crate::{RepeatOptions, parse_task_document, resolve_effective_occurrence};
use serde::{Deserialize, Serialize, Serializer};
use serde_json::json;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(
    tag = "type",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub enum TaskLifecycleAction {
    Complete {
        at: String,
        local_date: String,
        tracked_value: Option<f64>,
    },
    Skip {
        at: String,
        local_date: String,
    },
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskLifecyclePlan {
    pub task_raw: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observation: Option<TaskLifecycleObservation>,
}

#[derive(Clone, Debug, Serialize)]
pub struct TaskLifecycleObservation {
    #[serde(serialize_with = "serialize_input")]
    pub input: TaskOccurrenceMaterialization,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completion: Option<TaskOccurrenceCompletion>,
}

fn serialize_input<S: Serializer>(
    input: &TaskOccurrenceMaterialization,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    let mut value = serde_json::to_value(input).map_err(serde::ser::Error::custom)?;
    if input.tracking.is_none() {
        value.as_object_mut().unwrap().remove("tracking");
    }
    value.serialize(serializer)
}

/// Source-owned lifecycle intent only; application services own both guarded writes.
pub fn plan_task_lifecycle(
    raw: &str,
    path: &str,
    action: &TaskLifecycleAction,
    settings: &TaskDayPartSettings,
) -> Result<TaskLifecyclePlan, TaskTransformError> {
    let current = parse_task_document(raw, path)
        .ok_or_else(|| TaskTransformError::plain(format!("Not a task document: {path}")))?;
    let (mutation, today, tracked_value, complete) = match action {
        TaskLifecycleAction::Complete {
            at,
            local_date,
            tracked_value,
        } => (
            TaskMutation::Complete {
                at: at.clone(),
                local_date: Some(local_date.clone()),
            },
            local_date,
            *tracked_value,
            true,
        ),
        TaskLifecycleAction::Skip { at, local_date } => (
            TaskMutation::Skip {
                at: at.clone(),
                local_date: Some(local_date.clone()),
            },
            local_date,
            None,
            false,
        ),
    };
    let task_raw = apply_task_mutation(raw, path, &mutation)?;
    let task = current.task.as_ref().expect("mutation validated Task kind");
    let mut plan = TaskLifecyclePlan {
        task_raw,
        observation: None,
    };
    let Some(mut repeat) = task.get("repeat").cloned() else {
        return Ok(plan);
    };
    if complete && task.get("tracking").is_none() {
        return Ok(plan);
    }
    if complete && repeat["anchor"] == "completion" && repeat.get("start").is_none() {
        repeat["start"] = json!(today);
        repeat["missed"] = json!("carry");
    }
    let repeat: RepeatOptions = serde_json::from_value(repeat)
        .map_err(|_| TaskTransformError::plain("Invalid normalized Task recurrence."))?;
    let effective = resolve_effective_occurrence(&repeat, task["plan"]["date"].as_str(), today)?;
    let Some(date) = effective.date else {
        if complete {
            return Err(TaskTransformError::plain(
                "Recurring completion has no effective occurrence date.",
            ));
        }
        return Ok(plan);
    };
    let tracking: Option<TaskTracking> = task
        .get("tracking")
        .cloned()
        .map(serde_json::from_value)
        .transpose()
        .map_err(|_| TaskTransformError::plain("Invalid normalized Task tracking."))?;
    let task_plan: Option<TaskPlan> = task
        .get("plan")
        .cloned()
        .map(serde_json::from_value)
        .transpose()
        .map_err(|_| TaskTransformError::plain("Invalid normalized Task plan."))?;
    let completion = if complete {
        Some(tracking_completion(tracking.as_ref(), tracked_value)?)
    } else {
        None
    };
    plan.observation = Some(TaskLifecycleObservation {
        input: TaskOccurrenceMaterialization {
            task_id: current.id,
            task_path: current.path,
            title: current.title,
            occurrence_date: date,
            tracking,
            day_part: task_occurrence_day_part(task_plan.as_ref(), settings),
        },
        completion,
    });
    Ok(plan)
}
