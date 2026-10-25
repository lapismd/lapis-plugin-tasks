use lapis_task_services::parse_task_document;
use serde_json::Value;

fn javascript_numbers(mut value: Value) -> Value {
    match &mut value {
        Value::Number(number) => {
            *number = serde_json::Number::from_f64(number.as_f64().unwrap()).unwrap();
        }
        Value::Array(values) => {
            for value in values {
                *value = javascript_numbers(value.take());
            }
        }
        Value::Object(values) => {
            for value in values.values_mut() {
                *value = javascript_numbers(value.take());
            }
        }
        _ => {}
    }
    value
}

#[test]
fn matches_complete_retained_typescript_document_fixtures() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/documents.json")).unwrap();
    for fixture in fixtures {
        let parsed = parse_task_document(
            fixture["raw"].as_str().unwrap(),
            fixture["path"].as_str().unwrap(),
        );
        assert_eq!(
            javascript_numbers(serde_json::to_value(parsed).unwrap()),
            javascript_numbers(fixture["expected"].clone()),
            "{}",
            fixture["name"]
        );
    }
}

#[test]
fn retains_yaml_12_unicode_scalar_values() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/unicode-documents.json")).unwrap();
    let mut differences = Vec::new();
    for fixture in fixtures {
        let actual = javascript_numbers(
            serde_json::to_value(parse_task_document(
                fixture["raw"].as_str().unwrap(),
                fixture["path"].as_str().unwrap(),
            ))
            .unwrap(),
        );
        let expected = javascript_numbers(fixture["expected"].clone());
        if actual != expected {
            differences.push(
                serde_json::json!({"name":fixture["name"],"actual":actual,"expected":expected}),
            );
        }
    }
    if let Ok(directory) = std::env::var("TASK_TRANSFORM_DIFFERENCES") {
        std::fs::write(
            std::path::Path::new(&directory).join("unicode-document-diff.json"),
            serde_json::to_string_pretty(&differences).unwrap(),
        )
        .unwrap();
    }
    assert!(
        differences.is_empty(),
        "{} complete Unicode/JSON/YAML document outcomes differ: {:?}",
        differences.len(),
        differences
            .iter()
            .map(|d| d["name"].clone())
            .collect::<Vec<_>>()
    );
}
