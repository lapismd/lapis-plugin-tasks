use regex::Regex;
use std::{collections::HashMap, sync::LazyLock};

// ECMAScript whitespace, including BOM and excluding U+0085.
pub(crate) const JS_SPACE: &str = r"\t\n\x0B\x0C\r \u{00A0}\u{1680}\u{2000}-\u{200A}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}\u{FEFF}";

static ATTRIBUTES: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(r"([a-z][a-zA-Z]*)=([^{JS_SPACE}]+)"))
        .expect("valid occurrence attribute pattern")
});

pub(crate) fn attributes(source: &str) -> HashMap<String, String> {
    let mut attributes = HashMap::new();
    for capture in ATTRIBUTES.captures_iter(source) {
        if let Some(value) = decode_uri(&capture[2], false) {
            attributes.insert(capture[1].to_owned(), value);
        }
    }
    attributes
}

/// Match decodeURI/decodeURIComponent, including all-or-nothing UTF-8 failure.
fn decode_uri(value: &str, preserve_reserved: bool) -> Option<String> {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] != b'%' {
            decoded.push(bytes[index]);
            index += 1;
            continue;
        }
        let high = (*bytes.get(index + 1)? as char).to_digit(16)? as u8;
        let low = (*bytes.get(index + 2)? as char).to_digit(16)? as u8;
        let byte = high * 16 + low;
        if preserve_reserved && b";/?:@&=+$,#".contains(&byte) {
            decoded.extend_from_slice(&bytes[index..index + 3]);
        } else {
            decoded.push(byte);
        }
        index += 3;
    }
    String::from_utf8(decoded).ok()
}

pub(crate) fn resolve_href(source_path: &str, href: &str) -> String {
    let decoded = decode_uri(href, true).unwrap_or_else(|| href.to_owned());
    let target = decoded.strip_prefix('<').unwrap_or(&decoded);
    let target = target.strip_suffix('>').unwrap_or(target);
    let target = target.split('#').next().unwrap_or(target);
    if target.starts_with('/') {
        return target.trim_start_matches('/').to_owned();
    }
    let mut parts: Vec<_> = source_path.split('/').collect();
    parts.pop();
    for segment in target.split('/') {
        match segment {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            segment => parts.push(segment),
        }
    }
    parts.join("/")
}

pub(crate) fn trim(value: &str) -> &str {
    value.trim_matches(|character: char| {
        matches!(character, '\u{0009}'..='\u{000D}' | '\u{0020}' | '\u{00A0}' | '\u{1680}'
            | '\u{2000}'..='\u{200A}' | '\u{2028}' | '\u{2029}' | '\u{202F}'
            | '\u{205F}' | '\u{3000}' | '\u{FEFF}')
    })
}
