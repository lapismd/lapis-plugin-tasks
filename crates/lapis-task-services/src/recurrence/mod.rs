mod compatibility;
mod effective;
mod primary;
mod records;

use std::collections::BTreeSet;
use std::ops::Bound::{Excluded, Included, Unbounded};

use chrono::NaiveDate;
use serde_json::json;

pub use effective::resolve_effective_occurrence;
pub use records::{
    EffectiveOccurrence, RecurrenceAnalysis, RecurrenceError, RecurrenceOptions, RepeatOptions,
};

/// Classify through the same retained adapter used by native document parsing.
pub fn analyze_recurrence_rule(rule: &str) -> RecurrenceAnalysis {
    match crate::document::rule::analyze(rule) {
        Ok(parts) if parts.is_empty() => RecurrenceAnalysis::Supported,
        Ok(parts) => RecurrenceAnalysis::Unsupported { parts },
        Err(message) => RecurrenceAnalysis::Invalid { message },
    }
}

pub(super) fn date(value: &str) -> Result<NaiveDate, RecurrenceError> {
    if !crate::document::dates::local(&json!(value)) {
        return Err(RecurrenceError::invalid(format!(
            "Invalid local date: {value}"
        )));
    }
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| RecurrenceError::invalid(format!("Invalid local date: {value}")))
}

fn display(value: NaiveDate) -> String {
    value.format("%Y-%m-%d").to_string()
}

/// Date-only recurrence with explicit inclusions and exclusions. Calendar
/// generation belongs to rrule; this adapter retains rrule.js set semantics.
pub struct RecurrenceEngine {
    primary: Option<primary::Primary>,
    included: BTreeSet<NaiveDate>,
    excluded: BTreeSet<NaiveDate>,
}

impl RecurrenceEngine {
    pub fn new(options: RecurrenceOptions) -> Result<Self, RecurrenceError> {
        let start = date(&options.start).map_err(|_| {
            RecurrenceError::invalid(format!("Invalid recurrence start: {}", options.start))
        })?;
        match analyze_recurrence_rule(&options.rrule) {
            RecurrenceAnalysis::Invalid { message } => {
                return Err(RecurrenceError::invalid(message));
            }
            RecurrenceAnalysis::Unsupported { parts } => {
                return Err(RecurrenceError::unsupported(parts));
            }
            RecurrenceAnalysis::Supported => {}
        }
        let mut included = BTreeSet::from([start]);
        for value in &options.rdate {
            included.insert(date(value)?);
        }
        let excluded = options
            .exdate
            .iter()
            .map(|value| date(value))
            .collect::<Result<_, _>>()?;
        Ok(Self {
            primary: primary::build(&options.rrule, start)?,
            included,
            excluded,
        })
    }

    fn dates(&self) -> Box<dyn Iterator<Item = NaiveDate> + '_> {
        match &self.primary {
            Some(primary) => primary.dates(),
            None => Box::new(std::iter::empty()),
        }
    }

    pub fn next(&self, after: &str, inclusive: bool) -> Result<Option<String>, RecurrenceError> {
        let after = date(after)?;
        let bound = if inclusive {
            Included(after)
        } else {
            Excluded(after)
        };
        let explicit = self
            .included
            .range((bound, Unbounded))
            .find(|value| !self.excluded.contains(value))
            .copied();
        let primary = self.dates().find(|value| {
            (*value > after || inclusive && *value == after) && !self.excluded.contains(value)
        });
        Ok(explicit.into_iter().chain(primary).min().map(display))
    }

    pub fn previous(
        &self,
        before: &str,
        inclusive: bool,
    ) -> Result<Option<String>, RecurrenceError> {
        let before = date(before)?;
        let bound = if inclusive {
            Included(before)
        } else {
            Excluded(before)
        };
        let explicit = self
            .included
            .range((Unbounded, bound))
            .rev()
            .find(|value| !self.excluded.contains(value))
            .copied();
        let primary = self
            .dates()
            .take_while(|value| *value < before || inclusive && *value == before)
            .filter(|value| !self.excluded.contains(value))
            .last();
        Ok(explicit.into_iter().chain(primary).max().map(display))
    }

    pub fn between(
        &self,
        start: &str,
        end: &str,
        inclusive: bool,
    ) -> Result<Vec<String>, RecurrenceError> {
        // The retained adapter short-circuits reversed bounds before date parsing.
        if start > end {
            return Ok(Vec::new());
        }
        let (start, end) = (date(start)?, date(end)?);
        let mut result = BTreeSet::new();
        let lower = |value: &NaiveDate| *value > start || inclusive && *value == start;
        let upper = |value: &NaiveDate| *value < end || inclusive && *value == end;
        for value in self
            .dates()
            .take_while(upper)
            .filter(lower)
            .chain(self.included.iter().copied().filter(lower).filter(upper))
        {
            if !self.excluded.contains(&value) {
                result.insert(value);
            }
        }
        Ok(result.into_iter().map(display).collect())
    }
}
