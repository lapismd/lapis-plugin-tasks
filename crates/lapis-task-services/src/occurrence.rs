use crate::{
    TASK_OCCURRENCE_PROJECTION_VERSION, TaskOccurrenceRecord, TaskOutcome, TaskTrackingKind,
    marker::{JS_SPACE, attributes, resolve_href, trim},
};
use regex::Regex;
use serde_yaml::Value;
use std::sync::LazyLock;

static FRONT_MATTER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)").expect("valid daily front matter pattern")
});
static OCCURRENCE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(
        r"^([{JS_SPACE}]*)[-*+][{JS_SPACE}]+\[([ xX])\][{JS_SPACE}]+\[([^\]]+)\]\(([^)]+)\)([^\n\r\u{{2028}}\u{{2029}}]*?)<!--[{JS_SPACE}]*task-occurrence[{JS_SPACE}]+([^>]*?)[{JS_SPACE}]*-->[{JS_SPACE}]*$"
    ))
    .expect("valid occurrence line pattern")
});
static DATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$").expect("valid date pattern"));
static NUMBER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(
        r"^([0-9]+(?:\.[0-9]+)?)(?:[{JS_SPACE}]+([^\n\r\u{{2028}}\u{{2029}}]+))?$"
    ))
    .expect("valid tracking number pattern")
});
static DURATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(?:([0-9]+)h)?(?:([0-9]+)m)?$").expect("valid duration pattern")
});

pub fn is_canonical_daily_document(raw: &str, date: Option<&str>) -> bool {
    let Some(front_matter) = FRONT_MATTER.captures(raw) else {
        return false;
    };
    let Ok(value) = serde_yaml::from_str::<Value>(&front_matter[1]) else {
        return false;
    };
    value.is_mapping()
        && value["type"].as_str() == Some("daily-note")
        && value["date"].as_str().is_some_and(|actual| {
            date.is_none_or(|expected| expected.is_empty() || actual == expected)
        })
}

struct Line<'a> {
    text: &'a str,
    start: usize,
    end: usize,
}

fn lines(raw: &str) -> Vec<Line<'_>> {
    let mut start = 0;
    raw.split_inclusive('\n')
        .map(|source| {
            let end = start + source.encode_utf16().count();
            let line = Line {
                text: source
                    .strip_suffix('\n')
                    .map(|text| text.strip_suffix('\r').unwrap_or(text))
                    .unwrap_or(source),
                start,
                end,
            };
            start = end;
            line
        })
        .collect()
}

fn is_context(line: &str) -> bool {
    line.starts_with("  ") || line.starts_with('\t')
}

fn contextual_range_end(lines: &[Line<'_>], index: usize) -> usize {
    let mut end = lines[index].end;
    for cursor in index + 1..lines.len() {
        let line = &lines[cursor];
        if is_context(line.text)
            || (trim(line.text).is_empty()
                && lines
                    .get(cursor + 1)
                    .is_some_and(|next| is_context(next.text)))
        {
            end = line.end;
        } else {
            break;
        }
    }
    end
}

#[derive(Default)]
struct TrackingValue {
    value: Option<f64>,
    unit: Option<String>,
    duration_minutes: Option<f64>,
}

fn numeric(value: &str) -> f64 {
    value.parse().unwrap_or(f64::INFINITY)
}

fn parse_value(kind: TaskTrackingKind, suffix: &str) -> TrackingValue {
    let suffix = trim(suffix);
    let Some(value) = suffix.strip_prefix(':') else {
        return TrackingValue::default();
    };
    let value = trim(value);
    if kind == TaskTrackingKind::Duration {
        let duration_minutes = DURATION.captures(value).and_then(|capture| {
            let hours = capture.get(1).map_or(0.0, |value| numeric(value.as_str()));
            let minutes = capture.get(2).map_or(0.0, |value| numeric(value.as_str()));
            let total = hours * 60.0 + minutes;
            (total > 0.0).then_some(total)
        });
        return TrackingValue {
            duration_minutes,
            ..TrackingValue::default()
        };
    }
    if !matches!(kind, TaskTrackingKind::Count | TaskTrackingKind::Number) {
        return TrackingValue::default();
    }
    NUMBER
        .captures(value)
        .map_or_else(TrackingValue::default, |capture| TrackingValue {
            value: Some(numeric(&capture[1])),
            unit: capture
                .get(2)
                .map(|value| trim(value.as_str()))
                .filter(|value| !value.is_empty())
                .map(str::to_owned),
            duration_minutes: None,
        })
}

/// Preserve scanner order and duplicate identities; hosts validate publication.
pub fn task_occurrence_projection_rows(
    raw: &str,
    daily_document_path: &str,
) -> Vec<TaskOccurrenceRecord> {
    if !is_canonical_daily_document(raw, None) {
        return Vec::new();
    }
    let lines = lines(raw);
    let mut rows = Vec::new();
    for (index, line) in lines.iter().enumerate() {
        let Some(capture) = OCCURRENCE.captures(line.text) else {
            continue;
        };
        let attributes = attributes(&capture[6]);
        let Some(task_id) = attributes.get("task").filter(|value| !value.is_empty()) else {
            continue;
        };
        let Some(occurrence_date) = attributes.get("date").filter(|value| DATE.is_match(value))
        else {
            continue;
        };
        let Some(tracking_kind) = attributes
            .get("kind")
            .and_then(|value| TaskTrackingKind::parse(value))
        else {
            continue;
        };
        let parsed = parse_value(tracking_kind, &capture[5]);
        rows.push(TaskOccurrenceRecord {
            observation_id: format!("{task_id}:{occurrence_date}"),
            task_id: task_id.to_owned(),
            task_path: resolve_href(daily_document_path, &capture[4]),
            daily_document_path: daily_document_path.to_owned(),
            occurrence_date: occurrence_date.to_owned(),
            outcome: if capture[2].eq_ignore_ascii_case("x") {
                TaskOutcome::Completed
            } else {
                TaskOutcome::Pending
            },
            tracking_kind,
            value: parsed.value,
            unit: parsed.unit.or_else(|| {
                attributes
                    .get("unit")
                    .filter(|value| !value.is_empty())
                    .cloned()
            }),
            duration_minutes: parsed.duration_minutes,
            source_start: line.start,
            source_end: contextual_range_end(&lines, index),
            projection_version: TASK_OCCURRENCE_PROJECTION_VERSION,
        });
    }
    rows
}
