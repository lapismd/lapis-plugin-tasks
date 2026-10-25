use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskOccurrenceRecord {
    pub observation_id: String,
    pub task_id: String,
    pub task_path: String,
    pub daily_document_path: String,
    pub occurrence_date: String,
    pub outcome: TaskOutcome,
    pub tracking_kind: TaskTrackingKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_minutes: Option<f64>,
    /// JavaScript-compatible UTF-16 offsets into the unmodified source.
    pub source_start: usize,
    pub source_end: usize,
    pub projection_version: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskOutcome {
    Completed,
    Pending,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskTrackingKind {
    Boolean,
    Count,
    Duration,
    Number,
}

impl TaskTrackingKind {
    pub(crate) fn parse(value: &str) -> Option<Self> {
        match value {
            "boolean" => Some(Self::Boolean),
            "count" => Some(Self::Count),
            "duration" => Some(Self::Duration),
            "number" => Some(Self::Number),
            _ => None,
        }
    }
}
