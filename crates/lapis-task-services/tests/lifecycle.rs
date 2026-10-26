use lapis_task_services::{TaskDayPartSettings, TaskLifecycleAction, plan_task_lifecycle};
use serde_json::{Value, json};

// Match the existing corpus' JavaScript Number comparison boundary.
fn numbers(value: &mut Value) {
    match value {
        Value::Number(number) => {
            *number = serde_json::Number::from_f64(number.as_f64().unwrap()).unwrap();
        }
        Value::Array(values) => values.iter_mut().for_each(numbers),
        Value::Object(values) => values.values_mut().for_each(numbers),
        _ => {}
    }
}

#[test]
fn native_lifecycle_plans_match_complete_retained_repository_traces() {
    let fixture: Value = serde_json::from_str(include_str!("fixtures/lifecycle.json")).unwrap();
    let cases = fixture["cases"].as_array().unwrap();
    assert!(cases.len() > 90);
    let mut attempts = 0;
    let mut differences = Vec::new();
    for case in cases {
        let path = case["path"].as_str().unwrap();
        let settings: TaskDayPartSettings =
            serde_json::from_value(case["settings"].clone()).unwrap();
        let mut raw = case["raw"].as_str().unwrap();
        for (action, expected) in case["actions"]
            .as_array()
            .unwrap()
            .iter()
            .zip(case["expected"]["attempts"].as_array().unwrap())
        {
            let action: TaskLifecycleAction = serde_json::from_value(action.clone()).unwrap();
            let mut actual = match plan_task_lifecycle(raw, path, &action, &settings) {
                Ok(plan) => json!({ "value": plan }),
                Err(error) => json!({ "error": error }),
            };
            let mut retained = expected["planner"].clone();
            numbers(&mut actual);
            numbers(&mut retained);
            if actual != retained {
                differences.push(json!({"name":case["name"], "attempt": attempts,
                    "actual": actual, "expected": retained}));
            }
            raw = expected["taskRaw"].as_str().unwrap();
            attempts += 1;
        }
    }
    assert!(attempts > cases.len());
    assert!(
        differences.is_empty(),
        "{} complete planner differences: {}",
        differences.len(),
        serde_json::to_string_pretty(&differences).unwrap()
    );
}
