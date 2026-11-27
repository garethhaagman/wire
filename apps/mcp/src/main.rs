use std::{path::PathBuf, sync::Arc};

use actix_web::{App, HttpServer, web};
use anyhow::{Context, Result, bail};
use rmcp::{ServiceExt, transport::streamable_http_server::session::local::LocalSessionManager};
use rmcp_actix_web::transport::StreamableHttpService;
use tracing::info;
use tracing_subscriber::EnvFilter;
use wire_mcp::{
    build_server,
    config::{Config, Transport},
    handler::WireMcp,
    session, tools_snapshot,
};

const SNAPSHOT_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tools.snapshot.json");

const USAGE: &str = "usage: wire-mcp [serve|generate|check]

  serve     run the MCP server (default); configure with WIRE_* env vars
  generate  rewrite tools.snapshot.json from the embedded OpenAPI spec
  check     exit non-zero if tools.snapshot.json is out of date";

#[actix_web::main]
async fn main() -> Result<()> {
    // Logs go to stderr: on the stdio transport, stdout carries the MCP protocol.
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    match std::env::args().nth(1).as_deref() {
        None | Some("serve") => serve().await,
        Some("generate") => generate(),
        Some("check") => check(),
        Some("-h" | "--help" | "help") => {
            println!("{USAGE}");
            Ok(())
        }
        Some(other) => bail!("unknown command {other:?}\n\n{USAGE}"),
    }
}

async fn serve() -> Result<()> {
    let _ = dotenvy::dotenv();
    let config = Config::from_env()?;

    let headers = session::cookie_header(&config.api_url, &config.credentials).await?;
    let server = build_server(config.api_url.clone(), Some(headers))?;
    info!(tools = server.tool_count(), api_url = %config.api_url, "loaded Wire tools");

    let handler = WireMcp::new(server, config.workspace_id);

    match config.transport {
        Transport::Stdio => {
            info!("serving MCP over stdio");
            handler
                .serve(rmcp::transport::stdio())
                .await
                .context("MCP stdio session failed to start")?
                .waiting()
                .await?;
        }
        Transport::Http { bind } => {
            let service = StreamableHttpService::builder()
                .service_factory(Arc::new(move || Ok(handler.clone())))
                .session_manager(LocalSessionManager::default().into())
                .stateful_mode(true)
                .build();

            info!("serving MCP over streamable HTTP at http://{bind}/mcp");
            HttpServer::new(move || {
                App::new().service(web::scope("/mcp").service(service.clone().scope()))
            })
            .bind(bind)
            .with_context(|| format!("could not bind {bind}"))?
            .run()
            .await?;
        }
    }
    Ok(())
}

fn generate() -> Result<()> {
    std::fs::write(SNAPSHOT_PATH, tools_snapshot()?)
        .with_context(|| format!("could not write {SNAPSHOT_PATH}"))?;
    println!("wrote {}", PathBuf::from(SNAPSHOT_PATH).display());
    Ok(())
}

fn check() -> Result<()> {
    let committed = std::fs::read_to_string(SNAPSHOT_PATH).unwrap_or_default();
    if committed != tools_snapshot()? {
        bail!(
            "tools.snapshot.json is out of date with internal-docs/api/openapi.yaml; run `make mcp-generate`"
        );
    }
    println!("tools.snapshot.json matches the OpenAPI spec");
    Ok(())
}
