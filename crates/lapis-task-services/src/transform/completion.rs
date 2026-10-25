use super::{
    TaskOccurrenceCompletion, TaskOccurrenceObservation, TaskTracking, TaskTransformError,
    observations::{byte_offset, scan_task_occurrence_observations, slice, unique},
};
use crate::{TaskTrackingKind, marker::trim};
use regex::Regex;

pub fn tracking_completion(
    tracking: Option<&TaskTracking>,
    value: Option<f64>,
) -> Result<TaskOccurrenceCompletion, TaskTransformError> {
    Ok(match tracking {
        None | Some(TaskTracking::Boolean) => TaskOccurrenceCompletion::Boolean,
        Some(TaskTracking::Duration { .. }) => TaskOccurrenceCompletion::Duration {
            duration_minutes: value.ok_or_else(|| {
                TaskTransformError::value("Duration completion requires minutes.")
            })?,
        },
        Some(TaskTracking::Count { unit, .. }) => TaskOccurrenceCompletion::Count {
            value: value
                .ok_or_else(|| TaskTransformError::value("Count completion requires a value."))?,
            unit: unit.clone(),
        },
        Some(TaskTracking::Number { unit, .. }) => TaskOccurrenceCompletion::Number {
            value: value
                .ok_or_else(|| TaskTransformError::value("Number completion requires a value."))?,
            unit: unit.clone(),
        },
    })
}

fn suffix(
    kind: TaskTrackingKind,
    completion: &TaskOccurrenceCompletion,
) -> Result<String, TaskTransformError> {
    let actual = match completion {
        TaskOccurrenceCompletion::Boolean => TaskTrackingKind::Boolean,
        TaskOccurrenceCompletion::Count { .. } => TaskTrackingKind::Count,
        TaskOccurrenceCompletion::Duration { .. } => TaskTrackingKind::Duration,
        TaskOccurrenceCompletion::Number { .. } => TaskTrackingKind::Number,
    };
    if actual != kind {
        return Err(TaskTransformError::value(format!(
            "Expected {} tracking data.",
            serde_json::to_value(kind).unwrap().as_str().unwrap()
        )));
    }
    match completion {
        TaskOccurrenceCompletion::Boolean => Ok(String::new()),
        TaskOccurrenceCompletion::Duration {
            duration_minutes: value,
        } => {
            if !value.is_finite() || value.fract() != 0.0 || *value <= 0.0 {
                return Err(TaskTransformError::value(
                    "Duration must be at least one minute.",
                ));
            }
            let hours = (value / 60.0).floor();
            let minutes = value % 60.0;
            Ok(format!(
                " : {}{}",
                if hours > 0.0 {
                    format!("{hours}h")
                } else {
                    String::new()
                },
                if minutes > 0.0 {
                    format!("{minutes}m")
                } else {
                    String::new()
                }
            ))
        }
        TaskOccurrenceCompletion::Count { value, unit }
        | TaskOccurrenceCompletion::Number { value, unit } => {
            if !value.is_finite() || *value < 0.0 {
                return Err(TaskTransformError::value(
                    "Tracked value must be zero or greater.",
                ));
            }
            if actual == TaskTrackingKind::Count && value.fract() != 0.0 {
                return Err(TaskTransformError::value("Count must be a whole number."));
            }
            if trim(unit).is_empty() {
                return Err(TaskTransformError::value("Tracked value requires a unit."));
            }
            Ok(format!(" : {value} {}", trim(unit)))
        }
    }
}

pub fn complete_task_occurrence(
    raw: &str,
    daily_path: &str,
    expected: &TaskOccurrenceObservation,
    completion: &TaskOccurrenceCompletion,
) -> Result<String, TaskTransformError> {
    let record = &expected.record;
    if slice(raw, record.source_start, record.source_end) != Some(expected.source.as_str())
        || record.daily_document_path != daily_path
    {
        return Err(TaskTransformError::stale());
    }
    let observations = scan_task_occurrence_observations(raw, daily_path);
    let current = unique(&observations, &record.task_id, &record.occurrence_date)?
        .filter(|value| value.record.source_start == record.source_start)
        .ok_or_else(TaskTransformError::stale)?;
    let suffix = suffix(current.record.tracking_kind, completion)?;
    let (first, context) = current
        .source
        .find('\n')
        .map_or((current.source.as_str(), ""), |i| {
            (&current.source[..i], &current.source[i..])
        });
    let marker = first
        .find("<!-- task-occurrence")
        .ok_or_else(TaskTransformError::stale)?;
    let prefix = Regex::new(r"^(\s*[-*+]\s+\[)[ xX](\]\s+\[[\s\S]*)$")
        .unwrap()
        .replace(&first[..marker], "${1}x${2}");
    let prefix = Regex::new(r"\s*(?::\s*.*?)?\s*$")
        .unwrap()
        .replace(&prefix, "")
        .into_owned();
    let source = format!("{prefix}{suffix} {}{context}", &first[marker..]);
    if source == current.source {
        return Ok(raw.into());
    }
    let start =
        byte_offset(raw, current.record.source_start).ok_or_else(TaskTransformError::stale)?;
    let end = byte_offset(raw, current.record.source_end).ok_or_else(TaskTransformError::stale)?;
    Ok(format!("{}{source}{}", &raw[..start], &raw[end..]))
}
