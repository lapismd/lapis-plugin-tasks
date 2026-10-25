use serde_json::{Value, json};

use super::{
    envelope::string, fields::duration_minutes, records::TaskDiagnostic, value::ParsedField,
};

pub(super) fn parse(
    value: &Value,
    has_repeat: bool,
    diagnostics: &mut Vec<TaskDiagnostic>,
) -> ParsedField {
    if value.is_null() {
        return ParsedField::absent();
    }
    let Some(record) = value.as_object() else {
        return ParsedField::invalid(
            value,
            diagnostics,
            "invalid-tracking",
            "task.tracking",
            "tracking must be a boolean, count, duration, or number object.",
        );
    };
    if !has_repeat {
        return ParsedField::invalid(
            value,
            diagnostics,
            "tracking-without-repeat",
            "task.tracking",
            "tracking requires an executable or preserved RRULE recurrence.",
        );
    }
    let kind = string(&value["type"]);
    let unit = string(&value["unit"]);
    let target = &value["target"];
    let mut tracking = match kind.as_deref() {
        Some("boolean") if value["unit"].is_null() && target.is_null() => {
            Some(json!({"type": "boolean"}))
        }
        Some("count" | "number")
            if unit.is_some()
                && (target.is_null()
                    || target
                        .as_f64()
                        .is_some_and(|value| value.is_finite() && value > 0.0)) =>
        {
            Some(json!({"type": kind, "unit": unit}))
        }
        Some("duration")
            if value["unit"].is_null()
                && (target.is_null()
                    || target
                        .as_str()
                        .is_some_and(|value| duration_minutes(value).is_some())) =>
        {
            Some(json!({"type": "duration"}))
        }
        _ => None,
    };
    if record
        .keys()
        .any(|key| !["type", "unit", "target"].contains(&key.as_str()))
    {
        tracking = None;
    }
    let Some(mut tracking) = tracking else {
        return ParsedField::invalid(
            value,
            diagnostics,
            "invalid-tracking",
            "task.tracking",
            "count and number tracking require a unit and optional positive target; duration accepts an optional positive duration target.",
        );
    };
    if !target.is_null() {
        tracking["target"] = target.clone();
    }
    ParsedField::valid(tracking)
}
