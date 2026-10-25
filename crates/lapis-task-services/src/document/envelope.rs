use std::sync::LazyLock;

use regex::Regex;
use serde_json::{Map, Value};

use crate::marker::{JS_SPACE, trim};

static ENVELOPE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\A---\r?\n(?s:(.*?))\r?\n---\r?\n?").unwrap());
static FIRST_HEADING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(
        r"(?m)^#[{JS_SPACE}]+([^\r\n\u{{2028}}\u{{2029}}]+?)[{JS_SPACE}]*$"
    ))
    .unwrap()
});
static ID_SEPARATORS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[-_]+").unwrap());
static SPACES: LazyLock<Regex> = LazyLock::new(|| Regex::new(&format!(r"[{JS_SPACE}]+")).unwrap());

pub(crate) fn body(raw: &str) -> &str {
    ENVELOPE
        .captures(raw)
        .map_or(raw, |captures| &raw[captures.get(0).unwrap().end()..])
}

pub(super) fn split(raw: &str) -> (Map<String, Value>, &str) {
    let Some(captures) = ENVELOPE.captures(raw) else {
        return (Map::new(), raw);
    };
    let parsed = serde_yaml::from_str::<serde_yaml::Value>(&captures[1])
        .ok()
        .and_then(|value| serde_json::to_value(value).ok())
        .and_then(|value| value.as_object().cloned())
        .unwrap_or_default();
    (parsed, &raw[captures.get(0).unwrap().end()..])
}

pub(super) fn string(value: &Value) -> Option<String> {
    value
        .as_str()
        .map(trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

pub(super) fn strings(value: &Value) -> Vec<String> {
    value
        .as_array()
        .map(|items| items.iter().filter_map(string).collect())
        .unwrap_or_default()
}

pub(super) fn heading(body: &str) -> Option<String> {
    FIRST_HEADING
        .captures(body)
        .map(|captures| trim(&captures[1]).to_owned())
}

pub(super) fn path_title(path: &str) -> String {
    let base = path.rsplit('/').next().unwrap_or(path);
    let title = if base.to_lowercase().ends_with(".md") {
        &base[..base.len() - 3]
    } else {
        base
    };
    if title.is_empty() { path } else { title }.to_owned()
}

pub(super) fn id_title(id: &str) -> Option<String> {
    let trimmed = trim(id);
    if trimmed.is_empty() {
        return None;
    }
    let separated = ID_SEPARATORS.replace_all(trimmed, " ");
    let normalized = SPACES.replace_all(&separated, " ");
    Some(
        normalized
            .split(' ')
            .map(|word| {
                let mut chars = word.chars();
                let Some(first) = chars.next() else {
                    return String::new();
                };
                if first.len_utf16() == 2 {
                    return word.to_owned();
                }
                first.to_uppercase().chain(chars).collect()
            })
            .collect::<Vec<_>>()
            .join(" "),
    )
}
