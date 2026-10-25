use lapis_task_services::{TaskMutation, apply_task_mutation};

#[test]
fn task_mutations_are_available_as_pure_values() {
    let result = apply_task_mutation(
        "ordinary",
        "ordinary.md",
        &TaskMutation::Cancel {
            at: "explicit".into(),
        },
    );
    assert_eq!(
        result.unwrap_err().message,
        "Not a task document: ordinary.md"
    );
}
