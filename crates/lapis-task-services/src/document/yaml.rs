//! YAML 1.2 values. Ordered decoding and scalar fidelity belong at this reader.
use saphyr::{LoadableYamlNode, Scalar, Yaml};
use serde_yaml::Value;

pub(crate) fn parse(source: &str) -> Result<Value, String> {
    let documents = Yaml::load_from_str(source).map_err(|error| error.to_string())?;
    if documents.len() > 1 {
        return Err("Expected a single metadata document.".into());
    }
    documents
        .first()
        .map_or(Ok(Value::Null), |node| convert(node, 0))
}

fn convert(node: &Yaml<'_>, depth: usize) -> Result<Value, String> {
    if depth > 128 {
        return Err("Metadata nesting is too deep.".into());
    }
    Ok(match node {
        Yaml::Value(Scalar::Null) => Value::Null,
        Yaml::Value(Scalar::Boolean(value)) => Value::Bool(*value),
        Yaml::Value(Scalar::Integer(value)) => Value::Number((*value).into()),
        Yaml::Value(Scalar::FloatingPoint(value)) => {
            serde_yaml::to_value(value.0).map_err(|error| error.to_string())?
        }
        Yaml::Value(Scalar::String(value)) => Value::String(value.to_string()),
        Yaml::Sequence(values) => Value::Sequence(
            values
                .iter()
                .map(|value| convert(value, depth + 1))
                .collect::<Result<_, _>>()?,
        ),
        Yaml::Mapping(values) => Value::Mapping(
            values
                .iter()
                .map(|(key, value)| Ok((convert(key, depth + 1)?, convert(value, depth + 1)?)))
                .collect::<Result<_, String>>()?,
        ),
        Yaml::Tagged(_, value) => convert(value, depth + 1)?,
        Yaml::Representation(..) | Yaml::Alias(..) | Yaml::BadValue => {
            return Err("Metadata contains an unresolved value.".into());
        }
    })
}
