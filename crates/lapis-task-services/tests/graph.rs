use lapis_task_services::{
    ResolvedTaskDocumentStructure, TaskStructureOptions, TaskStructureTarget,
    resolve_task_document_structure, validate_task_structure_graph,
};
use serde_json::Value;

#[test]
fn matches_complete_retained_typescript_whole_vault_graphs() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/graph-inputs.json")).unwrap();
    for fixture in fixtures {
        let resolved: Vec<ResolvedTaskDocumentStructure> =
            serde_json::from_value(fixture["resolved"].clone()).unwrap();
        let snapshot = serde_json::to_value(&resolved).unwrap();
        let actual = validate_task_structure_graph(&resolved);
        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            fixture["expected"],
            "{}",
            fixture["name"]
        );
        assert_eq!(serde_json::to_value(resolved).unwrap(), snapshot);
    }
}

#[test]
fn integrates_native_resolution_with_the_complete_graph_snapshot() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/graph-inputs.json")).unwrap();
    for fixture in fixtures {
        let resolved: Vec<_> = fixture["documents"]
            .as_array()
            .unwrap()
            .iter()
            .map(|document| {
                let options: TaskStructureOptions =
                    serde_json::from_value(document["options"].clone()).unwrap();
                resolve_task_document_structure(
                    document["raw"].as_str().unwrap(),
                    &options,
                    |_: &str, href: &str| -> Result<Option<TaskStructureTarget>, ()> {
                        Ok(document["targets"]
                            .get(href)
                            .map(|target| serde_json::from_value(target.clone()).unwrap()))
                    },
                )
                .unwrap()
            })
            .collect();
        assert_eq!(
            serde_json::to_value(&resolved).unwrap(),
            fixture["resolved"],
            "{}",
            fixture["name"]
        );
        assert_eq!(
            serde_json::to_value(validate_task_structure_graph(&resolved)).unwrap(),
            fixture["expected"],
            "{}",
            fixture["name"]
        );
    }
}
