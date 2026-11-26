use rmcp_openapi::ResponseTransformer;
use serde_json::{Value, json};

/// Rewrites each tool's output schema to describe the response the API actually
/// sends. The spec documents the bare resource (`MessageDto`, `ChannelDto[]`),
/// but the API's ResponseEnvelopeInterceptor wraps every body in
/// `{ success, data, error, meta }`. Without this, rmcp-openapi's generated
/// schema (`body: oneOf[resource, generic error]`) matches neither branch and
/// MCP clients that validate `structuredContent` reject every result.
///
/// Responses pass through untouched: `meta` carries the pagination cursor an
/// agent needs to fetch the next page.
pub struct WireEnvelope;

impl ResponseTransformer for WireEnvelope {
    fn transform_response(&self, response: Value) -> Value {
        response
    }

    fn transform_schema(&self, mut schema: Value) -> Value {
        if let Some(body) = schema.pointer_mut("/properties/body") {
            let mut resource = body
                .pointer("/oneOf/0")
                .cloned()
                .unwrap_or_else(|| json!({}));
            allow_null(&mut resource);
            *body = envelope_schema(resource);
        }
        schema
    }
}

/// Keywords whose values are data, not subschemas, so a `"type"` key inside them
/// is an example field and must stay as is.
const DATA_KEYWORDS: [&str; 5] = ["example", "examples", "default", "const", "enum"];

/// Lets every typed node in a schema also be `null`. rmcp-openapi drops
/// OpenAPI 3.0's `nullable: true`, and several DTOs return null for fields they
/// never mark nullable (`deletedAt`, `editedAt`), so the strict types would make
/// clients reject real responses. Field names, shapes and descriptions survive.
fn allow_null(schema: &mut Value) {
    match schema {
        Value::Object(map) => {
            if let Some(Value::String(kind)) = map.get("type")
                && kind != "null"
            {
                let kind = kind.clone();
                map.insert("type".into(), json!([kind, "null"]));
            }
            for (key, child) in map.iter_mut() {
                if !DATA_KEYWORDS.contains(&key.as_str()) {
                    allow_null(child);
                }
            }
        }
        Value::Array(items) => items.iter_mut().for_each(allow_null),
        _ => {}
    }
}

fn envelope_schema(resource: Value) -> Value {
    json!({
        "type": "object",
        "description": "Wire response envelope. On success `data` holds the result and `meta.pagination` or `meta.cursor` carries paging; on failure `error` describes the problem.",
        "required": ["success"],
        "properties": {
            "success": { "type": "boolean" },
            "data": { "anyOf": [resource, { "type": "null" }] },
            "error": { "anyOf": [{ "type": "object" }, { "type": "null" }] },
            "meta": { "type": "object" }
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wraps_the_success_branch_in_the_envelope() {
        let generated = json!({
            "type": "object",
            "properties": {
                "status": { "type": "integer" },
                "body": { "oneOf": [{ "type": "array" }, { "type": "object", "title": "error" }] }
            }
        });

        let schema = WireEnvelope.transform_schema(generated);
        let body = &schema["properties"]["body"];

        assert_eq!(body["required"], json!(["success"]));
        assert_eq!(
            body["properties"]["data"]["anyOf"],
            json!([{ "type": ["array", "null"] }, { "type": "null" }])
        );
        assert!(body.get("oneOf").is_none());
        assert_eq!(schema["properties"]["status"], json!({ "type": "integer" }));
    }

    #[test]
    fn nested_fields_accept_null_but_examples_are_untouched() {
        let mut schema = json!({
            "type": "object",
            "properties": {
                "deletedAt": { "type": "string" },
                "tags": { "type": "array", "items": { "type": "string" } },
                "kind": { "type": "string", "example": { "type": "message.created" } }
            }
        });

        allow_null(&mut schema);

        assert_eq!(
            schema["properties"]["deletedAt"]["type"],
            json!(["string", "null"])
        );
        assert_eq!(
            schema["properties"]["tags"]["items"]["type"],
            json!(["string", "null"])
        );
        assert_eq!(
            schema["properties"]["kind"]["example"],
            json!({ "type": "message.created" })
        );
    }

    #[test]
    fn leaves_schemas_without_a_body_alone() {
        let schema = json!({ "type": "object" });
        assert_eq!(WireEnvelope.transform_schema(schema.clone()), schema);
    }
}
