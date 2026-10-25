use std::collections::HashMap;

use crate::{ParsedTaskDocument, TaskDocumentKind, TaskStructureTarget, marker::trim};

/// Retained Tasks href policy. This does not perform URL decoding or vault admission.
pub fn resolve_task_href(source_path: &str, href: &str) -> String {
    let trimmed = trim(href);
    let scheme = trimmed.split_once(':').is_some_and(|(prefix, _)| {
        !prefix.is_empty() && prefix.bytes().all(|byte| byte.is_ascii_alphabetic())
    });
    if trimmed.is_empty() || trimmed.starts_with('#') || scheme {
        return trimmed.to_owned();
    }
    let target = trimmed.split('#').next().unwrap();
    if target.starts_with('/') {
        return target.trim_start_matches('/').to_owned();
    }
    let mut parts: Vec<_> = source_path.split('/').collect();
    parts.pop();
    for segment in target.split('/') {
        match segment {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            _ => parts.push(segment),
        }
    }
    parts.join("/")
}

/// Read-only snapshot policy; navigation documents never replace an eligible target.
pub struct TaskStructureSnapshotResolver {
    by_path: HashMap<String, TaskStructureTarget>,
}

impl TaskStructureSnapshotResolver {
    pub fn new(documents: &[ParsedTaskDocument]) -> Self {
        let by_path = documents
            .iter()
            .filter_map(|document| {
                let kind = match document.kind {
                    TaskDocumentKind::Task => "task",
                    TaskDocumentKind::TaskList => "task-list",
                    TaskDocumentKind::TaskListNavigation => return None,
                };
                Some((
                    document.path.clone(),
                    TaskStructureTarget {
                        id: document.id.clone(),
                        path: document.path.clone(),
                        kind: kind.to_owned(),
                        title: document.title.clone(),
                    },
                ))
            })
            .collect();
        Self { by_path }
    }

    pub fn resolve(&self, source_path: &str, href: &str) -> Option<TaskStructureTarget> {
        self.by_path
            .get(&resolve_task_href(source_path, href))
            .cloned()
    }
}
