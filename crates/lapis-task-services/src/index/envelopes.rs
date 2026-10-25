use std::collections::BTreeMap;

use crate::{
    ParsedTaskDocument, RecurrenceError, ResolvedTaskDocumentStructure, project_task,
    task_structure_for_projection,
};

use super::{
    TASKS_PUBLIC_PROJECTION_ID, TaskIndexedFile, TaskIndexedFileRecord, TaskIndexedMetadata,
    TaskIndexedSummary, TaskIndexedTag, TaskProjectionSource, TaskPublicationData,
    TaskPublicationRow, links::indexed_links, task_edges,
};

fn summary(
    document: &ParsedTaskDocument,
    structure: Option<&ResolvedTaskDocumentStructure>,
    today: &str,
) -> Result<TaskIndexedSummary, RecurrenceError> {
    Ok(TaskIndexedSummary {
        summary: project_task(document, today)?,
        structure: structure.map(task_structure_for_projection),
    })
}

/// Derive the retained compatibility envelope, without reading or writing an index.
pub fn task_document_to_indexed_file(
    document: &ParsedTaskDocument,
    structure: Option<&ResolvedTaskDocumentStructure>,
    today: &str,
) -> Result<TaskIndexedFile, RecurrenceError> {
    Ok(TaskIndexedFile {
        file: TaskIndexedFileRecord {
            path: document.path.clone(),
            normalized_path: document.path.clone(),
            extension: "md".to_owned(),
            mtime: 1,
            size: document.raw.encode_utf16().count(),
            hash: document.id.clone(),
            indexed: true,
        },
        metadata: TaskIndexedMetadata {
            path: document.path.clone(),
            hash: document.id.clone(),
            parser_version: "tasks/v1".to_owned(),
            metadata: BTreeMap::new(),
        },
        links: indexed_links(document, structure),
        tags: document
            .tags
            .iter()
            .map(|tag| TaskIndexedTag {
                path: document.path.clone(),
                tag: tag.clone(),
                parts: tag.split('/').map(str::to_owned).collect(),
                hierarchy: vec![tag.clone()],
            })
            .collect(),
        properties: Vec::new(),
        task: summary(document, structure, today)?,
    })
}

/// Derive one complete publication request value. The host owns admission and effects.
pub fn task_projection_source(
    document: &ParsedTaskDocument,
    structure: Option<&ResolvedTaskDocumentStructure>,
    today: &str,
) -> Result<TaskProjectionSource, RecurrenceError> {
    Ok(TaskProjectionSource {
        projection_id: TASKS_PUBLIC_PROJECTION_ID.to_owned(),
        source_path: document.path.clone(),
        source_hash: document.id.clone(),
        writer_plugin_id: "tasks".to_owned(),
        rows: vec![TaskPublicationRow {
            id: document.id.clone(),
            kind: document.kind.clone(),
            data: TaskPublicationData {
                task: summary(document, structure, today)?,
                id: document.id.clone(),
            },
        }],
        edges: task_edges(document, structure),
    })
}
