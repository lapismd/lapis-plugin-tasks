use lapis_app_protocol::{content::ContentEffect, native_tasks::*, operations::*};
use schemars::{JsonSchema, generate::SchemaSettings};
use serde_json::{Value, json};

fn schema<T: JsonSchema>() -> Value {
    SchemaSettings::draft2020_12()
        .with(|settings| settings.inline_subschemas = true)
        .into_generator()
        .into_root_schema_for::<T>()
        .to_value()
}

fn descriptor(id: &str, mut input: Value, read: bool) -> OperationDescriptor {
    let properties = input["properties"].as_object_mut().unwrap();
    properties.remove("type");
    if let Some(required) = input.get_mut("required").and_then(Value::as_array_mut) {
        required.retain(|key| key != "type");
    }
    let arguments = input["properties"]
        .as_object()
        .unwrap()
        .iter()
        .map(|(field, schema)| OperationArgument {
            flag: if field == "expected_version" {
                "if-version".into()
            } else {
                field
                    .chars()
                    .flat_map(|c| {
                        if c.is_ascii_uppercase() {
                            vec!['-', c.to_ascii_lowercase()]
                        } else {
                            vec![if c == '_' { '-' } else { c }]
                        }
                    })
                    .collect()
            },
            field: field.clone(),
            description: schema
                .get("description")
                .and_then(Value::as_str)
                .unwrap_or(field)
                .into(),
            required: input["required"]
                .as_array()
                .is_some_and(|r| r.iter().any(|k| k == field)),
            json: schema.get("type").and_then(Value::as_str) != Some("string"),
        })
        .collect();
    OperationDescriptor {
        plugin_id: "tasks".into(),
        id: id.into(),
        version: 1,
        description: format!("{id} a saved Task using admitted native services"),
        permission: format!("tasks:{}", if read { "read" } else { "write" }),
        effect: if read {
            ContentEffect::ReadOnly
        } else {
            ContentEffect::Write
        },
        input_schema: input,
        output_schema: json!({"type":"object"}),
        help: OperationHelp {
            command: vec!["tasks".into(), id.into()],
            summary: format!("Tasks {id}"),
            markdown: include_str!("../help/tasks.md").into(),
            examples: vec![format!(
                "lapis --target https://notes.example --token-file token tasks {id} --help"
            )],
            keywords: vec![
                "tasks".into(),
                "automation".into(),
                if read { "read".into() } else { "write".into() },
            ],
            arguments,
        },
    }
}

pub fn descriptors() -> Vec<OperationDescriptor> {
    let mut descriptors = vec![
        descriptor(
            "list",
            json!({"type":"object","properties":{"view":{"type":"string"},"today":{"type":"string"},"limit":{"type":"integer","minimum":1,"maximum":100}},"additionalProperties":false}),
            true,
        ),
        descriptor(
            "get",
            json!({"type":"object","properties":{"path":{"type":"string"}},"required":["path"],"additionalProperties":false}),
            true,
        ),
    ];
    for schema in [
        schema::<NativeTaskMutation>(),
        schema::<NativeTaskLifecycleAction>(),
    ] {
        for mut variant in schema["oneOf"]
            .as_array()
            .expect("Task action schema")
            .clone()
        {
            let id = variant["properties"]["type"]["const"]
                .as_str()
                .unwrap()
                .to_owned();
            variant["properties"]["path"] =
                json!({"type":"string","description":"Vault-relative saved Task path"});
            variant["properties"]["expected_version"] =
                json!({"type":"string","description":"Version returned by tasks get"});
            let required = variant["required"].as_array_mut().unwrap();
            required.extend([json!("path"), json!("expected_version")]);
            descriptors.push(descriptor(&id, variant, false));
        }
    }
    for id in ["inspect", "retry"] {
        descriptors.push(descriptor(id,json!({"type":"object","properties":{"request_id":{"type":"string","format":"uuid"}},"required":["request_id"],"additionalProperties":false}),id=="inspect"));
    }
    descriptors
}
