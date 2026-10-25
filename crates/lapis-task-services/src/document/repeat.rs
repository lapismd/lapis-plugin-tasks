use serde_json::{Map, Value, json};

use super::{dates, envelope::string, records::TaskDiagnostic, value::ParsedField};

const KNOWN: &[&str] = &[
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
const INVALID: &str = "repeat must use a valid RRULE, anchor/missed policy, date-only start and exceptions, pause ranges, and non-negative completionCount.";

fn date_list(value: &Value) -> Result<Vec<Value>, ()> {
    if value.is_null() {
        return Ok(Vec::new());
    }
    let values = value.as_array().ok_or(())?;
    let mut result = Vec::new();
    for value in values {
        if !dates::local(value) {
            return Err(());
        }
        if !result.contains(value) {
            result.push(value.clone());
        }
    }
    Ok(result)
}

fn ranges(value: &Value) -> Result<Vec<Value>, ()> {
    if value.is_null() {
        return Ok(Vec::new());
    }
    value
        .as_array()
        .ok_or(())?
        .iter()
        .map(|value| {
            if !dates::local(&value["start"])
                || !dates::local(&value["end"])
                || value["end"].as_str() < value["start"].as_str()
            {
                return Err(());
            }
            Ok(json!({"start": value["start"], "end": value["end"]}))
        })
        .collect()
}

pub(super) fn parse(value: &Value, diagnostics: &mut Vec<TaskDiagnostic>) -> ParsedField {
    if value.is_null() {
        return ParsedField::absent();
    }
    let Some(record) = value.as_object() else {
        return ParsedField::invalid(
            value,
            diagnostics,
            "invalid-repeat",
            "task.repeat",
            "repeat must be an RRULE recurrence object.",
        );
    };
    if ["frequency", "interval", "strategy", "on"]
        .iter()
        .any(|key| record.contains_key(*key))
    {
        return ParsedField::invalid(
            value,
            diagnostics,
            "legacy-repeat",
            "task.repeat",
            "Legacy frequency/interval recurrence is retained but is no longer executable; replace or remove it in the recurrence editor.",
        );
    }
    let rrule = string(&value["rrule"]);
    let anchor = if value["anchor"].is_null() {
        json!("schedule")
    } else {
        value["anchor"].clone()
    };
    let missed = if value["missed"].is_null() {
        json!("carry")
    } else {
        value["missed"].clone()
    };
    let rdate = date_list(&value["rdate"]);
    let exdate = date_list(&value["exdate"]);
    let pause_ranges = ranges(&value["pauseRanges"]);
    let last_completed = string(&value["lastCompletedAt"]);
    let count = &value["completionCount"];
    let invalid = record.keys().any(|key| !KNOWN.contains(&key.as_str()))
        || rrule.is_none()
        || (anchor != "schedule" && anchor != "completion")
        || (missed != "carry" && missed != "skip")
        || (anchor == "schedule" && !dates::local(&value["start"]))
        || (!value["start"].is_null() && !dates::local(&value["start"]))
        || (anchor == "completion" && missed != "carry")
        || rdate.is_err()
        || exdate.is_err()
        || pause_ranges.is_err()
        || ["resetChecklist", "paused"]
            .iter()
            .any(|key| !value[*key].is_null() && !value[*key].is_boolean())
        || (value["paused"] == true && !dates::local(&value["pausedSince"]))
        || (value["paused"] != true && !value["pausedSince"].is_null())
        || last_completed
            .as_deref()
            .is_some_and(|value| !dates::timestamp(value))
        || (!count.is_null()
            && !count
                .as_f64()
                .is_some_and(|value| value.is_finite() && value >= 0.0 && value.fract() == 0.0));
    if invalid {
        return ParsedField::invalid(value, diagnostics, "invalid-repeat", "task.repeat", INVALID);
    }
    let rrule = rrule.unwrap();
    match super::rule::analyze(&rrule) {
        Err(message) => return ParsedField::invalid(value, diagnostics, "invalid-repeat-rule", "task.repeat.rrule", &message),
        Ok(parts) if !parts.is_empty() => diagnostics.push(super::records::diagnostic(
            "unsupported-repeat-rule", "task.repeat.rrule",
            &format!("The RRULE is preserved but automatic advancement is blocked because Tasks does not execute: {}.", parts.join(", ")),
        )),
        Ok(_) => {}
    }
    let mut result = Map::from_iter([
        ("rrule".to_owned(), json!(rrule)),
        ("anchor".to_owned(), anchor),
        ("missed".to_owned(), missed),
        (
            "resetChecklist".to_owned(),
            json!(value["resetChecklist"] == true),
        ),
        ("paused".to_owned(), json!(value["paused"] == true)),
    ]);
    for field in ["start", "pausedSince"] {
        if dates::local(&value[field]) {
            result.insert(field.to_owned(), value[field].clone());
        }
    }
    for (field, values) in [
        ("rdate", rdate),
        ("exdate", exdate),
        ("pauseRanges", pause_ranges),
    ] {
        let values = values.unwrap();
        if !values.is_empty() {
            result.insert(field.to_owned(), json!(values));
        }
    }
    if let Some(value) = last_completed {
        result.insert("lastCompletedAt".to_owned(), json!(value));
    }
    if count.is_number() {
        result.insert("completionCount".to_owned(), count.clone());
    }
    ParsedField::valid(Value::Object(result))
}
