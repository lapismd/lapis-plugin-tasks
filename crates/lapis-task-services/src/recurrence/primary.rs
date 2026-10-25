use std::collections::BTreeMap;

use chrono::{NaiveDate, TimeZone};
use rrule::{RRule, RRuleSet, Tz, Unvalidated};

use super::{
    RecurrenceError,
    compatibility::{Compatibility, CompatibilityIterator},
};

pub(super) struct Primary {
    set: RRuleSet,
    compatibility: Option<Compatibility>,
}

impl Primary {
    pub(super) fn dates(&self) -> Box<dyn Iterator<Item = NaiveDate> + '_> {
        let dates = self.set.clone().into_iter().map(|value| value.date_naive());
        match &self.compatibility {
            Some(policy) => Box::new(CompatibilityIterator::new(dates, policy)),
            None => Box::new(dates),
        }
    }
}

pub(super) fn weekday(value: &str) -> chrono::Weekday {
    use chrono::Weekday::*;
    match value {
        "TU" => Tue,
        "WE" => Wed,
        "TH" => Thu,
        "FR" => Fri,
        "SA" => Sat,
        "SU" => Sun,
        _ => Mon,
    }
}

pub(super) fn numbers(value: &str) -> Vec<i32> {
    value
        .split(',')
        .filter_map(|value| value.parse().ok())
        .collect()
}

pub(super) fn build(rule: &str, start: NaiveDate) -> Result<Option<Primary>, RecurrenceError> {
    let mut parts: BTreeMap<String, String> = rule
        .split(';')
        .map(|part| {
            let (key, value) = part.split_once('=').unwrap();
            (key.into(), value.into())
        })
        .collect();
    let frequency = parts["FREQ"].clone();
    if ["COUNT", "INTERVAL"]
        .iter()
        .any(|key| parts.get(*key).is_some_and(|value| value == "0"))
    {
        return Ok(None);
    }
    if let Some(until) = parts.get("UNTIL") {
        let until = NaiveDate::parse_from_str(until, "%Y%m%d")
            .map_err(|error| RecurrenceError::invalid(error.to_string()))?;
        if until < start {
            return Ok(None);
        }
        parts.insert("UNTIL".into(), until.format("%Y%m%dT000000Z").to_string());
    }
    if let Some(months) = parts.get("BYMONTH") {
        let months: Vec<_> = numbers(months)
            .into_iter()
            .filter(|value| (1..=12).contains(value))
            .collect();
        if months.is_empty() {
            return Ok(None);
        }
        parts.insert(
            "BYMONTH".into(),
            months
                .iter()
                .map(ToString::to_string)
                .collect::<Vec<_>>()
                .join(","),
        );
    }
    if let Some(positions) = parts.get("BYSETPOS") {
        let maximum = match frequency.as_str() {
            "DAILY" => 1,
            "WEEKLY" => 7,
            "MONTHLY" => 31,
            _ => 366,
        };
        let positions: Vec<_> = numbers(positions)
            .into_iter()
            .filter(|value| value.abs() <= maximum)
            .collect();
        if positions.is_empty() {
            return Ok(None);
        }
        parts.insert(
            "BYSETPOS".into(),
            positions
                .iter()
                .map(ToString::to_string)
                .collect::<Vec<_>>()
                .join(","),
        );
    }
    let compatibility = Compatibility::prepare(&mut parts, start);
    if frequency == "DAILY" || frequency == "WEEKLY" {
        if let Some(days) = parts.get_mut("BYDAY") {
            *days = days
                .split(',')
                .map(|day| &day[day.len() - 2..])
                .collect::<Vec<_>>()
                .join(",");
        }
    }
    let origin = compatibility
        .as_ref()
        .map_or(start, |policy| policy.period(start));
    let start = Tz::UTC.from_utc_datetime(&origin.and_hms_opt(0, 0, 0).unwrap());
    let text = parts
        .iter()
        .map(|(key, value)| format!("{key}={value}"))
        .collect::<Vec<_>>()
        .join(";");
    let primary: RRule<Unvalidated> = text
        .parse()
        .map_err(|error: rrule::RRuleError| RecurrenceError::invalid(error.to_string()))?;
    let primary = primary
        .validate(start)
        .map_err(|error| RecurrenceError::invalid(error.to_string()))?;
    Ok(Some(Primary {
        set: RRuleSet::new(start).rrule(primary),
        compatibility,
    }))
}
