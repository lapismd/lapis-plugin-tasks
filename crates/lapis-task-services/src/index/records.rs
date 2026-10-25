use std::collections::BTreeMap;

use serde::Serialize;
use serde_json::Value;

use crate::{TaskDocumentKind, TaskProjectionRecord, TaskStructureProjection};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskIndexEdge {
    pub source_row_id: String,
    pub relation: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_row_id: Option<String>,
    pub target_path: Option<String>,
    pub target_text: String,
    pub ordinal: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskIndexedLink {
    pub source_path: String,
    pub target_text: String,
    pub resolved_target_path: Option<String>,
    #[serde(rename = "type")]
    pub link_type: String,
    pub count: usize,
    pub heading: Option<String>,
    pub kind: String,
    pub ordinal: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskIndexedFileRecord {
    pub path: String,
    pub normalized_path: String,
    pub extension: String,
    pub mtime: u64,
    pub size: usize,
    pub hash: String,
    pub indexed: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskIndexedMetadata {
    pub path: String,
    pub hash: String,
    pub parser_version: String,
    pub metadata: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TaskIndexedTag {
    pub path: String,
    pub tag: String,
    pub parts: Vec<String>,
    pub hierarchy: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TaskIndexedSummary {
    #[serde(flatten)]
    pub summary: TaskProjectionRecord,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub structure: Option<TaskStructureProjection>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TaskIndexedFile {
    pub file: TaskIndexedFileRecord,
    pub metadata: TaskIndexedMetadata,
    pub links: Vec<TaskIndexedLink>,
    pub tags: Vec<TaskIndexedTag>,
    pub properties: Vec<Value>,
    pub task: TaskIndexedSummary,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TaskPublicationData {
    #[serde(flatten)]
    pub task: TaskIndexedSummary,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TaskPublicationRow {
    pub id: String,
    pub kind: TaskDocumentKind,
    pub data: TaskPublicationData,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TaskProjectionSource {
    pub projection_id: String,
    pub source_path: String,
    pub source_hash: String,
    pub writer_plugin_id: String,
    pub rows: Vec<TaskPublicationRow>,
    pub edges: Vec<TaskIndexEdge>,
}
