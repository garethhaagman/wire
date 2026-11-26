use std::time::Duration;

use anyhow::{Context, Result, bail};
use reqwest::header::{COOKIE, HeaderMap, HeaderValue, SET_COOKIE};
use serde_json::json;
use tracing::{info, warn};
use url::Url;

use crate::config::Credentials;

const SESSION_COOKIE_SUFFIX: &str = "better-auth.session_token";
const STARTUP_RETRY_INTERVAL: Duration = Duration::from_secs(2);
const STARTUP_RETRY_ATTEMPTS: u32 = 90;

/// Resolves the `Cookie` header every tool call sends. The API authenticates
/// only through Better Auth session cookies, so either reuse a provided token or
/// sign in once at startup.
pub async fn cookie_header(api_url: &Url, credentials: &Credentials) -> Result<HeaderMap> {
    let cookie = match credentials {
        Credentials::SessionToken { cookie_name, token } => format!("{cookie_name}={token}"),
        Credentials::Password { email, password } => {
            sign_in_with_retry(api_url, email, password).await?
        }
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        COOKIE,
        HeaderValue::from_str(&cookie).context("session cookie is not a valid header value")?,
    );
    Ok(headers)
}

/// `make dev` starts the API and this server together, so the API may not be
/// listening yet. Connection failures are retried; a rejected sign-in is not.
async fn sign_in_with_retry(api_url: &Url, email: &str, password: &str) -> Result<String> {
    let client = reqwest::Client::new();
    for attempt in 1..=STARTUP_RETRY_ATTEMPTS {
        match sign_in(&client, api_url, email, password).await {
            Ok(cookie) => {
                info!(email, "signed in to the Wire API");
                return Ok(cookie);
            }
            Err(SignInError::Unreachable(err)) if attempt < STARTUP_RETRY_ATTEMPTS => {
                if attempt == 1 {
                    warn!(api_url = %api_url, error = %err, "Wire API not reachable yet, retrying");
                }
                tokio::time::sleep(STARTUP_RETRY_INTERVAL).await;
            }
            Err(SignInError::Unreachable(err)) => {
                return Err(err)
                    .with_context(|| format!("Wire API at {api_url} never became reachable"));
            }
            Err(SignInError::Rejected(err)) => return Err(err),
        }
    }
    unreachable!("the final attempt always returns")
}

enum SignInError {
    Unreachable(anyhow::Error),
    Rejected(anyhow::Error),
}

async fn sign_in(
    client: &reqwest::Client,
    api_url: &Url,
    email: &str,
    password: &str,
) -> Result<String, SignInError> {
    let url = api_url
        .join("api/auth/sign-in/email")
        .map_err(|err| SignInError::Rejected(err.into()))?;

    let response = client
        .post(url)
        .json(&json!({ "email": email, "password": password }))
        .send()
        .await
        .map_err(|err| SignInError::Unreachable(err.into()))?;

    let status = response.status();
    if status.is_server_error() {
        return Err(SignInError::Unreachable(anyhow::anyhow!(
            "sign-in returned {status}"
        )));
    }
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(SignInError::Rejected(anyhow::anyhow!(
            "sign-in as {email} failed with {status}: {body}"
        )));
    }

    session_cookie(response.headers()).map_err(SignInError::Rejected)
}

/// Picks the session cookie out of the sign-in response. Behind HTTPS Better Auth
/// prefixes the name with `__Secure-`, hence the suffix match.
fn session_cookie(headers: &HeaderMap) -> Result<String> {
    for value in headers.get_all(SET_COOKIE) {
        let Ok(value) = value.to_str() else { continue };
        let pair = value.split(';').next().unwrap_or_default().trim();
        if let Some((name, _)) = pair.split_once('=')
            && name.ends_with(SESSION_COOKIE_SUFFIX)
        {
            return Ok(pair.to_string());
        }
    }
    bail!("sign-in succeeded but the response set no {SESSION_COOKIE_SUFFIX} cookie")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_the_session_cookie_pair() {
        let mut headers = HeaderMap::new();
        headers.append(
            SET_COOKIE,
            HeaderValue::from_static("better-auth.session_data=abc; Path=/"),
        );
        headers.append(
            SET_COOKIE,
            HeaderValue::from_static(
                "__Secure-better-auth.session_token=tok.sig; Path=/; HttpOnly",
            ),
        );
        assert_eq!(
            session_cookie(&headers).unwrap(),
            "__Secure-better-auth.session_token=tok.sig"
        );
    }

    #[test]
    fn errors_without_a_session_cookie() {
        assert!(session_cookie(&HeaderMap::new()).is_err());
    }
}
