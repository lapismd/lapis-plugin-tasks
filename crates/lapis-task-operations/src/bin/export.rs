fn main() {
    println!(
        "{}",
        serde_json::to_string_pretty(&lapis_task_operations::descriptors()).unwrap()
    );
}
