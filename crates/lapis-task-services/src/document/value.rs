use serde_json::Value;

use super::records::{TaskDiagnostic, diagnostic};

pub(super) struct ParsedField {
    pub value: Option<Value>,
    pub unparsed: Option<Value>,
}

impl ParsedField {
    pub fn absent() -> Self {
        Self {
            value: None,
            unparsed: None,
        }
    }

    pub fn valid(value: Value) -> Self {
        Self {
            value: Some(value),
            unparsed: None,
        }
    }

    pub fn invalid(
        value: &Value,
        diagnostics: &mut Vec<TaskDiagnostic>,
        code: &str,
        field: &str,
        message: &str,
    ) -> Self {
        diagnostics.push(diagnostic(code, field, message));
        Self {
            value: None,
            unparsed: Some(value.clone()),
        }
    }
}
