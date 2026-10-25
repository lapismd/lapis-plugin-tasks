use super::conformance::{compare, numeric};
use super::*;
use serde_json::{Value, json};

fn completion(value: &Value) -> TaskOccurrenceCompletion {
    match value["type"].as_str().unwrap() {
        "boolean" => TaskOccurrenceCompletion::Boolean,
        "duration" => TaskOccurrenceCompletion::Duration {
            duration_minutes: numeric(&value["durationMinutes"]).unwrap(),
        },
        "count" => TaskOccurrenceCompletion::Count {
            value: numeric(&value["value"]).unwrap(),
            unit: value["unit"].as_str().unwrap().into(),
        },
        "number" => TaskOccurrenceCompletion::Number {
            value: numeric(&value["value"]).unwrap(),
            unit: value["unit"].as_str().unwrap().into(),
        },
        kind => panic!("unknown fixture completion {kind}"),
    }
}
#[test]
fn complete_observation_completion_text_and_context_match_retained_typescript() {
    compare("completions", |case| {
        let raw = case["raw"].as_str().unwrap();
        let path = case["path"].as_str().unwrap();
        let mut observations = scan_task_occurrence_observations(
            case["expectedRaw"].as_str().unwrap_or(raw),
            case["expectedPath"].as_str().unwrap_or(path),
        );
        let index = case["expectedIndex"].as_u64().unwrap_or(0) as usize;
        if observations.len() <= index {
            return Err(TaskTransformError::plain(
                "Reference fixture has no expected observation",
            ));
        }
        let mut expected = observations.remove(index);
        if let Some(patch) = case["patch"].as_object() {
            for (key, value) in patch {
                match key.as_str() {
                    "sourceStart" => {
                        expected.record.source_start = value.as_u64().unwrap() as usize
                    }
                    "sourceEnd" => expected.record.source_end = value.as_u64().unwrap() as usize,
                    "source" => expected.source = value.as_str().unwrap().into(),
                    "dailyDocumentPath" => {
                        expected.record.daily_document_path = value.as_str().unwrap().into()
                    }
                    "taskId" => expected.record.task_id = value.as_str().unwrap().into(),
                    "occurrenceDate" => {
                        expected.record.occurrence_date = value.as_str().unwrap().into()
                    }
                    field => panic!("unknown stale fixture field {field}"),
                }
            }
        }
        let completion = completion(&case["completion"]);
        let raw = complete_task_occurrence(raw, path, &expected, &completion)?;
        let observations = scan_task_occurrence_observations(&raw, path);
        let current = observations
            .iter()
            .find(|value| {
                value.record.task_id == expected.record.task_id
                    && value.record.occurrence_date == expected.record.occurrence_date
            })
            .ok_or_else(|| {
                TaskTransformError::plain("Reference completion lost its observation")
            })?;
        let repeated = complete_task_occurrence(&raw, path, current, &completion)?;
        Ok(
            json!({"raw":raw,"observations":observations,"repeated":repeated,"repeatedObservations":scan_task_occurrence_observations(&repeated,path)}),
        )
    });
}
