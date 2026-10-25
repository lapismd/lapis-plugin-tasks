use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct RecurrenceOptions {
    pub start: String,
    pub rrule: String,
    #[serde(default)]
    pub rdate: Vec<String>,
    #[serde(default)]
    pub exdate: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum RecurrenceAnalysis {
    Supported,
    Unsupported { parts: Vec<String> },
    Invalid { message: String },
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct RecurrenceError {
    pub name: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parts: Option<Vec<String>>,
}

impl RecurrenceError {
    pub(super) fn invalid(message: impl Into<String>) -> Self {
        Self {
            name: "Error".into(),
            message: message.into(),
            parts: None,
        }
    }

    pub(super) fn unsupported(parts: Vec<String>) -> Self {
        Self {
            name: "UnsupportedRecurrenceRuleError".into(),
            message: format!("Unsupported recurrence properties: {}", parts.join(", ")),
            parts: Some(parts),
        }
    }
}

impl std::fmt::Display for RecurrenceError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for RecurrenceError {}

#[derive(Debug, Clone, Deserialize)]
pub struct PauseRange {
    pub start: String,
    pub end: String,
}

/// Normalized metadata from the read-only document parser. Unused lifecycle
/// fields are not execution authority; the resolver never performs writes.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepeatOptions {
    pub rrule: String,
    pub start: Option<String>,
    #[serde(default = "carry")]
    pub missed: String,
    #[serde(default)]
    pub rdate: Vec<String>,
    #[serde(default)]
    pub exdate: Vec<String>,
    #[serde(default)]
    pub paused: bool,
    #[serde(default)]
    pub pause_ranges: Vec<PauseRange>,
    #[serde(default)]
    pub completion_count: f64,
}

fn carry() -> String {
    "carry".into()
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct EffectiveOccurrence {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
    pub state: String,
    pub effective_for_date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warning: Option<String>,
}
