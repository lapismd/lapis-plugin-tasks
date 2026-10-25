use super::{
    EffectiveOccurrence, RecurrenceAnalysis, RecurrenceEngine, RecurrenceError, RecurrenceOptions,
    RepeatOptions, analyze_recurrence_rule,
};

fn next(
    repeat: &RepeatOptions,
    engine: &RecurrenceEngine,
    after: &str,
    inclusive: bool,
) -> Result<Option<String>, RecurrenceError> {
    let mut candidate = engine.next(after, inclusive)?;
    while let Some(value) = &candidate {
        if !repeat
            .pause_ranges
            .iter()
            .any(|range| range.start <= *value && *value <= range.end)
        {
            break;
        }
        candidate = engine.next(value, false)?;
    }
    Ok(candidate)
}

/// Resolve normalized repeat metadata with an explicit local date. This does
/// not capture a wall clock, change Markdown or materialize an observation.
pub fn resolve_effective_occurrence(
    repeat: &RepeatOptions,
    plan_date: Option<&str>,
    today: &str,
) -> Result<EffectiveOccurrence, RecurrenceError> {
    let base = |date: Option<String>, state: &str, warning: Option<String>| EffectiveOccurrence {
        date,
        state: state.into(),
        effective_for_date: today.into(),
        warning,
    };
    let retained = || plan_date.map(String::from).or_else(|| repeat.start.clone());
    match analyze_recurrence_rule(&repeat.rrule) {
        RecurrenceAnalysis::Invalid { message } => {
            return Ok(base(retained(), "unsupported", Some(message)));
        }
        RecurrenceAnalysis::Unsupported { parts } => {
            return Ok(base(
                retained(),
                "unsupported",
                Some(RecurrenceError::unsupported(parts).message),
            ));
        }
        RecurrenceAnalysis::Supported => {}
    }
    if repeat.paused {
        return Ok(base(retained(), "paused", None));
    }
    let state = |value: &str| {
        if value < today {
            "overdue"
        } else if value == today {
            "current"
        } else {
            "future"
        }
    };
    let Some(start) = &repeat.start else {
        return Ok(base(
            plan_date.map(String::from),
            plan_date.map_or("current", state),
            None,
        ));
    };
    let engine = RecurrenceEngine::new(RecurrenceOptions {
        start: start.clone(),
        rrule: repeat.rrule.clone(),
        rdate: repeat.rdate.clone(),
        exdate: repeat.exdate.clone(),
    })?;
    let mut candidate = if let Some(plan) = plan_date {
        next(repeat, &engine, plan, true)?
    } else {
        let mut candidate = next(repeat, &engine, start, true)?;
        let mut remaining = repeat.completion_count;
        while let Some(value) = &candidate {
            if remaining <= 0.0 {
                break;
            }
            candidate = next(repeat, &engine, value, false)?;
            remaining -= 1.0;
        }
        candidate
    };
    if repeat.missed == "skip" {
        let floor = candidate
            .as_deref()
            .filter(|value| *value > today)
            .unwrap_or(today);
        candidate = next(repeat, &engine, floor, true)?;
    }
    let Some(candidate) = candidate else {
        return Ok(base(None, "exhausted", None));
    };
    let state = state(&candidate);
    Ok(base(Some(candidate), state, None))
}
