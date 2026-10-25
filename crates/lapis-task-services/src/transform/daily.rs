use super::{
    TaskDayPartSettings, TaskOccurrenceDayPart, TaskOccurrenceMaterialization, TaskPlan,
    TaskPlanAt, TaskTracking, TaskTransformError,
    observations::{scan_task_occurrence_observations, unique},
};
use crate::is_canonical_daily_document;
use regex::Regex;

pub fn task_occurrence_day_part(
    plan: Option<&TaskPlan>,
    settings: &TaskDayPartSettings,
) -> TaskOccurrenceDayPart {
    let Some(plan) = plan else {
        return TaskOccurrenceDayPart::Anytime;
    };
    match plan.at {
        TaskPlanAt::Morning => TaskOccurrenceDayPart::Morning,
        TaskPlanAt::Afternoon => TaskOccurrenceDayPart::Afternoon,
        TaskPlanAt::Evening => TaskOccurrenceDayPart::Evening,
        TaskPlanAt::Time => match plan.time.as_deref().filter(|value| !value.is_empty()) {
            Some(time) if time < settings.afternoon_starts_at.as_str() => {
                TaskOccurrenceDayPart::Morning
            }
            Some(time) if time < settings.evening_starts_at.as_str() => {
                TaskOccurrenceDayPart::Afternoon
            }
            Some(_) => TaskOccurrenceDayPart::Evening,
            _ => TaskOccurrenceDayPart::Anytime,
        },
        TaskPlanAt::Anytime => TaskOccurrenceDayPart::Anytime,
    }
}

fn encode(value: &str, uri: bool) -> String {
    let mut result = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric()
            || b"-_.!~*'()".contains(&byte)
            || (uri && b";/?:@&=+$,#".contains(&byte))
        {
            result.push(char::from(byte));
        } else {
            result.push_str(&format!("%{byte:02X}"));
        }
    }
    result
}
fn relative(source: &str, target: &str) -> String {
    let mut from: Vec<_> = source.split('/').collect();
    from.pop();
    let mut to: Vec<_> = target.split('/').collect();
    while !from.is_empty() && !from[0].is_empty() && to.first() == from.first() {
        from.remove(0);
        to.remove(0);
    }
    let path = from
        .iter()
        .map(|_| "..")
        .chain(to)
        .collect::<Vec<_>>()
        .join("/");
    encode(
        if path.is_empty() {
            target
                .rsplit('/')
                .next()
                .filter(|value| !value.is_empty())
                .unwrap_or(target)
        } else {
            &path
        },
        true,
    )
}
fn line(path: &str, input: &TaskOccurrenceMaterialization) -> String {
    let kind = match &input.tracking {
        None | Some(TaskTracking::Boolean) => "kind=boolean".into(),
        Some(TaskTracking::Duration { .. }) => "kind=duration".into(),
        Some(TaskTracking::Count { unit, .. }) => {
            format!("kind=count unit={}", encode(unit, false))
        }
        Some(TaskTracking::Number { unit, .. }) => {
            format!("kind=number unit={}", encode(unit, false))
        }
    };
    let title = input
        .title
        .replace('\\', "\\\\")
        .replace(']', "\\]")
        .replace("\r\n", " ")
        .replace('\n', " ");
    format!(
        "- [ ] [{title}]({}) <!-- task-occurrence task={} date={} {kind} -->",
        relative(path, &input.task_path),
        encode(&input.task_id, false),
        input.occurrence_date
    )
}

pub fn materialize_task_occurrence(
    raw: &str,
    daily_path: &str,
    input: &TaskOccurrenceMaterialization,
) -> Result<String, TaskTransformError> {
    if !is_canonical_daily_document(raw, Some(&input.occurrence_date)) {
        return Err(TaskTransformError::plain(format!(
            "Expected {daily_path} to be the canonical daily note for {}.",
            input.occurrence_date
        )));
    }
    let observations = scan_task_occurrence_observations(raw, daily_path);
    if unique(&observations, &input.task_id, &input.occurrence_date)?.is_some() {
        return Ok(raw.into());
    }
    let line = line(daily_path, input);
    let label = input.day_part.label();
    let mut cursor = 0;
    let lines: Vec<_> = raw
        .split_inclusive('\n')
        .map(|source| {
            let start = cursor;
            cursor += source.len();
            (source.trim_end_matches(['\r', '\n']), start)
        })
        .collect();
    let tasks = Regex::new(r"^##\s+Tasks\s*$").unwrap();
    let level_two = Regex::new(r"^##\s+").unwrap();
    let heading = Regex::new(r"^#{2,3}\s+").unwrap();
    let Some(index) = lines.iter().position(|(text, _)| tasks.is_match(text)) else {
        let base = raw.trim_end_matches(space);
        return Ok(format!(
            "{base}{}## Tasks\n\n### {label}\n\n{line}\n",
            if base.is_empty() { "" } else { "\n\n" }
        ));
    };
    let tasks_end_index = lines
        .iter()
        .enumerate()
        .find(|(i, (text, _))| *i > index && level_two.is_match(text))
        .map(|(i, _)| i);
    let tasks_end = tasks_end_index.map_or(raw.len(), |i| lines[i].1);
    let section = Regex::new(&format!(r"(?i)^###\s+{label}\s*$")).unwrap();
    let section_index = lines
        .iter()
        .enumerate()
        .find(|(i, (text, _))| {
            *i > index && tasks_end_index.is_none_or(|end| *i < end) && section.is_match(text)
        })
        .map(|(i, _)| i);
    let end = section_index
        .and_then(|section| {
            lines
                .iter()
                .enumerate()
                .find(|(i, (text, _))| {
                    *i > section
                        && tasks_end_index.is_none_or(|end| *i <= end)
                        && heading.is_match(text)
                })
                .map(|(_, (_, start))| *start)
        })
        .unwrap_or(tasks_end);
    let before = raw[..end].trim_end_matches(space);
    let after = raw[end..].trim_start_matches(space);
    let block = if section_index.is_some() {
        line
    } else {
        format!("### {label}\n\n{line}")
    };
    Ok(format!(
        "{before}\n\n{block}\n{}",
        if after.is_empty() {
            String::new()
        } else {
            format!("\n{after}")
        }
    ))
}

fn space(character: char) -> bool {
    crate::marker::trim(&character.to_string()).is_empty()
}
