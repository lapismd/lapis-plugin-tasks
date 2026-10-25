use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct TaskTransformError {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parts: Option<Vec<String>>,
}

impl TaskTransformError {
    pub(super) fn plain(message: impl Into<String>) -> Self {
        Self {
            name: "Error".into(),
            message: message.into(),
            code: None,
            parts: None,
        }
    }
    pub(super) fn named(name: &str, code: &str, message: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            code: Some(code.into()),
            message: message.into(),
            parts: None,
        }
    }
    pub(super) fn checklist() -> Self {
        Self::named(
            "TaskChecklistMutationError",
            "stale-checklist-item",
            "The checklist changed before this item could be updated.",
        )
    }
    pub(super) fn recurrence(message: impl Into<String>) -> Self {
        Self::named(
            "TaskRecurrenceMutationError",
            "recurrence-advancement-blocked",
            message,
        )
    }
    pub(super) fn stale() -> Self {
        Self::named(
            "StaleTaskOccurrenceRangeError",
            "stale-task-occurrence-range",
            "The daily task observation changed before it could be updated.",
        )
    }
    pub(super) fn value(message: impl Into<String>) -> Self {
        Self::named(
            "InvalidTaskOccurrenceValueError",
            "invalid-task-occurrence-value",
            message,
        )
    }
}
impl From<crate::RecurrenceError> for TaskTransformError {
    fn from(value: crate::RecurrenceError) -> Self {
        Self {
            name: value.name,
            message: value.message,
            parts: value.parts,
            code: None,
        }
    }
}
impl std::fmt::Display for TaskTransformError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}
impl std::error::Error for TaskTransformError {}
