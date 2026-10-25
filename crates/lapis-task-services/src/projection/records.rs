use serde::Serialize;
use serde_json::Value;

use crate::TaskDocumentKind;

/// Serializable read-only version-4 summary. Absent Task-only fields are omitted
/// for List/navigation rows; each nullable Task field is retained for Task rows.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskProjectionRecord {
    pub(super) document_path: String,
    pub(super) document_id: String,
    pub(super) kind: TaskDocumentKind,
    pub(super) title: String,
    pub(super) status: String,
    pub(super) inbox: bool,
    pub(super) start_kind: String,
    pub(super) checklist_total: usize,
    pub(super) checklist_completed: usize,
    pub(super) comment_count: usize,
    pub(super) projection_version: u32,
    #[serde(flatten)]
    pub(super) task: Option<TaskFields>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(super) struct TaskFields {
    pub(super) priority: Value,
    pub(super) start_date: Option<String>,
    pub(super) plan_date: Option<String>,
    pub(super) plan_kind: Option<String>,
    pub(super) plan_time: Option<String>,
    pub(super) duration_minutes: Option<f64>,
    pub(super) deadline: Option<String>,
    pub(super) completed_at: Option<String>,
    pub(super) repeat: Value,
    pub(super) tracking: Value,
    pub(super) effective_occurrence_date: Option<String>,
    pub(super) effective_occurrence_state: Option<String>,
    pub(super) effective_for_date: Option<String>,
}
