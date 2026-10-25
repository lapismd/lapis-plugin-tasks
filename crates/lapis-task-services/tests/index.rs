use lapis_task_services::{
    ResolvedTaskDocumentStructure, TaskStructureSnapshotResolver, parse_task_document,
    resolve_task_href, task_document_to_indexed_file, task_edges, task_projection_source,
};
use serde_json::{Value, json};

fn fixtures() -> Value {
    serde_json::from_str(include_str!("fixtures/index-inputs.json")).unwrap()
}

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
fn matches_retained_typescript_href_policy() {
    for input in fixtures()["hrefs"].as_array().unwrap() {
        assert_eq!(
            resolve_task_href(
                input["sourcePath"].as_str().unwrap(),
                input["href"].as_str().unwrap()
            ),
            input["expected"].as_str().unwrap(),
            "{input}"
        );
    }
}

#[test]
fn matches_complete_retained_snapshot_target_policy() {
    for input in fixtures()["snapshots"].as_array().unwrap() {
        let documents: Vec<_> = input["documents"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|document| {
                parse_task_document(
                    document["raw"].as_str().unwrap(),
                    document["path"].as_str().unwrap(),
                )
            })
            .collect();
        let resolve = TaskStructureSnapshotResolver::new(&documents);
        let actual: Vec<_> = input["queries"]
            .as_array()
            .unwrap()
            .iter()
            .map(|query| {
                resolve.resolve(
                    query["sourcePath"].as_str().unwrap(),
                    query["href"].as_str().unwrap(),
                )
            })
            .collect();
        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            input["expected"],
            "{}",
            input["name"]
        );
    }
}

#[test]
fn matches_complete_retained_typescript_index_envelopes() {
    for input in fixtures()["envelopes"].as_array().unwrap() {
        let parsed = parse_task_document(
            input["raw"].as_str().unwrap(),
            input["path"].as_str().unwrap(),
        );
        let structure: Option<ResolvedTaskDocumentStructure> =
            serde_json::from_value(input["structure"].clone()).unwrap();
        let today = input["today"].as_str().unwrap();
        let actual = match parsed {
            None => json!({"value": null}),
            Some(document) => {
                let result = task_document_to_indexed_file(&document, structure.as_ref(), today).and_then(|indexed_file| {
                    task_projection_source(&document, structure.as_ref(), today).map(|projection_source| {
                        json!({"edges": task_edges(&document, structure.as_ref()), "indexedFile": indexed_file, "projectionSource": projection_source})
                    })
                });
                match result {
                    Ok(value) => json!({"value": value}),
                    Err(error) => json!({"error": error}),
                }
            }
        };
        assert_eq!(
            javascript_numbers(actual),
            javascript_numbers(input["expected"].clone()),
            "{}",
            input["name"]
        );
    }
}
