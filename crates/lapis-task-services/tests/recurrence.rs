use lapis_task_services::{
    RecurrenceEngine, analyze_recurrence_rule, resolve_effective_occurrence,
};
use serde_json::{Value, json};

#[test]
fn matches_complete_retained_typescript_date_sets() {
    assert_date_sets(include_str!("fixtures/recurrence-inputs.json"));
}

#[test]
fn matches_separate_retained_ordinal_compatibility_cases() {
    assert_date_sets(include_str!(
        "fixtures/recurrence-compatibility-inputs.json"
    ));
}

fn assert_date_sets(corpus: &str) {
    let fixtures: Vec<Value> = serde_json::from_str(corpus).unwrap();
    for fixture in fixtures {
        let options = serde_json::from_value(fixture["options"].clone()).unwrap();
        assert_eq!(
            serde_json::to_value(analyze_recurrence_rule(
                fixture["options"]["rrule"].as_str().unwrap()
            ))
            .unwrap(),
            fixture["analysis"],
            "analysis: {}",
            fixture["name"]
        );
        let engine = match RecurrenceEngine::new(options) {
            Ok(engine) => {
                assert!(
                    fixture.get("constructorError").is_none(),
                    "{}",
                    fixture["name"]
                );
                engine
            }
            Err(error) => {
                assert_eq!(
                    serde_json::to_value(error).unwrap(),
                    fixture["constructorError"]
                );
                continue;
            }
        };
        assert_eq!(
            fixture["queries"].as_array().unwrap().len(),
            fixture["expected"].as_array().unwrap().len(),
            "complete query results: {}",
            fixture["name"]
        );
        for (query, expected) in fixture["queries"]
            .as_array()
            .unwrap()
            .iter()
            .zip(fixture["expected"].as_array().unwrap())
        {
            let inclusive = query["inclusive"].as_bool().unwrap();
            let value = match query["method"].as_str().unwrap() {
                "next" => engine
                    .next(query["after"].as_str().unwrap(), inclusive)
                    .map(|value| json!(value)),
                "previous" => engine
                    .previous(query["before"].as_str().unwrap(), inclusive)
                    .map(|value| json!(value)),
                "between" => engine
                    .between(
                        query["start"].as_str().unwrap(),
                        query["end"].as_str().unwrap(),
                        inclusive,
                    )
                    .map(|value| json!(value)),
                method => panic!("Unknown query: {method}"),
            };
            let serialized = match value {
                Ok(value) => json!({"value": value}),
                Err(error) => json!({"error": error}),
            };
            assert_eq!(&serialized, expected, "{}: {query}", fixture["name"]);
        }
    }
}

#[test]
fn matches_complete_retained_typescript_effective_occurrences() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/effective-inputs.json")).unwrap();
    for fixture in fixtures {
        let repeat = serde_json::from_value(fixture["repeat"].clone()).unwrap();
        let result = resolve_effective_occurrence(
            &repeat,
            fixture["planDate"].as_str(),
            fixture["today"].as_str().unwrap(),
        );
        match result {
            Ok(value) => assert_eq!(
                serde_json::to_value(value).unwrap(),
                fixture["expected"],
                "{}",
                fixture["name"]
            ),
            Err(error) => assert_eq!(
                serde_json::to_value(error).unwrap(),
                fixture["error"],
                "{}",
                fixture["name"]
            ),
        }
    }
}
