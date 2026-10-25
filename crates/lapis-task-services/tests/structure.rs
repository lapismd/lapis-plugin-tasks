use lapis_task_services::{
    TaskStructureOptions, TaskStructureTarget, parse_task_document,
    resolve_task_document_structure, scan_task_headings, scan_task_structure,
    task_structure_for_projection,
};
use serde_json::{Value, json};

#[test]
fn matches_complete_retained_typescript_per_document_structures() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/structure-inputs.json")).unwrap();
    for fixture in fixtures {
        let options: TaskStructureOptions =
            serde_json::from_value(fixture["options"].clone()).unwrap();
        let raw = fixture["raw"].as_str().unwrap();
        let mut requests = Vec::new();
        let mut actual = json!({
            "headings": scan_task_headings(raw),
            "scanned": scan_task_structure(raw, &options),
        });
        if fixture["resolve"] == true {
            let resolved = resolve_task_document_structure(
                raw,
                &options,
                |source_path: &str, href: &str| -> Result<Option<TaskStructureTarget>, Value> {
                    requests.push(json!({"sourcePath": source_path, "href": href}));
                    if fixture["lookupError"]["href"] == href {
                        return Err(fixture["lookupError"]["error"].clone());
                    }
                    Ok(fixture["targets"]
                        .get(href)
                        .map(|target| serde_json::from_value(target.clone()).unwrap()))
                },
            );
            match resolved {
                Ok(resolved) => {
                    actual["projected"] =
                        serde_json::to_value(task_structure_for_projection(&resolved)).unwrap();
                    actual["resolved"] = serde_json::to_value(resolved).unwrap();
                }
                Err(error) => actual["error"] = error,
            }
        }
        actual["requests"] = json!(requests);
        assert_eq!(actual, fixture["expected"], "{}", fixture["name"]);
    }
}

#[test]
fn retains_complete_document_outputs_for_structure_adapter_regressions() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/structure-document-inputs.json")).unwrap();
    for fixture in fixtures {
        let actual = parse_task_document(
            fixture["raw"].as_str().unwrap(),
            fixture["path"].as_str().unwrap(),
        );
        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            fixture["expected"],
            "{}",
            fixture["name"]
        );
    }
}
