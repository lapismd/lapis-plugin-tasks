use lapis_task_services::parse_task_document;
use serde_json::{Value, json};

#[test]
fn preserves_retained_core_scalar_and_mapping_semantics() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/yaml-scalars.json")).unwrap();
    let mut differences = Vec::new();
    for fixture in fixtures {
        let actual = serde_json::to_value(parse_task_document(
            fixture["raw"].as_str().unwrap(),
            fixture["path"].as_str().unwrap(),
        ))
        .unwrap();
        if actual != fixture["expected"] {
            differences.push(
                json!({"name":fixture["name"],"actual":actual,"expected":fixture["expected"]}),
            );
        }
    }
    if let Ok(directory) = std::env::var("TASK_TRANSFORM_DIFFERENCES") {
        std::fs::write(
            std::path::Path::new(&directory).join("yaml-scalar-diff.json"),
            serde_json::to_string_pretty(&differences).unwrap(),
        )
        .unwrap();
    }
    assert!(
        differences.is_empty(),
        "{} retained core scalar outcomes differ: {:?}",
        differences.len(),
        differences
            .iter()
            .map(|value| value["name"].clone())
            .collect::<Vec<_>>()
    );
}
