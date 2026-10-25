//! Retained YAML v2 block presentation for authored Task metadata.
//! Mapping order is supplied by the owning serializer, independent of JSON map order.
use serde_yaml::Value;

fn scalar(value: &Value) -> String {
    match value {
        Value::Null => "null".into(),
        Value::Bool(value) => value.to_string(),
        Value::Number(value) => value.as_f64().map_or_else(|| value.to_string(), number),
        Value::String(value) => {
            let ambiguous = serde_yaml::from_str::<Value>(value)
                .ok()
                .is_none_or(|parsed| !matches!(parsed, Value::String(_)));
            let first = value.chars().next();
            let indicator = first.is_some_and(|value| "[],{}#&*!|>'\"%@`".contains(value))
                || first.is_some_and(|value| "-?:".contains(value))
                    && value.chars().nth(1).is_none_or(char::is_whitespace);
            if value.is_empty()
                || value.trim() != value
                || value.contains(": ")
                || value.contains(" #")
                || value
                    .chars()
                    .any(|value| value.is_control() && value != '\t')
                || ambiguous
                || indicator
            {
                serde_json::to_string(value).unwrap()
            } else {
                value.clone()
            }
        }
        Value::Sequence(values) if values.is_empty() => "[]".into(),
        Value::Mapping(values) if values.is_empty() => "{}".into(),
        Value::Tagged(value) => scalar(&value.value),
        _ => unreachable!("nonempty collections have block presentation"),
    }
}
fn number(value: f64) -> String {
    if value.is_nan() {
        return ".nan".into();
    }
    if value == f64::INFINITY {
        return ".inf".into();
    }
    if value == f64::NEG_INFINITY {
        return "-.inf".into();
    }
    if value == 0.0 && value.is_sign_negative() {
        return "-0".into();
    }
    ryu_js::Buffer::new().format(value).to_owned()
}
fn scalar_line(value: &Value, indent: usize, output: &mut String) {
    if let Value::String(value) = value {
        if value.contains('\n')
            && !value
                .chars()
                .any(|character| character.is_control() && !matches!(character, '\n' | '\t'))
        {
            let body = value.trim_end_matches('\n');
            let trailing = value.len() - body.len();
            output.push_str(if trailing == 0 {
                "|-\n"
            } else if trailing > 1 || body.is_empty() {
                "|+\n"
            } else {
                "|\n"
            });
            for line in body.split('\n') {
                output.push_str(&" ".repeat(indent));
                output.push_str(line);
                output.push('\n');
            }
            for _ in 1..trailing {
                output.push('\n');
            }
            return;
        }
    }
    output.push_str(&scalar(value));
    output.push('\n');
}
fn block(value: &Value) -> bool {
    matches!(value,Value::Sequence(values) if !values.is_empty())
        || matches!(value,Value::Mapping(values) if !values.is_empty())
}
fn entry(key: &Value, value: &Value, indent: usize, output: &mut String) {
    output.push_str(&scalar(key));
    output.push(':');
    if block(value) {
        output.push('\n');
        render(value, indent + 2, output);
    } else {
        output.push(' ');
        scalar_line(value, indent + 2, output);
    }
}
fn render(value: &Value, indent: usize, output: &mut String) {
    let pad = " ".repeat(indent);
    match value {
        Value::Mapping(map) => {
            for (key, value) in map {
                output.push_str(&pad);
                entry(key, value, indent, output);
            }
        }
        Value::Sequence(values) => {
            for value in values {
                output.push_str(&pad);
                output.push_str("- ");
                if let Value::Mapping(map) = value {
                    if !map.is_empty() {
                        for (index, (key, value)) in map.iter().enumerate() {
                            if index > 0 {
                                output.push_str(&" ".repeat(indent + 2));
                            }
                            entry(key, value, indent + 2, output);
                        }
                        continue;
                    }
                }
                if block(value) {
                    output.push('\n');
                    render(value, indent + 2, output);
                } else {
                    scalar_line(value, indent + 2, output);
                }
            }
        }
        value => {
            output.push_str(&pad);
            scalar_line(value, indent, output);
        }
    }
}
pub(super) fn stringify(value: &Value) -> String {
    let mut output = String::new();
    render(value, 0, &mut output);
    output
}
