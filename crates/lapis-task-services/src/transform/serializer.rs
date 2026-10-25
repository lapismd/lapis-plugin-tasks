use super::{TaskMutation, TaskTransformError};
use crate::ParsedTaskDocument;
use serde_json::Value as Json;
use serde_yaml::{Mapping, Value};

fn key(value: &str) -> Value {
    Value::String(value.into())
}
fn insert(map: &mut Mapping, field: &str, value: Value) {
    map.insert(key(field), value);
}
fn json(value: &Json) -> Value {
    serde_yaml::to_value(value).expect("parsed values")
}
fn ordered(value: &Json, fields: &[&str]) -> Value {
    let mut map = Mapping::new();
    for field in fields {
        if let Some(value) = value.get(*field) {
            insert(&mut map, field, json(value));
        }
    }
    Value::Mapping(map)
}
fn repeat(value: &Json, before: &Json, action: &TaskMutation) -> Value {
    const FIELDS: &[&str] = &[
        "start",
        "rrule",
        "anchor",
        "missed",
        "rdate",
        "exdate",
        "resetChecklist",
        "paused",
        "pausedSince",
        "pauseRanges",
        "lastCompletedAt",
        "completionCount",
    ];
    let mut fields: Vec<_> = match action {
        TaskMutation::Repeat {
            repeat: Some(input),
            ..
        } => {
            let input = serde_yaml::to_value(input).unwrap();
            FIELDS
                .iter()
                .copied()
                .filter(|field| input.get(*field).is_some())
                .collect()
        }
        _ => FIELDS
            .iter()
            .copied()
            .filter(|field| before.get(*field).is_some())
            .collect(),
    };
    let additions: &[&str] = match action {
        TaskMutation::Complete { .. } => &["start", "lastCompletedAt", "completionCount"],
        TaskMutation::Pause { .. } => &["pausedSince"],
        TaskMutation::Resume { .. } => &["pauseRanges"],
        TaskMutation::Repeat { .. } => &["lastCompletedAt", "completionCount"],
        _ => &[],
    };
    for field in additions {
        if !fields.contains(field) && value.get(*field).is_some() {
            fields.push(field);
        }
    }
    let mut map = ordered(value, &fields).as_mapping().unwrap().clone();
    if let Some(values) = value["pauseRanges"].as_array() {
        insert(
            &mut map,
            "pauseRanges",
            Value::Sequence(
                values
                    .iter()
                    .map(|entry| ordered(entry, &["start", "end"]))
                    .collect(),
            ),
        );
    }
    Value::Mapping(map)
}
fn retain(original: &Value, removed: &[&str]) -> Mapping {
    original
        .as_mapping()
        .into_iter()
        .flat_map(|map| map.iter())
        .filter(|(field, _)| !field.as_str().is_some_and(|field| removed.contains(&field)))
        .map(|(field, value)| (field.clone(), value.clone()))
        .collect()
}
fn task(value: &Json, original: &Value, before: &Json, action: &TaskMutation) -> Value {
    let fields = [
        "status",
        "priority",
        "completedAt",
        "inbox",
        "start",
        "plan",
        "deadline",
        "repeat",
        "tracking",
        "comments",
    ];
    let mut map = retain(original, &fields);
    insert(&mut map, "status", json(&value["status"]));
    if let Some(priority) = value
        .get("priority")
        .or_else(|| value.get("unparsedPriority"))
    {
        insert(
            &mut map,
            "priority",
            if value.get("unparsedPriority").is_some() {
                original["priority"].clone()
            } else {
                json(priority)
            },
        );
    }
    insert(&mut map, "inbox", json(&value["inbox"]));
    insert(
        &mut map,
        "start",
        json(if value["start"]["kind"] == "date" {
            &value["start"]["date"]
        } else {
            &value["start"]["kind"]
        }),
    );
    for field in [
        "completedAt",
        "plan",
        "deadline",
        "repeat",
        "tracking",
        "comments",
    ] {
        let Some(data) = value.get(field).or_else(|| match field {
            "repeat" => value.get("unparsedRepeat"),
            "tracking" => value.get("unparsedTracking"),
            _ => None,
        }) else {
            continue;
        };
        if data.is_string() && data.as_str().unwrap().is_empty()
            || field == "comments" && data.as_array().is_some_and(Vec::is_empty)
        {
            continue;
        }
        let data = match field {
            "plan" => {
                let mut map = Mapping::new();
                insert(&mut map, "date", json(&data["date"]));
                let at = if data["at"] == "time" {
                    &data["time"]
                } else {
                    &data["at"]
                };
                if !at.is_null() {
                    insert(&mut map, "at", json(at));
                }
                if data["duration"]
                    .as_str()
                    .is_some_and(|value| !value.is_empty())
                {
                    insert(&mut map, "duration", json(&data["duration"]));
                }
                Value::Mapping(map)
            }
            "repeat" if value.get("repeat").is_some() => repeat(data, &before["repeat"], action),
            "tracking" if value.get("tracking").is_some() => {
                ordered(data, &["type", "unit", "target"])
            }
            "comments" => Value::Sequence(
                data.as_array()
                    .unwrap()
                    .iter()
                    .map(|entry| {
                        ordered(
                            entry,
                            &["id", "at", "text", "occurrence", "editedAt", "resolved"],
                        )
                    })
                    .collect(),
            ),
            "repeat" | "tracking" => original[field].clone(),
            _ => json(data),
        };
        insert(&mut map, field, data);
    }
    Value::Mapping(map)
}

pub(super) fn serialize(
    document: &ParsedTaskDocument,
    action: &TaskMutation,
) -> Result<String, TaskTransformError> {
    let envelope = regex::Regex::new(r"^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)").unwrap();
    let original = envelope
        .captures(&document.raw)
        .map(|capture| crate::document::yaml::parse(&capture[1]))
        .transpose()
        .map_err(TaskTransformError::plain)?
        .unwrap_or(Value::Null);
    let mut retained = retain(
        &original,
        &["type", "id", "tags", "created", "updated", "title"],
    );
    insert(&mut retained, "type", Value::String("task".into()));
    insert(&mut retained, "id", Value::String(document.id.clone()));
    if !document.tags.is_empty() {
        insert(
            &mut retained,
            "tags",
            serde_yaml::to_value(&document.tags).unwrap(),
        );
    }
    for (field, value) in [
        ("created", &document.created),
        ("updated", &document.updated),
    ] {
        if let Some(value) = value.as_ref().filter(|value| !value.is_empty()) {
            insert(&mut retained, field, Value::String(value.clone()));
        }
    }
    insert(
        &mut retained,
        "task",
        task(
            document.task.as_ref().unwrap(),
            &original["task"],
            crate::parse_task_document(&document.raw, &document.path)
                .unwrap()
                .task
                .as_ref()
                .unwrap(),
            action,
        ),
    );
    let yaml = super::yaml::stringify(&Value::Mapping(retained));
    Ok(format!(
        "---\n{}\n---\n\n{}",
        yaml.trim_end(),
        document.body.trim_start_matches('\n')
    ))
}
