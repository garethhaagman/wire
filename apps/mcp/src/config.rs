use std::net::SocketAddr;

use anyhow::{Context, Result, bail};
use url::Url;

const DEFAULT_API_URL: &str = "http://localhost:3001";
const DEFAULT_HTTP_BIND: &str = "127.0.0.1:3002";
const DEFAULT_SESSION_COOKIE: &str = "better-auth.session_token";

#[derive(Debug, Clone)]
pub enum Transport {
    Stdio,
    Http { bind: SocketAddr },
}

#[derive(Clone)]
pub enum Credentials {
    /// A Better Auth session cookie value, e.g. copied from a signed-in browser.
    SessionToken { cookie_name: String, token: String },
    /// Signs in at startup through Better Auth's email/password endpoint.
    Password { email: String, password: String },
}

#[derive(Clone)]
pub struct Config {
    pub api_url: Url,
    pub credentials: Credentials,
    pub workspace_id: Option<String>,
    pub transport: Transport,
}

impl Config {
    /// Reads `WIRE_*` variables, see apps/mcp/.env.example for the full list.
    pub fn from_env() -> Result<Self> {
        let api_url =
            parse_api_url(&var("WIRE_API_URL").unwrap_or_else(|| DEFAULT_API_URL.into()))?;

        let credentials = match (
            var("WIRE_SESSION_TOKEN"),
            var("WIRE_EMAIL"),
            var("WIRE_PASSWORD"),
        ) {
            (Some(token), _, _) => Credentials::SessionToken {
                cookie_name: var("WIRE_SESSION_COOKIE")
                    .unwrap_or_else(|| DEFAULT_SESSION_COOKIE.into()),
                token,
            },
            (None, Some(email), Some(password)) => Credentials::Password { email, password },
            _ => bail!(
                "set WIRE_SESSION_TOKEN, or WIRE_EMAIL and WIRE_PASSWORD, so the server can call the API"
            ),
        };

        let transport = match var("WIRE_MCP_TRANSPORT").as_deref().unwrap_or("stdio") {
            "stdio" => Transport::Stdio,
            "http" => {
                let bind = var("WIRE_MCP_BIND").unwrap_or_else(|| DEFAULT_HTTP_BIND.into());
                Transport::Http {
                    bind: bind
                        .parse()
                        .with_context(|| format!("WIRE_MCP_BIND {bind:?} is not host:port"))?,
                }
            }
            other => bail!("WIRE_MCP_TRANSPORT must be \"stdio\" or \"http\", got {other:?}"),
        };

        Ok(Self {
            api_url,
            credentials,
            workspace_id: var("WIRE_WORKSPACE_ID"),
            transport,
        })
    }
}

fn var(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .filter(|value| !value.trim().is_empty())
}

/// Spec paths already start with `/v1`, so the base is the API origin plus any
/// mount prefix. The trailing slash makes `Url::join` append instead of
/// replacing the last path segment.
pub fn parse_api_url(raw: &str) -> Result<Url> {
    let mut url = Url::parse(raw).with_context(|| format!("WIRE_API_URL {raw:?} is not a URL"))?;
    if !url.path().ends_with('/') {
        let path = format!("{}/", url.path());
        url.set_path(&path);
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_url_gets_a_trailing_slash() {
        assert_eq!(
            parse_api_url("http://localhost:3001").unwrap().as_str(),
            "http://localhost:3001/"
        );
        assert_eq!(
            parse_api_url("https://wire.example/api").unwrap().as_str(),
            "https://wire.example/api/"
        );
    }
}
