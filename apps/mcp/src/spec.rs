use anyhow::{Context, Result};
use rmcp_openapi::spec::{Filter, Filters};
use serde_json::Value;

/// The spec this binary serves, embedded at build time so the tool list always
/// matches the commit the server was built from. Regenerate it from the API with
/// `bun run --cwd apps/api openapi:export`.
pub const OPENAPI_YAML: &str = include_str!("../../../internal-docs/api/openapi.yaml");

const HTTP_METHODS: [&str; 8] = [
    "get", "put", "post", "delete", "options", "head", "patch", "trace",
];

/// Parses the embedded YAML spec into the JSON value rmcp-openapi consumes.
pub fn load() -> Result<Value> {
    serde_yaml_ng::from_str(OPENAPI_YAML)
        .context("internal-docs/api/openapi.yaml is not valid YAML")
}

/// Operation ids marked `x-wire-mcp: { exclude: true }` in the spec, via the
/// API's `@ExcludeFromMcp()` decorator, sorted for stable output.
pub fn excluded_operation_ids(spec: &Value) -> Vec<String> {
    let Some(paths) = spec.get("paths").and_then(Value::as_object) else {
        return Vec::new();
    };

    let mut ids: Vec<String> = paths
        .values()
        .filter_map(Value::as_object)
        .flat_map(|item| HTTP_METHODS.iter().filter_map(|method| item.get(*method)))
        .filter(|operation| {
            operation
                .pointer("/x-wire-mcp/exclude")
                .and_then(Value::as_bool)
                .unwrap_or(false)
        })
        .filter_map(|operation| operation.get("operationId")?.as_str().map(String::from))
        .collect();
    ids.sort();
    ids
}

pub fn filters(spec: &Value) -> Filters {
    Filters {
        tags: None,
        methods: None,
        operations_id: Some(Filter::Exclude(excluded_operation_ids(spec))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn embedded_spec_parses() {
        let spec = load().unwrap();
        assert!(spec.get("paths").is_some_and(Value::is_object));
    }

    #[test]
    fn collects_only_excluded_operations() {
        let spec = json!({
            "paths": {
                "/a": {
                    "get": { "operationId": "keep_me" },
                    "post": { "operationId": "drop_me", "x-wire-mcp": { "exclude": true } },
                    "parameters": []
                },
                "/b": {
                    "delete": { "operationId": "also_kept", "x-wire-mcp": { "exclude": false } }
                }
            }
        });
        assert_eq!(excluded_operation_ids(&spec), vec!["drop_me".to_string()]);
    }
}
