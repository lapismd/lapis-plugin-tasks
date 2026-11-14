//! Tasks-owned operation definitions and native service adapter.
mod catalog;
use lapis_app_core::services::{
    Client,
    plugin_operations::{OperationProvider, failure},
};
use lapis_app_protocol::{content::*, database::call::*, native_tasks::*, operations::*};
use serde_json::{Value, json};

pub struct TaskOperations;
pub use catalog::descriptors;

fn native(error: lapis_app_core::services::Error) -> ContentError {
    use lapis_app_protocol::ErrorCode;
    failure(
        match error.0.code {
            ErrorCode::Conflict => ContentErrorCode::Conflict,
            ErrorCode::NotFound => ContentErrorCode::NotFound,
            ErrorCode::PermissionDenied => ContentErrorCode::PermissionDenied,
            ErrorCode::InvalidRequest => ContentErrorCode::InvalidRequest,
            ErrorCode::Busy => ContentErrorCode::Busy,
            ErrorCode::Unsupported => ContentErrorCode::Unsupported,
            _ => ContentErrorCode::Unavailable,
        },
        &error.0.message,
    )
}

impl OperationProvider for TaskOperations {
    fn descriptors(&self) -> Vec<OperationDescriptor> {
        descriptors()
    }
    fn available(&self, client: &Client) -> Result<bool, ContentError> {
        let value = tokio::runtime::Handle::current()
            .block_on(client.control_tasks(NativeTaskCommand::Status {}))
            .map_err(native)?;
        Ok(matches!(value, NativeTaskValue::Status {status} if status.enabled))
    }
    fn invoke(
        &self,
        client: &Client,
        id: &str,
        request: &OperationRequest,
    ) -> Result<Value, ContentError> {
        let mut input = request.input.clone();
        if id == "get" {
            let path = input["path"]
                .as_str()
                .ok_or_else(|| failure(ContentErrorCode::InvalidRequest, "Task path required"))?;
            let snapshot = client.read_text(path).map_err(native)?;
            let task = lapis_task_services::parse_task_document(&snapshot.text, path).ok_or_else(
                || failure(ContentErrorCode::NotFound, "Saved document is not a Task"),
            )?;
            return Ok(json!({"snapshot":snapshot,"task":task}));
        }
        if id == "list" {
            let limit = input.get("limit").and_then(Value::as_u64).unwrap_or(50);
            input["limit"] = json!(limit + 1);
            let call = DatabaseCall {
                method: DatabaseMethod::QueryTasks,
                args: vec![DatabaseValue::Value { value: input }],
            };
            let value = tokio::runtime::Handle::current()
                .block_on(client.call_database(call))
                .map_err(native)?;
            let DatabaseValue::Value { value: mut items } = value else {
                return Err(failure(
                    ContentErrorCode::Unavailable,
                    "Task query unavailable",
                ));
            };
            let rows = items.as_array_mut().ok_or_else(|| {
                failure(ContentErrorCode::Unavailable, "Invalid Task query result")
            })?;
            let truncated = rows.len() > limit as usize;
            rows.truncate(limit as usize);
            return Ok(
                json!({"items":items, "truncated":truncated, "freshness":{"source":"projection","authoritative":false}}),
            );
        }
        let command = match id {
            "complete" | "skip" => {
                let path = input["path"].take();
                let version = input["expected_version"].take();
                input.as_object_mut().unwrap().remove("path");
                input.as_object_mut().unwrap().remove("expected_version");
                input["type"] = json!(id);
                json!({"kind":"submit","request":{"request_id":request.request_id,"path":path,"expected_version":version,"action":input}})
            }
            "inspect" | "retry" => json!({"kind":id,"request_id":input["request_id"]}),
            action => {
                let path = input["path"].take();
                let version = input["expected_version"].take();
                input.as_object_mut().unwrap().remove("path");
                input.as_object_mut().unwrap().remove("expected_version");
                input["type"] = json!(action);
                json!({"kind":"mutate","path":path,"expected_version":version,"mutation":input})
            }
        };
        let command = serde_json::from_value(command).map_err(|_| {
            failure(
                ContentErrorCode::InvalidRequest,
                "Invalid typed Task action",
            )
        })?;
        let value = tokio::runtime::Handle::current()
            .block_on(client.control_tasks(command))
            .map_err(native)?;
        match value {
            NativeTaskValue::Failure { failure: detail } => Err(ContentError {
                code: if detail.uncertain {
                    ContentErrorCode::OutcomeUnknown
                } else {
                    ContentErrorCode::Conflict
                },
                message: format!(
                    "{}; inspect request {} before retrying",
                    detail.message,
                    detail
                        .request_id
                        .map(|id| id.to_string())
                        .unwrap_or_else(|| request.request_id.to_string())
                ),
                effect: if detail.uncertain {
                    ContentEffectStatus::Unknown
                } else {
                    ContentEffectStatus::NotStarted
                },
            }),
            NativeTaskValue::Operation { operation } => Ok(
                json!({"operation":operation.map(|op| json!({"request_id":op.request.request_id,"path":op.request.path,"disposition":op.disposition,"last_failure":op.last_failure}))}),
            ),
            value => serde_json::to_value(value).map_err(|_| {
                failure(
                    ContentErrorCode::OutcomeUnknown,
                    "Task result unavailable; inspect before retrying",
                )
            }),
        }
    }
}
