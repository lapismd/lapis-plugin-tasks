mod dates;
mod envelope;
mod fields;
mod markdown;
mod records;
mod repeat;
mod rule;
mod tracking;
mod value;

pub use records::{
    ChecklistItem, ParsedTaskDocument, StructuralLink, TaskDiagnostic, TaskDocumentKind,
};

/// Parse authored Markdown without resolving links, publishing projections or writing files.
pub fn parse_task_document(raw: &str, path: &str) -> Option<ParsedTaskDocument> {
    let (metadata, body) = envelope::split(raw);
    let kind = match envelope::string(metadata.get("type")?)?.as_str() {
        "task" => TaskDocumentKind::Task,
        "task-list" => TaskDocumentKind::TaskList,
        "task-list-navigation" => TaskDocumentKind::TaskListNavigation,
        _ => return None,
    };
    let id = metadata.get("id").and_then(envelope::string);
    let mut diagnostics = Vec::new();
    if id.is_none() {
        diagnostics.push(records::diagnostic(
            "missing-id",
            "id",
            "Task, task-list, and navigation files must have a stable id.",
        ));
    }
    let front_matter_title = metadata.get("title").and_then(envelope::string);
    let title = if kind == TaskDocumentKind::TaskList {
        front_matter_title
            .clone()
            .or_else(|| envelope::heading(body))
            .or_else(|| id.as_deref().and_then(envelope::id_title))
    } else {
        envelope::heading(body)
    }
    .unwrap_or_else(|| envelope::path_title(path));
    let get = |field| metadata.get(field).unwrap_or(&serde_json::Value::Null);
    let (structural_links, checklist) = if kind == TaskDocumentKind::TaskListNavigation {
        (markdown::navigation(body), None)
    } else {
        let (links, checklist) = markdown::structure(raw, body);
        (links, (kind == TaskDocumentKind::Task).then_some(checklist))
    };
    let task =
        (kind == TaskDocumentKind::Task).then(|| fields::task(get("task"), &mut diagnostics));
    let list = (kind == TaskDocumentKind::TaskList).then(|| fields::list(get("list")));
    Some(ParsedTaskDocument {
        path: path.to_owned(),
        raw: raw.to_owned(),
        id: id.unwrap_or_default(),
        front_matter_title: (kind == TaskDocumentKind::TaskList)
            .then_some(front_matter_title)
            .flatten(),
        kind,
        title,
        tags: envelope::strings(get("tags")),
        created: envelope::string(get("created")),
        updated: envelope::string(get("updated")),
        task,
        list,
        body: body.to_owned(),
        checklist,
        structural_links,
        diagnostics,
    })
}
