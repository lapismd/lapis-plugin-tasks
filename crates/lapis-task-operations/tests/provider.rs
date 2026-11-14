use lapis_app_core::{
    embedding::host::NativeEmbeddingHost,
    services::{
        DatabaseStorage, Runtime, TaskStorage,
        content::{ContentGrants, ContentVault},
        plugin_operations::OperationRegistry,
    },
};
use lapis_app_protocol::{native_tasks::*, operations::*};
use lapis_task_operations::TaskOperations;
use serde_json::json;
use std::{sync::Arc, time::Duration};
use uuid::Uuid;

#[test]
fn every_task_operation_registers_with_valid_schemas_and_help() {
    let mut registry = OperationRegistry::default();
    registry.register(Arc::new(TaskOperations)).unwrap();
    assert_eq!(
        registry
            .snapshot(&["tasks:read".into(), "tasks:write".into()])
            .unwrap()
            .len(),
        17
    );
    assert_eq!(lapis_task_operations::descriptors().len(), 17);
}

#[tokio::test(flavor = "multi_thread")]
async fn guarded_tasks_use_shared_admission_without_renderer() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path().join("vault");
    let profile = temp.path().join("profile");
    std::fs::create_dir_all(&root).unwrap();
    std::fs::create_dir_all(profile.join("tasks")).unwrap();
    std::fs::write(root.join("Task.md"),"---\ntype: task\nid: test\ntask:\n  status: open\n  inbox: false\n  start: anytime\n---\n\n# Test\n").unwrap();
    let runtime = Runtime::with_database(
        DatabaseStorage::new(&profile, NativeEmbeddingHost::default()).unwrap(),
    )
    .with_tasks(TaskStorage::new(&profile.join("tasks")).unwrap());
    let id = Uuid::new_v4();
    let owner = runtime.admit(id, &root).unwrap();
    let client = owner.attach().unwrap();
    let configuration = serde_json::from_value(json!({"day_parts":{"afternoonStartsAt":"12:00","eveningStartsAt":"17:00"},"daily":{"folder":"daily","date_format":"yyyy-LL-dd"},"format":{"locale":"en-US","firstDay":7,"minimalDays":4},"provider":{"kind":"default"}})).unwrap();
    client
        .control_tasks(NativeTaskCommand::Configure { configuration })
        .await
        .unwrap();
    let mut registry = OperationRegistry::default();
    registry.register(Arc::new(TaskOperations)).unwrap();
    let grants = Arc::new(ContentGrants::with_operations(Arc::new(registry)));
    grants.set_enabled(true).unwrap();
    let grant = grants
        .issue_named_operations(
            "Tasks",
            vec![ContentVault {
                name: "test".into(),
                client: owner.attach().unwrap(),
            }],
            Duration::from_secs(60),
            &["tasks:read".into(), "tasks:write".into()],
        )
        .unwrap();
    let before = client.read_text("Task.md").unwrap();
    let task = tokio::task::spawn_blocking(move || {
        let bearer = grant.token.expose_secret();
        let request = |input| OperationRequest {
            protocol_version: 1,
            request_id: Uuid::new_v4(),
            version: 1,
            input,
        };
        assert_eq!(
            grants
                .operation_catalog(bearer, id)
                .unwrap()
                .operations
                .len(),
            17
        );
        assert!(matches!(
            grants
                .invoke_operation(
                    bearer,
                    id,
                    "tasks",
                    "get",
                    request(json!({"path":"Task.md"}))
                )
                .outcome,
            OperationOutcome::Ok { .. }
        ));
        let mutation = request(
            json!({"path":"Task.md","expected_version":before.version,"at":"2026-08-20T10:00:00Z"}),
        );
        assert!(matches!(
            grants
                .invoke_operation(bearer, id, "tasks", "cancel", mutation.clone())
                .outcome,
            OperationOutcome::Ok { .. }
        ));
        assert!(matches!(
            grants
                .invoke_operation(bearer, id, "tasks", "cancel", mutation)
                .outcome,
            OperationOutcome::Error { .. }
        ));
        grants.shutdown().unwrap();
    });
    task.await.unwrap();
    tokio::task::spawn_blocking(move || runtime.shutdown())
        .await
        .unwrap()
        .unwrap();
}
