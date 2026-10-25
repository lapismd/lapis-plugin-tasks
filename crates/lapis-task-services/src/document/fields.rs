use std::sync::LazyLock;

use regex::Regex;
use serde_json::{Map, Value, json};

use super::envelope::string;
use super::records::{TaskDiagnostic, diagnostic};

static DATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$").unwrap());
static TIME: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^[0-9]{2}:[0-9]{2}$").unwrap());
static DURATION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^(?:([0-9]+)h)?(?:([0-9]+)m)?$").unwrap());

pub(super) fn duration_minutes(value: &str) -> Option<f64> {
    let captures = DURATION.captures(crate::marker::trim(value))?;
    let hours = captures
        .get(1)
        .map(|value| value.as_str().parse::<f64>().unwrap());
    let minutes = captures
        .get(2)
        .map(|value| value.as_str().parse::<f64>().unwrap());
    let total = hours.unwrap_or_default() * 60.0 + minutes.unwrap_or_default();
    (total > 0.0).then_some(total)
}

fn start(value: &Value, diagnostics: &mut Vec<TaskDiagnostic>) -> Value {
    if value.is_null() || value == "anytime" {
        return json!({"kind": "anytime"});
    }
    if value == "someday" {
        return json!({"kind": "someday"});
    }
    if let Some(date) = value.as_str().filter(|value| DATE.is_match(value)) {
        return json!({"kind": "date", "date": date});
    }
    diagnostics.push(diagnostic(
        "invalid-start",
        "task.start",
        "start must be anytime, someday, or a YYYY-MM-DD date.",
    ));
    json!({"kind": "anytime"})
}

fn plan(value: &Value, diagnostics: &mut Vec<TaskDiagnostic>) -> Option<Value> {
    let record = value.as_object()?;
    let Some(date) = string(&record.get("date").cloned().unwrap_or_default())
        .filter(|value| DATE.is_match(value))
    else {
        diagnostics.push(diagnostic(
            "invalid-plan-date",
            "task.plan.date",
            "plan.date must be a YYYY-MM-DD date.",
        ));
        return None;
    };
    let at = string(&value["at"]).unwrap_or_else(|| "anytime".to_owned());
    let mut result = Map::from_iter([("date".to_owned(), json!(date))]);
    if ["anytime", "morning", "afternoon", "evening"].contains(&at.as_str()) {
        result.insert("at".to_owned(), json!(at));
    } else if TIME.is_match(&at) {
        result.insert("at".to_owned(), json!("time"));
        result.insert("time".to_owned(), json!(at));
    } else {
        diagnostics.push(diagnostic(
            "invalid-plan-at",
            "task.plan.at",
            "plan.at must be anytime, morning, afternoon, evening, or HH:mm.",
        ));
        result.insert("at".to_owned(), json!("anytime"));
    }
    if let Some(duration) = string(&value["duration"]) {
        if let Some(minutes) = duration_minutes(&duration) {
            result.insert("durationMinutes".to_owned(), json!(minutes));
        } else {
            diagnostics.push(diagnostic(
                "invalid-duration",
                "task.plan.duration",
                "plan.duration must be a positive duration such as 45m or 1h30m.",
            ));
        }
        result.insert("duration".to_owned(), json!(duration));
    }
    Some(Value::Object(result))
}

fn comments(value: &Value) -> Vec<Value> {
    value
        .as_array()
        .map(|comments| {
            comments
                .iter()
                .filter_map(|entry| {
                    let (id, at, text) = (
                        string(&entry["id"])?,
                        string(&entry["at"])?,
                        string(&entry["text"])?,
                    );
                    let mut result = Map::from_iter([
                        ("id".to_owned(), json!(id)),
                        ("at".to_owned(), json!(at)),
                        ("text".to_owned(), json!(text)),
                    ]);
                    for field in ["occurrence", "editedAt"] {
                        if let Some(value) = string(&entry[field]) {
                            result.insert(field.to_owned(), json!(value));
                        }
                    }
                    if entry["resolved"] == true {
                        result.insert("resolved".to_owned(), Value::Bool(true));
                    }
                    Some(Value::Object(result))
                })
                .collect()
        })
        .unwrap_or_default()
}

fn javascript_string(value: &Value) -> String {
    match value {
        Value::String(value) => value.to_owned(),
        Value::Null => "null".to_owned(),
        Value::Array(values) => values
            .iter()
            .map(|value| {
                if value.is_null() {
                    String::new()
                } else {
                    javascript_string(value)
                }
            })
            .collect::<Vec<_>>()
            .join(","),
        Value::Object(_) => "[object Object]".to_owned(),
        value => value.to_string(),
    }
}

pub(super) fn task(
    value: &Value,
    nonfinite_priority: bool,
    diagnostics: &mut Vec<TaskDiagnostic>,
) -> Value {
    let status = string(&value["status"]).unwrap_or_else(|| "open".to_owned());
    let status = if ["open", "completed", "canceled"].contains(&status.as_str()) {
        status
    } else {
        diagnostics.push(diagnostic(
            "invalid-status",
            "task.status",
            "task.status must be open, completed, or canceled.",
        ));
        "open".to_owned()
    };
    let start = start(&value["start"], diagnostics);
    let plan = plan(&value["plan"], diagnostics);
    if plan.is_some() && start["kind"] == "someday" {
        diagnostics.push(diagnostic(
            "someday-plan",
            "task.plan",
            "A someday task must not also have an active plan.",
        ));
    }
    if let Some(plan) = &plan {
        if start["kind"] == "date" && plan["date"].as_str() < start["date"].as_str() {
            diagnostics.push(diagnostic(
                "plan-before-start",
                "task.plan.date",
                "plan.date must not be before a dated start.",
            ));
        }
    }
    let repeat = super::repeat::parse(&value["repeat"], diagnostics);
    let tracking = super::tracking::parse(&value["tracking"], repeat.value.is_some(), diagnostics);
    let mut result = Map::from_iter([
        ("status".to_owned(), json!(status)),
        ("inbox".to_owned(), json!(value["inbox"] == true)),
        ("start".to_owned(), start),
        ("comments".to_owned(), json!(comments(&value["comments"]))),
    ]);
    if !value["priority"].is_null() || nonfinite_priority {
        let field = if ["low", "medium", "high"]
            .contains(&javascript_string(&value["priority"]).as_str())
        {
            "priority"
        } else {
            "unparsedPriority"
        };
        result.insert(field.to_owned(), value["priority"].clone());
    }
    for field in ["completedAt", "deadline"] {
        if let Some(value) = string(&value[field]) {
            result.insert(field.to_owned(), json!(value));
        }
    }
    if let Some(plan) = plan {
        result.insert("plan".to_owned(), plan);
    }
    for (field, value) in [
        ("repeat", repeat.value),
        ("unparsedRepeat", repeat.unparsed),
        ("tracking", tracking.value),
        ("unparsedTracking", tracking.unparsed),
    ] {
        if let Some(value) = value {
            result.insert(field.to_owned(), value);
        }
    }
    Value::Object(result)
}

pub(super) fn list(value: &Value) -> Value {
    json!({
        "status": if value["status"] == "archived" { "archived" } else { "active" },
        "role": if value["role"] == "area" { "area" } else { "list" },
    })
}
