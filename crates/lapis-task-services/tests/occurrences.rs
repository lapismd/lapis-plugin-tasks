use lapis_task_services::{is_canonical_daily_document, task_occurrence_projection_rows};
use serde_json::Value;

// TypeScript has one numeric domain; JSON 7 and 7.0 are the same contract value.
// Preserve every key, array position and nonnumeric value during comparison.
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
fn matches_retained_typescript_occurrence_fixtures() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/occurrences.json")).unwrap();
    for fixture in fixtures {
        let raw = fixture["raw"].as_str().unwrap();
        assert_eq!(
            is_canonical_daily_document(raw, None),
            fixture["canonical"].as_bool().unwrap(),
            "{} canonical daily document",
            fixture["name"]
        );
        let rows = task_occurrence_projection_rows(raw, fixture["path"].as_str().unwrap());
        assert_eq!(
            javascript_numbers(serde_json::to_value(rows).unwrap()),
            javascript_numbers(fixture["expected"].clone()),
            "{}",
            fixture["name"]
        );
    }
}

#[test]
fn optional_daily_date_matches_the_retained_predicate() {
    let raw = "---\ntype: daily-note\ndate: 2026-08-20\n---\n";
    assert!(is_canonical_daily_document(raw, Some("2026-08-20")));
    assert!(is_canonical_daily_document(raw, Some("")));
    assert!(!is_canonical_daily_document(raw, Some("2026-08-21")));
}
