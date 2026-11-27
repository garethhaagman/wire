use std::collections::HashSet;

use serde_json::Value;
use wire_mcp::{spec, tools_snapshot};

const COMMITTED: &str = include_str!("../tools.snapshot.json");

#[test]
fn snapshot_matches_the_openapi_spec() {
    assert!(
        COMMITTED == tools_snapshot().unwrap(),
        "apps/mcp/tools.snapshot.json is out of date with internal-docs/api/openapi.yaml; run `make mcp-generate`"
    );
}

#[test]
fn operation_ids_are_unique() {
    let openapi = spec::load().unwrap();
    let mut seen = HashSet::new();
    for item in openapi["paths"].as_object().unwrap().values() {
        for operation in item.as_object().unwrap().values() {
            if let Some(id) = operation.get("operationId").and_then(Value::as_str) {
                assert!(seen.insert(id.to_string()), "duplicate operationId {id}");
            }
        }
    }
}

#[test]
fn excluded_operations_are_not_tools() {
    let openapi = spec::load().unwrap();
    let tools: Value = serde_json::from_str(COMMITTED).unwrap();
    let names: HashSet<&str> = tools
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|tool| tool["name"].as_str())
        .collect();

    let excluded = spec::excluded_operation_ids(&openapi);
    assert!(!excluded.is_empty());
    for id in excluded {
        assert!(
            !names.contains(id.as_str()),
            "{id} is marked @ExcludeFromMcp but is a tool"
        );
    }
}
