mod components;

use std::collections::{HashMap, HashSet};

use super::{ResolvedTaskDocumentStructure, StructuralEntry, TaskStructureDiagnostic};

#[derive(Clone, Copy)]
enum InvalidEntry {
    MultipleParents,
    Cycle,
}

fn entry_key(entry: &StructuralEntry) -> String {
    format!(
        "{}:{}:{}",
        entry.source_document_path, entry.source_start, entry.source_end
    )
}

fn node_index(id: &str, nodes: &mut HashMap<String, usize>, edges: &mut Vec<Vec<usize>>) -> usize {
    *nodes.entry(id.to_owned()).or_insert_with(|| {
        edges.push(Vec::new());
        edges.len() - 1
    })
}

fn filtered_structure(
    structure: &ResolvedTaskDocumentStructure,
    invalid: &HashMap<String, InvalidEntry>,
) -> ResolvedTaskDocumentStructure {
    let mut result = structure.clone();
    let diagnostics = &mut result.diagnostics;
    result.runs.retain_mut(|run| {
        run.entries.retain(|entry| {
            let Some(reason) = invalid.get(&entry_key(entry)) else {
                return true;
            };
            let (code, message) = match reason {
                InvalidEntry::Cycle => ("structural-cycle", "participates in a structural cycle."),
                InvalidEntry::MultipleParents => (
                    "multiple-structural-parents",
                    "has more than one structural parent.",
                ),
            };
            diagnostics.push(TaskStructureDiagnostic {
                code: code.to_owned(),
                message: format!("{} {message}", entry.authored_href),
                source_start: entry.source_start,
                source_end: entry.source_end,
                target: entry.authored_href.clone(),
            });
            false
        });
        run.record.entry_count = run.entries.len();
        !run.entries.is_empty()
    });
    result.entries = result
        .runs
        .iter()
        .flat_map(|run| run.entries.clone())
        .collect();
    result
}

/// Validate a complete, already-resolved snapshot without changing its source records.
///
/// The ordered pairs retain JavaScript Map semantics: a repeated document path
/// replaces its earlier value while keeping that path's first insertion position.
pub fn validate_task_structure_graph(
    structures: &[ResolvedTaskDocumentStructure],
) -> Vec<(String, ResolvedTaskDocumentStructure)> {
    let entries: Vec<_> = structures
        .iter()
        .flat_map(|structure| &structure.entries)
        .collect();
    let mut parents: HashMap<&str, HashSet<&str>> = HashMap::new();
    for entry in &entries {
        parents
            .entry(&entry.target_document_id)
            .or_default()
            .insert(&entry.source_document_id);
    }
    let mut invalid = HashMap::new();
    for entry in &entries {
        if parents[entry.target_document_id.as_str()].len() > 1 {
            invalid.insert(entry_key(entry), InvalidEntry::MultipleParents);
        }
    }

    let mut nodes = HashMap::new();
    let mut edges = Vec::new();
    for entry in &entries {
        if invalid.contains_key(&entry_key(entry)) {
            continue;
        }
        let source = node_index(&entry.source_document_id, &mut nodes, &mut edges);
        let target = node_index(&entry.target_document_id, &mut nodes, &mut edges);
        edges[source].push(target);
    }
    let groups = components::cyclic_groups(&edges);
    for entry in entries {
        let source = nodes
            .get(&entry.source_document_id)
            .and_then(|&node| groups[node]);
        let target = nodes
            .get(&entry.target_document_id)
            .and_then(|&node| groups[node]);
        if source.is_some() && source == target {
            invalid.insert(entry_key(entry), InvalidEntry::Cycle);
        }
    }

    let mut result: Vec<(String, ResolvedTaskDocumentStructure)> = Vec::new();
    let mut positions: HashMap<&str, usize> = HashMap::new();
    for structure in structures {
        let validated = filtered_structure(structure, &invalid);
        if let Some(&index) = positions.get(structure.document_path.as_str()) {
            result[index].1 = validated;
        } else {
            positions.insert(&structure.document_path, result.len());
            result.push((structure.document_path.clone(), validated));
        }
    }
    result
}
