use super::*;
use serde_json::{Value, json};

pub(super) fn corpus() -> Value {
    let mut corpus: Value =
        serde_json::from_str(include_str!("../../tests/fixtures/transformations.json")).unwrap();
    corpus["yamlMutations"] = serde_json::from_str::<Value>(include_str!(
        "../../tests/fixtures/transformations-yaml.json"
    ))
    .unwrap()["mutations"]
        .clone();
    corpus["nonfiniteMutations"] = serde_json::from_str::<Value>(include_str!(
        "../../tests/fixtures/transformations-nonfinite.json"
    ))
    .unwrap()["mutations"]
        .clone();
    let adapter: Vec<Value> = serde_json::from_str(include_str!(
        "../../tests/fixtures/transformations-native-adapter.json"
    ))
    .unwrap();
    for adapted in adapter {
        let retained = corpus["mutations"]
            .as_array_mut()
            .unwrap()
            .iter_mut()
            .find(|case| case["name"] == adapted["name"])
            .unwrap();
        assert_eq!(
            retained["expected"], adapted["retainedExpected"],
            "adapter must preserve the complete original output"
        );
        retained["expected"] = adapted["expected"].clone();
    }
    corpus
}
pub(super) fn numeric(value: &Value) -> Option<f64> {
    value.as_f64().or_else(|| match value["special"].as_str()? {
        "NaN" => Some(f64::NAN),
        "Infinity" => Some(f64::INFINITY),
        "-Infinity" => Some(f64::NEG_INFINITY),
        _ => None,
    })
}
fn numbers(value: &mut Value) {
    match value {
        Value::Number(number) => {
            *number = serde_json::Number::from_f64(number.as_f64().unwrap()).unwrap()
        }
        Value::Array(values) => {
            for value in values {
                numbers(value)
            }
        }
        Value::Object(values) => {
            for value in values.values_mut() {
                numbers(value)
            }
        }
        _ => {}
    }
}
pub(super) fn compare(family: &str, run: impl Fn(&Value) -> Result<Value, TaskTransformError>) {
    let mut differences = Vec::new();
    for case in corpus()[family].as_array().unwrap() {
        let before = case.clone();
        let mut actual = match run(case) {
            Ok(value) => json!({"value":value}),
            Err(error) => json!({"error":error}),
        };
        let mut expected = case["expected"].clone();
        numbers(&mut actual);
        numbers(&mut expected);
        if actual != expected {
            differences.push(json!({"name":case["name"],"actual":actual,"expected":expected}));
        }
        assert_eq!(case, &before, "source input mutated");
    }
    if let Ok(directory) = std::env::var("TASK_TRANSFORM_DIFFERENCES") {
        std::fs::write(
            std::path::Path::new(&directory).join(format!("{family}-diff.json")),
            serde_json::to_string_pretty(&differences).unwrap(),
        )
        .unwrap();
    }
    assert!(
        differences.is_empty(),
        "{} / {} {family} cases failed; first: {}",
        differences.len(),
        corpus()[family].as_array().unwrap().len(),
        differences
            .first()
            .map_or(Value::Null, |value| value["name"].clone())
    );
}
fn action(value: &Value) -> TaskMutation {
    if value["type"] == "checklist" {
        TaskMutation::Checklist {
            position: numeric(&value["position"]).unwrap(),
            expected_text: value["expectedText"].as_str().unwrap().into(),
            checked: value["checked"].as_bool().unwrap(),
        }
    } else {
        serde_json::from_value(value.clone()).unwrap()
    }
}
#[test]
fn complete_mutation_text_snapshots_and_reparse_match_retained_typescript() {
    compare("mutations", mutation);
}
#[test]
fn metadata_serialization_matches_retained_typescript() {
    compare("yamlMutations", mutation);
}
#[test]
fn nonfinite_metadata_serialization_matches_retained_typescript() {
    compare("nonfiniteMutations", mutation);
}
fn mutation(case: &Value) -> Result<Value, TaskTransformError> {
    let mut raw = case["raw"].as_str().unwrap().to_owned();
    let path = case["path"].as_str().unwrap();
    let mut steps = Vec::new();
    for value in case["actions"].as_array().unwrap() {
        let action = action(value);
        let parsed = crate::parse_task_document(&raw, path)
            .ok_or_else(|| TaskTransformError::plain(format!("Not a task document: {path}")))?;
        let document = super::action::mutate(parsed, &action)?;
        let replacement = super::serializer::serialize(&document, &action)?;
        assert_eq!(replacement, apply_task_mutation(&raw, path, &action)?);
        raw = replacement;
        steps.push(
            json!({"document":document,"raw":raw,"reparsed":crate::parse_task_document(&raw,path)}),
        );
    }
    Ok(json!({"raw":raw,"steps":steps}))
}
#[test]
fn complete_materialization_text_and_observations_match_retained_typescript() {
    compare("materializations", |case| {
        let path = case["path"].as_str().unwrap();
        let input = serde_json::from_value(case["input"].clone()).unwrap();
        let raw = materialize_task_occurrence(case["raw"].as_str().unwrap(), path, &input)?;
        let repeated = materialize_task_occurrence(&raw, path, &input)?;
        Ok(
            json!({"raw":raw,"observations":scan_task_occurrence_observations(&raw,path),"repeated":repeated,"repeatedObservations":scan_task_occurrence_observations(&repeated,path)}),
        )
    });
}
#[test]
fn complete_tracking_values_and_errors_match_retained_typescript() {
    compare("tracking", |case| {
        let tracking = case
            .get("tracking")
            .map(|value| serde_json::from_value(value.clone()).unwrap());
        Ok(serde_json::to_value(tracking_completion(
            tracking.as_ref(),
            numeric(&case["value"]),
        )?)
        .unwrap())
    });
}
#[test]
fn complete_day_part_classification_matches_retained_typescript() {
    compare("dayParts", |case| {
        let plan = case
            .get("plan")
            .map(|value| serde_json::from_value(value.clone()).unwrap());
        Ok(serde_json::to_value(task_occurrence_day_part(
            plan.as_ref(),
            &serde_json::from_value(case["settings"].clone()).unwrap(),
        ))
        .unwrap())
    });
}
