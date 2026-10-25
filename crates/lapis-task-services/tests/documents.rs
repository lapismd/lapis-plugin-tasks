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
