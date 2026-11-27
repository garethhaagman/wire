use std::sync::Arc;

use rmcp::{
    handler::server::ServerHandler,
    model::{
        CallToolRequestParams, CallToolResponse, ErrorData, InitializeResult, ListToolsResult,
        PaginatedRequestParams, Tool,
    },
    service::{RequestContext, RoleServer},
};
use rmcp_openapi::Server;
use serde_json::Value;

const WORKSPACE_PARAM: &str = "workspaceId";
const SERVER_DESCRIPTION: &str =
    "Read and post messages, manage channels and run agents in a Wire workspace.";

/// Delegates everything to the rmcp-openapi server, adding one convenience: when
/// `WIRE_WORKSPACE_ID` is configured, `workspaceId` becomes optional in every
/// tool's input schema and is filled in on calls that leave it out.
#[derive(Clone)]
pub struct WireMcp {
    inner: Server,
    default_workspace_id: Option<Arc<str>>,
}

impl WireMcp {
    pub fn new(inner: Server, default_workspace_id: Option<String>) -> Self {
        Self {
            inner,
            default_workspace_id: default_workspace_id.map(Into::into),
        }
    }
}

impl ServerHandler for WireMcp {
    /// rmcp-openapi copies the spec's `info.description` into `serverInfo`, and
    /// that text is a note for API maintainers, not for agents.
    fn get_info(&self) -> InitializeResult {
        let mut info = self.inner.get_info();
        info.server_info.description = Some(SERVER_DESCRIPTION.to_string());
        info
    }

    async fn list_tools(
        &self,
        request: Option<PaginatedRequestParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, ErrorData> {
        let mut result = self.inner.list_tools(request, context).await?;
        if let Some(workspace_id) = &self.default_workspace_id {
            for tool in &mut result.tools {
                make_workspace_optional(tool, workspace_id);
            }
        }
        Ok(result)
    }

    async fn call_tool(
        &self,
        mut request: CallToolRequestParams,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, ErrorData> {
        if let Some(workspace_id) = &self.default_workspace_id
            && self.takes_workspace(&request.name)
        {
            request
                .arguments
                .get_or_insert_default()
                .entry(WORKSPACE_PARAM)
                .or_insert_with(|| Value::String(workspace_id.to_string()));
        }
        self.inner.call_tool(request, context).await
    }
}

impl WireMcp {
    fn takes_workspace(&self, tool_name: &str) -> bool {
        self.inner
            .get_tool_metadata(tool_name)
            .and_then(|metadata| {
                metadata
                    .parameters
                    .pointer(&format!("/properties/{WORKSPACE_PARAM}"))
            })
            .is_some()
    }
}

fn make_workspace_optional(tool: &mut Tool, workspace_id: &str) {
    if tool
        .input_schema
        .get("properties")
        .and_then(|properties| properties.get(WORKSPACE_PARAM))
        .is_none()
    {
        return;
    }

    let schema = Arc::make_mut(&mut tool.input_schema);
    if let Some(Value::Array(required)) = schema.get_mut("required") {
        required.retain(|name| name != WORKSPACE_PARAM);
    }
    if let Some(Value::Object(property)) = schema
        .get_mut("properties")
        .and_then(|properties| properties.get_mut(WORKSPACE_PARAM))
    {
        property.insert(
            "description".into(),
            Value::String(format!(
                "Defaults to the configured workspace ({workspace_id})."
            )),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn tool(schema: Value) -> Tool {
        let Value::Object(map) = schema else {
            unreachable!()
        };
        Tool::new("t", "test tool", Arc::new(map))
    }

    #[test]
    fn workspace_param_becomes_optional() {
        let mut t = tool(json!({
            "type": "object",
            "properties": { "workspaceId": { "type": "string" }, "name": { "type": "string" } },
            "required": ["workspaceId", "name"]
        }));

        make_workspace_optional(&mut t, "ws_1");

        assert_eq!(t.input_schema["required"], json!(["name"]));
        assert_eq!(
            t.input_schema["properties"]["workspaceId"]["description"],
            json!("Defaults to the configured workspace (ws_1).")
        );
    }

    #[test]
    fn tools_without_the_param_are_unchanged() {
        let schema = json!({
            "type": "object",
            "properties": { "channelId": { "type": "string" } },
            "required": ["channelId"]
        });
        let mut t = tool(schema.clone());

        make_workspace_optional(&mut t, "ws_1");

        assert_eq!(Value::Object((*t.input_schema).clone()), schema);
    }
}
