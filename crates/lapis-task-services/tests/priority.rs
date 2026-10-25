use lapis_task_services::parse_task_document;
use serde_json::{Value, json};

#[test]
fn complete_nonfinite_priority_presence_matches_retained_typescript() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/nonfinite-priorities.json")).unwrap();
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
            std::path::Path::new(&directory).join("nonfinite-priority-diff.json"),
            serde_json::to_string_pretty(&differences).unwrap(),
        )
        .unwrap();
    }
    assert!(
        differences.is_empty(),
        "{} complete priority snapshots differ",
        differences.len()
    );
}
