use lapis_task_services::{TASK_PROJECTION_VERSION, parse_task_document, project_task};
use serde_json::{Value, json};

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
fn matches_complete_retained_typescript_version_four_rows() {
    assert_eq!(TASK_PROJECTION_VERSION, 4);
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/projection-inputs.json")).unwrap();
    for fixture in fixtures {
        let parsed = parse_task_document(
            fixture["raw"].as_str().unwrap(),
            fixture["path"].as_str().unwrap(),
        );
        let result = match parsed {
            None => json!({"value": null}),
            Some(document) => match project_task(&document, fixture["today"].as_str().unwrap()) {
                Ok(row) => json!({"value": row}),
                Err(error) => json!({"error": error}),
            },
        };
        assert_eq!(
            javascript_numbers(result),
            javascript_numbers(fixture["expected"].clone()),
            "{}",
            fixture["name"]
        );
    }
}
