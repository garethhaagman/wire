//! Wire's MCP server. Every tool comes from an operation in
//! `internal-docs/api/openapi.yaml`, turned into an MCP tool by rmcp-openapi:
//! the tool name is the operation's `operationId`, the description is its
//! summary, and the input schema is its parameters and request body. Nothing
//! here defines tools by hand. To add or change a tool, change the API
//! controller and re-export the spec.

pub mod config;
pub mod envelope;
pub mod handler;
pub mod session;
pub mod spec;

use std::sync::Arc;

use anyhow::{Context, Result};
use reqwest::header::HeaderMap;
use rmcp_openapi::Server;
use url::Url;

use crate::envelope::WireEnvelope;

const INSTRUCTIONS: &str = "Wire is a team chat workspace. These tools call the Wire REST API as the \
configured user. Most tools are scoped to a workspace: call list_workspaces to find one, then pass its \
id as workspaceId. Use list_channels to find a channel id, get_channel_history to read messages and \
post_message to send one; reply_in_thread answers within a thread. Every result is a Wire envelope \
{ success, data, error, meta }: read data on success, and follow meta.cursor.next_cursor or \
meta.pagination to page through long lists.";

/// Builds the rmcp-openapi server for the embedded spec.
pub fn build_server(api_url: Url, default_headers: Option<HeaderMap>) -> Result<Server> {
    let openapi = spec::load()?;
    let filters = spec::filters(&openapi);

    let mut server = Server::builder()
        .openapi_spec(openapi)
        .base_url(api_url)
        .maybe_default_headers(default_headers)
        .filters(filters)
        .name("wire".to_string())
        .title("Wire".to_string())
        .version(env!("CARGO_PKG_VERSION").to_string())
        .instructions(INSTRUCTIONS.to_string())
        .response_transformer(Arc::new(WireEnvelope))
        .build();

    server
        .load_openapi_spec()
        .context("could not build MCP tools from the OpenAPI spec")?;
    server
        .validate_registry()
        .context("the OpenAPI spec produced no MCP tools")?;
    Ok(server)
}

/// The tool list this build serves, as pretty JSON sorted by tool name. It is
/// committed as `apps/mcp/tools.snapshot.json` so reviewers see exactly how an
/// API change alters what agents can do, and CI fails when the two drift.
pub fn tools_snapshot() -> Result<String> {
    let placeholder = Url::parse("http://localhost/").context("placeholder URL")?;
    let server = build_server(placeholder, None)?;

    let mut tools = server.tool_collection.to_mcp_tools();
    tools.sort_by(|a, b| a.name.cmp(&b.name));

    let mut json = serde_json::to_string_pretty(&tools)?;
    json.push('\n');
    Ok(json)
}
