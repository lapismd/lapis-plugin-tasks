use serde::{Deserialize, Serialize};

use crate::TaskDocumentKind;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskStructureOptions {
    pub document_id: String,
    pub document_path: String,
    pub document_kind: TaskDocumentKind,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HeadingContext {
    pub path: Vec<String>,
    pub level: Option<u8>,
    pub text: Option<String>,
    pub source_start: Option<usize>,
    pub source_end: Option<usize>,
}

impl HeadingContext {
    pub(super) fn empty() -> Self {
        Self {
            path: Vec::new(),
            level: None,
            text: None,
            source_start: None,
            source_end: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StructuralEntryCandidate {
    pub source_document_id: String,
    pub source_document_path: String,
    pub authored_label: String,
    pub authored_href: String,
    pub heading: HeadingContext,
    pub list_depth: usize,
    pub list_start: usize,
    pub position_in_list: usize,
    pub source_start: usize,
    pub source_end: usize,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ScannedChecklistItem {
    pub text: String,
    pub checked: bool,
    pub heading: HeadingContext,
    pub position: usize,
    pub source_start: usize,
    pub source_end: usize,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct ScannedTaskStructure {
    pub candidates: Vec<StructuralEntryCandidate>,
    pub checklist: Vec<ScannedChecklistItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TaskStructureTarget {
    pub id: String,
    pub path: String,
    pub kind: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TaskStructureDiagnostic {
    pub code: String,
    pub message: String,
    pub source_start: usize,
    pub source_end: usize,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StructuralEntry {
    pub source_document_id: String,
    pub source_document_path: String,
    pub target_document_id: String,
    pub target_document_path: String,
    pub kind: String,
    pub heading_path: Vec<String>,
    pub heading_level: Option<u8>,
    pub heading_text: Option<String>,
    pub run_id: String,
    pub position_in_run: usize,
    pub source_start: usize,
    pub source_end: usize,
    pub authored_label: String,
    pub authored_href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct IndexedTaskRun {
    pub id: String,
    pub document_id: String,
    pub document_path: String,
    pub heading_path: Vec<String>,
    pub heading_level: Option<u8>,
    pub heading_text: Option<String>,
    pub list_depth: usize,
    pub start_offset: usize,
    pub end_offset: usize,
    pub entry_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TaskRun {
    #[serde(flatten)]
    pub record: IndexedTaskRun,
    pub entries: Vec<StructuralEntry>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedTaskDocumentStructure {
    pub version: u8,
    pub document_id: String,
    pub document_path: String,
    pub source_hash: String,
    pub entries: Vec<StructuralEntry>,
    pub runs: Vec<TaskRun>,
    pub diagnostics: Vec<TaskStructureDiagnostic>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TaskStructureProjection {
    pub version: u8,
    pub source_hash: String,
    pub entries: Vec<StructuralEntry>,
    pub runs: Vec<IndexedTaskRun>,
    pub diagnostics: Vec<TaskStructureDiagnostic>,
}
