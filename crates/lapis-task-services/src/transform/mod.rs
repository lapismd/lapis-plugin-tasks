mod action;
mod completion;
#[cfg(test)]
mod completion_conformance;
#[cfg(test)]
mod conformance;
mod coordination;
mod daily;
mod error;
mod lifecycle;
mod observations;
mod records;
mod serializer;
mod yaml;

pub use completion::{complete_task_occurrence, tracking_completion};
pub use coordination::{
    TaskLifecycleAction, TaskLifecycleObservation, TaskLifecyclePlan, plan_task_lifecycle,
};
pub use daily::{materialize_task_occurrence, task_occurrence_day_part};
pub use error::TaskTransformError;
pub use observations::scan_task_occurrence_observations;
pub use records::*;

/// Return replacement Markdown only. Admission and conditional persistence belong to the host.
pub fn apply_task_mutation(
    raw: &str,
    path: &str,
    mutation: &TaskMutation,
) -> Result<String, TaskTransformError> {
    let parsed = crate::parse_task_document(raw, path)
        .ok_or_else(|| TaskTransformError::plain(format!("Not a task document: {path}")))?;
    let document = action::mutate(parsed, mutation)?;
    serializer::serialize(&document, mutation)
}
