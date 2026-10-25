use serde_json::json;

use crate::{ParsedTaskDocument, ResolvedTaskDocumentStructure, TaskDocumentKind};

use super::{TaskIndexEdge, TaskIndexedLink, resolve_task_href};

fn target_path(source: &str, href: &str) -> Option<String> {
    let path = resolve_task_href(source, href);
    (!path.is_empty()).then_some(path)
}

pub fn task_edges(
    document: &ParsedTaskDocument,
    structure: Option<&ResolvedTaskDocumentStructure>,
) -> Vec<TaskIndexEdge> {
    if document.kind == TaskDocumentKind::TaskListNavigation {
        return document
            .structural_links
            .iter()
            .map(|link| TaskIndexEdge {
                source_row_id: document.id.clone(),
                relation: "navigation-item".to_owned(),
                target_row_id: None,
                target_path: target_path(&document.path, &link.href),
                target_text: link.href.clone(),
                ordinal: link.ordinal,
                data: link
                    .heading
                    .as_ref()
                    .map(|heading| json!({"section": heading})),
            })
            .collect();
    }
    structure
        .into_iter()
        .flat_map(|structure| &structure.entries)
        .enumerate()
        .map(|(ordinal, entry)| TaskIndexEdge {
            source_row_id: document.id.clone(),
            relation: entry.kind.clone(),
            target_row_id: Some(entry.target_document_id.clone()),
            target_path: Some(entry.target_document_path.clone()),
            target_text: entry.authored_href.clone(),
            ordinal,
            data: Some(json!({
                "headingPath": entry.heading_path,
                "headingLevel": entry.heading_level,
                "headingText": entry.heading_text,
                "runId": entry.run_id,
                "positionInRun": entry.position_in_run,
                "sourceStart": entry.source_start,
                "sourceEnd": entry.source_end,
            })),
        })
        .collect()
}

pub(super) fn indexed_links(
    document: &ParsedTaskDocument,
    structure: Option<&ResolvedTaskDocumentStructure>,
) -> Vec<TaskIndexedLink> {
    if document.kind == TaskDocumentKind::TaskListNavigation {
        return document
            .structural_links
            .iter()
            .map(|link| TaskIndexedLink {
                source_path: document.path.clone(),
                target_text: link.href.clone(),
                resolved_target_path: target_path(&document.path, &link.href),
                link_type: "link".to_owned(),
                count: 1,
                heading: link.heading.clone(),
                kind: "navigation-item".to_owned(),
                ordinal: link.ordinal,
            })
            .collect();
    }
    structure
        .into_iter()
        .flat_map(|structure| &structure.entries)
        .enumerate()
        .map(|(ordinal, entry)| TaskIndexedLink {
            source_path: document.path.clone(),
            target_text: entry.authored_href.clone(),
            resolved_target_path: Some(entry.target_document_path.clone()),
            link_type: "link".to_owned(),
            count: 1,
            heading: entry.heading_text.clone(),
            kind: entry.kind.clone(),
            ordinal,
        })
        .collect()
}
