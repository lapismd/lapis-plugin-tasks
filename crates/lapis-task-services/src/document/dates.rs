use std::sync::LazyLock;

use chrono::{DateTime, NaiveDate};
use regex::Regex;
use serde_json::Value;

static LOCAL_DATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\A([0-9]{4})-([0-9]{2})-([0-9]{2})\z").unwrap());
static ISO_TIMESTAMP: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\A([0-9]{4})-([0-9]{2})-([0-9]{2})(T[0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+)?)?(?:Z|[+-][0-9]{2}:[0-9]{2})?)?\z")
        .unwrap()
});

pub(crate) fn local(value: &Value) -> bool {
    let Some(captures) = value.as_str().and_then(|value| LOCAL_DATE.captures(value)) else {
        return false;
    };
    let year = captures[1].parse().unwrap();
    // Date.UTC maps years 0 through 99 to 1900 through 1999, so the retained
    // round-trip validation rejects those authored years.
    year >= 100
        && NaiveDate::from_ymd_opt(
            year,
            captures[2].parse().unwrap(),
            captures[3].parse().unwrap(),
        )
        .is_some()
}

pub(super) fn timestamp(value: &str) -> bool {
    if DateTime::parse_from_rfc3339(value).is_ok() || DateTime::parse_from_rfc2822(value).is_ok() {
        return true;
    }
    if let Some(captures) = ISO_TIMESTAMP.captures(value) {
        let (month, day) = (
            captures[2].parse::<u32>().unwrap(),
            captures[3].parse::<u32>().unwrap(),
        );
        if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
            return false;
        }
        let Some(time) = captures.get(4) else {
            return true;
        };
        // ECMAScript accepts days 29-31 even when they roll into the next month.
        // Validate the unchanged clock/zone against a calendar-valid date.
        return DateTime::parse_from_rfc3339(&format!("2000-01-01{}", time.as_str())).is_ok()
            || chrono::NaiveDateTime::parse_from_str(
                &format!("2000-01-01{}", time.as_str()),
                "%Y-%m-%dT%H:%M:%S%.f",
            )
            .is_ok();
    }
    // Legacy Date.parse accepts standalone month numbers and years.
    !value.is_empty()
        && value.bytes().all(|value| value.is_ascii_digit())
        && value
            .parse::<u32>()
            .is_ok_and(|value| value <= 12 || value >= 32)
}
