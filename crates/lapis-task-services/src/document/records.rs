use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TaskDocumentKind {
    Task,
    TaskList,
    TaskListNavigation,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TaskDiagnostic {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StructuralLink {
    pub title: String,
    pub href: String,
    pub kind: String,
    pub heading: Option<String>,
    pub ordinal: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_start: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_end: Option<usize>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistItem {
    pub text: String,
    pub checked: bool,
    pub position: usize,
    pub source_start: usize,
    pub source_end: usize,
    pub source: String,
}

/// Read-only document snapshot. Opaque metadata remains JSON data, never authority.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedTaskDocument {
    pub path: String,
    pub raw: String,
    pub id: String,
    pub kind: TaskDocumentKind,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub front_matter_title: Option<String>,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list: Option<Value>,
    pub body: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checklist: Option<Vec<ChecklistItem>>,
    pub structural_links: Vec<StructuralLink>,
    pub diagnostics: Vec<TaskDiagnostic>,
}

pub(super) fn diagnostic(code: &str, field: &str, message: &str) -> TaskDiagnostic {
    TaskDiagnostic {
        code: code.to_owned(),
        field: Some(field.to_owned()),
        message: message.to_owned(),
    }
}
