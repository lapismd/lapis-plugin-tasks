use super::{TaskOccurrenceDayPart, TaskOccurrenceObservation};
use crate::{TaskOutcome, marker::trim, task_occurrence_projection_rows};
use regex::Regex;

pub(super) fn byte_offset(raw: &str, units: usize) -> Option<usize> {
    let mut offset = 0;
    for (byte, character) in raw.char_indices() {
        if offset == units {
            return Some(byte);
        }
        offset += character.len_utf16();
    }
    (offset == units).then_some(raw.len())
}
pub(super) fn slice(raw: &str, from: usize, to: usize) -> Option<&str> {
    raw.get(byte_offset(raw, from)?..byte_offset(raw, to)?)
}

/// Enrich the qualified projection scanner without changing record order or duplicate handling.
pub fn scan_task_occurrence_observations(
    raw: &str,
    daily_path: &str,
) -> Vec<TaskOccurrenceObservation> {
    let heading = Regex::new(r"^###\s+(.+?)\s*$").unwrap();
    let link = Regex::new(r"\[[ xX]\]\s+\[([^\]]+)\]\(([^)]+)\)").unwrap();
    task_occurrence_projection_rows(raw, daily_path)
        .into_iter()
        .filter_map(|record| {
            let source = slice(raw, record.source_start, record.source_end)?.to_owned();
            let capture = link.captures(source.lines().next()?)?;
            let title = capture[1].to_owned();
            let href = capture[2].to_owned();
            let prefix = slice(raw, 0, record.source_start)?;
            let mut day_part = TaskOccurrenceDayPart::Anytime;
            for line in prefix.lines() {
                if let Some(captures) = heading.captures(line) {
                    day_part = match trim(&captures[1]).to_lowercase().as_str() {
                        "morning" => TaskOccurrenceDayPart::Morning,
                        "afternoon" => TaskOccurrenceDayPart::Afternoon,
                        "evening" => TaskOccurrenceDayPart::Evening,
                        _ => TaskOccurrenceDayPart::Anytime,
                    };
                }
            }
            Some(TaskOccurrenceObservation {
                checked: record.outcome == TaskOutcome::Completed,
                record,
                title,
                href,
                day_part,
                source,
            })
        })
        .collect()
}

pub(super) fn unique<'a>(
    observations: &'a [TaskOccurrenceObservation],
    id: &str,
    date: &str,
) -> Result<Option<&'a TaskOccurrenceObservation>, super::TaskTransformError> {
    let mut matches = observations
        .iter()
        .filter(|value| value.record.task_id == id && value.record.occurrence_date == date);
    let first = matches.next();
    if matches.next().is_some() {
        return Err(super::TaskTransformError::named(
            "DuplicateTaskOccurrenceError",
            "duplicate-task-occurrence",
            format!("Daily note contains duplicate observations for {id} on {date}."),
        ));
    }
    Ok(first)
}
