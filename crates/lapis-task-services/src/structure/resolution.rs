use super::{records::*, scanner::scan_task_structure, source};

/// Resolve against caller-supplied read-only target results. Callback errors
/// propagate; this function owns no App, file lookup, whole-vault graph or writes.
pub fn resolve_task_document_structure<E>(
    raw: &str,
    options: &TaskStructureOptions,
    mut resolve_target: impl FnMut(&str, &str) -> Result<Option<TaskStructureTarget>, E>,
) -> Result<ResolvedTaskDocumentStructure, E> {
    let scanned = scan_task_structure(raw, options);
    let mut resolved = Vec::new();
    let mut diagnostics = Vec::new();
    for candidate in scanned.candidates {
        let target = resolve_target(&candidate.source_document_path, &candidate.authored_href)?;
        let code = match &target {
            None => Some("unresolved-structural-link"),
            Some(target) if target.kind != "task" && target.kind != "task-list" => {
                Some("unsupported-structural-target")
            }
            _ => None,
        };
        if let Some(code) = code {
            let message = if code == "unresolved-structural-link" {
                format!(
                    "Could not resolve structural link {}.",
                    candidate.authored_href
                )
            } else {
                format!(
                    "{} does not target a task or task-list.",
                    candidate.authored_href
                )
            };
            diagnostics.push(TaskStructureDiagnostic {
                code: code.into(),
                message,
                source_start: candidate.source_start,
                source_end: candidate.source_end,
                target: candidate.authored_href,
            });
        } else {
            resolved.push((candidate, target.unwrap()));
        }
    }
    let mut runs: Vec<TaskRun> = Vec::new();
    let mut previous: Option<StructuralEntryCandidate> = None;
    for (candidate, target) in resolved {
        let prefix = format!("{}:{}:", options.document_id, candidate.list_start);
        let contiguous = runs
            .last()
            .zip(previous.as_ref())
            .is_some_and(|(run, previous)| {
                run.record.list_depth == candidate.list_depth
                    && run.record.heading_path.join("\0") == candidate.heading.path.join("\0")
                    && previous.source_end <= candidate.source_start
                    && candidate.position_in_list == previous.position_in_list + 1
                    && run.record.id.starts_with(&prefix)
            });
        if !contiguous {
            runs.push(TaskRun {
                record: IndexedTaskRun {
                    id: format!("{prefix}{}", candidate.position_in_list),
                    document_id: options.document_id.clone(),
                    document_path: options.document_path.clone(),
                    heading_path: candidate.heading.path.clone(),
                    heading_level: candidate.heading.level,
                    heading_text: candidate.heading.text.clone(),
                    list_depth: candidate.list_depth,
                    start_offset: candidate.source_start,
                    end_offset: candidate.source_end,
                    entry_count: 0,
                },
                entries: Vec::new(),
                source: String::new(),
            });
        }
        let run = runs.last_mut().unwrap();
        run.entries.push(StructuralEntry {
            source_document_id: options.document_id.clone(),
            source_document_path: options.document_path.clone(),
            target_document_id: target.id,
            target_document_path: target.path,
            kind: if target.kind == "task" {
                "task-entry"
            } else {
                "list-entry"
            }
            .into(),
            heading_path: candidate.heading.path.clone(),
            heading_level: candidate.heading.level,
            heading_text: candidate.heading.text.clone(),
            run_id: run.record.id.clone(),
            position_in_run: run.entries.len(),
            source_start: candidate.source_start,
            source_end: candidate.source_end,
            authored_label: candidate.authored_label.clone(),
            authored_href: candidate.authored_href.clone(),
        });
        run.record.end_offset = candidate.source_end;
        run.record.entry_count = run.entries.len();
        run.source = source::slice(raw, run.record.start_offset, run.record.end_offset);
        previous = Some(candidate);
    }
    Ok(ResolvedTaskDocumentStructure {
        version: 1,
        document_id: options.document_id.clone(),
        document_path: options.document_path.clone(),
        source_hash: source::stable_hash(raw),
        entries: runs.iter().flat_map(|run| run.entries.clone()).collect(),
        runs,
        diagnostics,
    })
}

pub fn task_structure_for_projection(
    structure: &ResolvedTaskDocumentStructure,
) -> TaskStructureProjection {
    TaskStructureProjection {
        version: structure.version,
        source_hash: structure.source_hash.clone(),
        entries: structure.entries.clone(),
        runs: structure
            .runs
            .iter()
            .map(|run| run.record.clone())
            .collect(),
        diagnostics: structure.diagnostics.clone(),
    }
}
