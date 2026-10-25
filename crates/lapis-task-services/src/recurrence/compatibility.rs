use std::collections::{BTreeMap, BTreeSet, VecDeque};
use std::iter::Peekable;

use chrono::{Datelike, Duration, NaiveDate, Weekday};

use super::primary::{numbers, weekday};

/// Retain JS-accepted set filters which the native library validates more
/// strictly. The library still generates the calendar candidates and intervals.
pub(super) struct Compatibility {
    frequency: String,
    origin: NaiveDate,
    week_start: Weekday,
    month_days: Vec<i32>,
    days: Vec<(i32, Weekday)>,
    month_scoped: bool,
    positions: Vec<i32>,
    count: Option<f64>,
}

impl Compatibility {
    pub(super) fn prepare(parts: &mut BTreeMap<String, String>, origin: NaiveDate) -> Option<Self> {
        let frequency = parts["FREQ"].clone();
        let days: Vec<_> = parts
            .get("BYDAY")
            .into_iter()
            .flat_map(|value| value.split(','))
            .map(|value| {
                let split = value.len() - 2;
                (
                    value[..split].parse().unwrap_or(0),
                    weekday(&value[split..]),
                )
            })
            .collect();
        let limit = if frequency == "MONTHLY" { 4 } else { 52 };
        let needs_ordinal = (frequency == "MONTHLY" || frequency == "YEARLY")
            && days
                .iter()
                .any(|(number, _)| *number < -limit || *number > limit + 1);
        let needs_month_day = frequency == "WEEKLY" && parts.contains_key("BYMONTHDAY");
        if !needs_ordinal && !needs_month_day {
            return None;
        }
        let month_days = if needs_month_day {
            numbers(&parts.remove("BYMONTHDAY").unwrap())
        } else {
            Vec::new()
        };
        let positions = parts
            .remove("BYSETPOS")
            .map_or_else(Vec::new, |value| numbers(&value));
        let count = parts.remove("COUNT").and_then(|value| value.parse().ok());
        let week_start = parts
            .get("WKST")
            .map_or(Weekday::Mon, |value| weekday(value));
        let month_scoped = frequency == "MONTHLY" || parts.contains_key("BYMONTH");
        if !days.is_empty() {
            parts.insert(
                "BYDAY".into(),
                parts["BYDAY"]
                    .split(',')
                    .map(|day| &day[day.len() - 2..])
                    .collect::<Vec<_>>()
                    .join(","),
            );
        } else if needs_month_day {
            parts.insert("BYDAY".into(), "MO,TU,WE,TH,FR,SA,SU".into());
        }
        Some(Self {
            frequency,
            origin,
            week_start,
            month_days,
            days,
            month_scoped,
            positions,
            count,
        })
    }

    pub(super) fn period(&self, value: NaiveDate) -> NaiveDate {
        match self.frequency.as_str() {
            "MONTHLY" => value.with_day(1).unwrap(),
            "YEARLY" => NaiveDate::from_ymd_opt(value.year(), 1, 1).unwrap(),
            _ => {
                value
                    - Duration::days(i64::from(
                        (value.weekday().num_days_from_monday() + 7
                            - self.week_start.num_days_from_monday())
                            % 7,
                    ))
            }
        }
    }

    fn accepts(&self, value: NaiveDate) -> bool {
        let first = value.with_day(1).unwrap();
        let last = (first + chrono::Months::new(1)).pred_opt().unwrap();
        if !self.month_days.is_empty()
            && !self.month_days.iter().any(|day| {
                *day == value.day() as i32
                    || *day < 0 && *day == value.day() as i32 - last.day() as i32 - 1
            })
        {
            return false;
        }
        if self.days.is_empty() || self.frequency == "WEEKLY" {
            return true;
        }
        let (first, last) = if self.month_scoped {
            (first, last)
        } else {
            (
                NaiveDate::from_ymd_opt(value.year(), 1, 1).unwrap(),
                NaiveDate::from_ymd_opt(value.year(), 12, 31).unwrap(),
            )
        };
        self.days.iter().any(|(ordinal, weekday)| {
            *weekday == value.weekday()
                && (*ordinal == 0
                    || *ordinal > 0 && i64::from(*ordinal) == (value - first).num_days() / 7 + 1
                    || *ordinal < 0 && i64::from(-*ordinal) == (last - value).num_days() / 7 + 1)
        })
    }
}

pub(super) struct CompatibilityIterator<'a, I: Iterator<Item = NaiveDate>> {
    dates: Peekable<I>,
    policy: &'a Compatibility,
    pending: VecDeque<NaiveDate>,
    remaining: Option<f64>,
}

impl<'a, I: Iterator<Item = NaiveDate>> CompatibilityIterator<'a, I> {
    pub(super) fn new(dates: I, policy: &'a Compatibility) -> Self {
        Self {
            dates: dates.peekable(),
            policy,
            pending: VecDeque::new(),
            remaining: policy.count,
        }
    }
}

impl<I: Iterator<Item = NaiveDate>> Iterator for CompatibilityIterator<'_, I> {
    type Item = NaiveDate;

    fn next(&mut self) -> Option<Self::Item> {
        loop {
            if self.remaining.is_some_and(|value| value <= 0.0) {
                return None;
            }
            if let Some(value) = self.pending.pop_front() {
                if let Some(remaining) = &mut self.remaining {
                    *remaining -= 1.0;
                }
                return Some(value);
            }
            let first = self.dates.next()?;
            let period = self.policy.period(first);
            let mut candidates = vec![first];
            while self
                .dates
                .peek()
                .is_some_and(|value| self.policy.period(*value) == period)
            {
                candidates.push(self.dates.next().unwrap());
            }
            candidates.retain(|value| self.policy.accepts(*value));
            let selected = if self.policy.positions.is_empty() {
                candidates.into_iter().collect()
            } else {
                self.policy
                    .positions
                    .iter()
                    .filter_map(|position| {
                        let index = if *position > 0 {
                            i64::from(*position) - 1
                        } else {
                            candidates.len() as i64 + i64::from(*position)
                        };
                        usize::try_from(index)
                            .ok()
                            .and_then(|index| candidates.get(index))
                            .copied()
                    })
                    .collect::<BTreeSet<_>>()
            };
            self.pending.extend(
                selected
                    .into_iter()
                    .filter(|value| *value >= self.policy.origin),
            );
        }
    }
}
