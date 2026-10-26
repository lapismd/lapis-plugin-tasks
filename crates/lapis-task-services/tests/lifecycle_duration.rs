use lapis_task_services::{TaskDayPartSettings, TaskLifecycleAction, plan_task_lifecycle};
use serde_json::{Value, json};

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
fn valid_duration_plans_preserve_complete_retained_repository_outcomes() {
    let fixture: Value =
        serde_json::from_str(include_str!("fixtures/lifecycle-duration.json")).unwrap();
    let cases = fixture["cases"].as_array().unwrap();
    assert_eq!(cases.len(), 18);
    let mut outcomes = [0, 0];
    let mut differences = Vec::new();
    for case in cases {
        let settings: TaskDayPartSettings =
            serde_json::from_value(case["settings"].clone()).unwrap();
        let path = case["path"].as_str().unwrap();
        let mut raw = case["raw"].as_str().unwrap();
        for (action, expected) in case["actions"]
            .as_array()
            .unwrap()
            .iter()
            .zip(case["expected"]["attempts"].as_array().unwrap())
        {
            let action: TaskLifecycleAction = serde_json::from_value(action.clone()).unwrap();
            let mut actual = match plan_task_lifecycle(raw, path, &action, &settings) {
                Ok(plan) => {
                    outcomes[0] += 1;
                    json!({"value": plan})
                }
                Err(error) => {
                    outcomes[1] += 1;
                    json!({"error": error})
                }
            };
            let mut retained = expected["planner"].clone();
            numbers(&mut actual);
            numbers(&mut retained);
            if actual != retained {
                differences.push(json!({"name":case["name"],"actual":actual,"expected":retained}));
            }
            raw = expected["taskRaw"].as_str().unwrap();
        }
    }
    assert_eq!(outcomes.iter().sum::<usize>(), 18);
    assert!(outcomes[0] > 0 && outcomes[1] > 0);
    assert!(
        differences.is_empty(),
        "{} complete duration plan differences: {}",
        differences.len(),
        serde_json::to_string_pretty(&differences).unwrap()
    );
}
