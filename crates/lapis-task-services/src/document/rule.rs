use std::sync::LazyLock;

use regex::Regex;
use serde_json::json;

use super::dates;

// Preserve rrule.js parseString/constructor validation semantics and messages.
// This is classification only, not recurrence execution. See LICENSES/rrule.txt.
static PART: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\A([A-Z][A-Z0-9-]*)=([^=;]+)\z").unwrap());
static WEEKDAY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\A([+-]?[0-9]{1,2})([A-Z]{2})\z").unwrap());
static UNTIL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\A([0-9]{4})([0-9]{2})([0-9]{2})(?:T[0-9]{6}Z?)?\z").unwrap());

const EXECUTABLE: &[&str] = &[
    "FREQ",
    "INTERVAL",
    "BYDAY",
    "BYMONTHDAY",
    "BYMONTH",
    "BYSETPOS",
    "WKST",
    "COUNT",
    "UNTIL",
];
const NUMERIC: &[&str] = &[
    "COUNT",
    "INTERVAL",
    "BYSETPOS",
    "BYMONTH",
    "BYMONTHDAY",
    "BYYEARDAY",
    "BYWEEKNO",
    "BYHOUR",
    "BYMINUTE",
    "BYSECOND",
    "BYEASTER",
];
const DAYS: &[&str] = &["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

fn weekday(value: &str) -> Result<(), String> {
    for day in value.split(',') {
        if day.len() == 2 {
            if !DAYS.contains(&day) {
                return Err("Cannot read properties of undefined (reading 'n')".to_owned());
            }
            continue;
        }
        let Some(captures) = WEEKDAY.captures(day) else {
            return Err(format!("Invalid weekday string: {day}"));
        };
        if !DAYS.contains(&&captures[2]) {
            return Err("Cannot read properties of undefined (reading 'weekday')".to_owned());
        }
        if captures[1].parse::<i32>().unwrap() == 0 {
            return Err("Can't create weekday with n == 0".to_owned());
        }
    }
    Ok(())
}

pub(crate) fn analyze(rule: &str) -> Result<Vec<String>, String> {
    if rule.is_empty() || rule != crate::marker::trim(rule) {
        return Err("RRULE must be a non-empty trimmed property value.".to_owned());
    }
    if rule.contains(['\n', '\r']) || rule.to_ascii_uppercase().starts_with("RRULE:") {
        return Err("RRULE must store only the property value, without a prefix.".to_owned());
    }
    let mut parts: Vec<(&str, &str)> = Vec::new();
    for part in rule.split(';') {
        let Some(captures) = PART.captures(part) else {
            return Err(format!("Invalid RRULE part: {part}"));
        };
        let key = captures.get(1).unwrap().as_str();
        if parts.iter().any(|(existing, _)| *existing == key) {
            return Err(format!("Duplicate RRULE property: {key}"));
        }
        parts.push((key, captures.get(2).unwrap().as_str()));
    }
    let get = |key| {
        parts
            .iter()
            .find(|(candidate, _)| *candidate == key)
            .map(|(_, value)| *value)
    };
    let Some(frequency) = get("FREQ") else {
        return Err("RRULE must include FREQ.".to_owned());
    };
    if get("COUNT").is_some() && get("UNTIL").is_some() {
        return Err("RRULE must not combine COUNT and UNTIL.".to_owned());
    }
    for (key, value) in &parts {
        match *key {
            "FREQ" | "WKST" => {}
            "BYDAY" | "BYWEEKDAY" => weekday(value)?,
            "UNTIL" if !UNTIL.is_match(value) => {
                return Err(format!("Invalid UNTIL value: {value}"));
            }
            "UNTIL" => {}
            "DTSTART" => {
                if !UNTIL.is_match(value) {
                    return Err(format!("Invalid UNTIL value: {value}"));
                }
            }
            "TZID" => {}
            key if NUMERIC.contains(&key) => {}
            key => return Err(format!("Unknown RRULE property '{key}'")),
        }
    }
    if get("BYEASTER").is_none()
        && ![
            "YEARLY", "MONTHLY", "WEEKLY", "DAILY", "HOURLY", "MINUTELY", "SECONDLY",
        ]
        .contains(&frequency.to_ascii_uppercase().as_str())
    {
        return Err("Invalid frequency: undefined undefined".to_owned());
    }
    if let Some(value) = get("BYSETPOS") {
        for position in value.split(',') {
            if !position
                .parse::<f64>()
                .is_ok_and(|value| value != 0.0 && (-366.0..=366.0).contains(&value))
            {
                return Err("bysetpos must be between 1 and 366, or between -366 and -1".to_owned());
            }
        }
    }
    let mut unsupported: Vec<_> = parts
        .iter()
        .filter(|(key, _)| !EXECUTABLE.contains(key))
        .map(|(key, _)| (*key).to_owned())
        .collect();
    if !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].contains(&frequency) {
        unsupported.push(format!("FREQ={frequency}"));
    }
    if let Some(until) = get("UNTIL") {
        let captures = UNTIL.captures(until).unwrap();
        if until.len() != 8
            || !dates::local(&json!(format!(
                "{}-{}-{}",
                &captures[1], &captures[2], &captures[3]
            )))
        {
            unsupported.push("UNTIL with a time or zone".to_owned());
        }
    }
    Ok(unsupported)
}
