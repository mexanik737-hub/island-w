//! Cached daily currency reference rates from Frankfurter v2.
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

const ENDPOINT: &str = "https://api.frankfurter.dev/v2/rate";
const USER_AGENT: &str = "IslandW/0.1.0 (+https://github.com/mexanik737-hub/island-w)";
const CACHE_FOR: Duration = Duration::from_secs(12 * 60 * 60);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrencyRate {
    pub date: String,
    pub from: String,
    pub to: String,
    pub rate: f64,
}

#[derive(Debug, Clone, Deserialize)]
struct ApiRate {
    date: String,
    base: String,
    quote: String,
    rate: f64,
}

static CACHE: LazyLock<Mutex<HashMap<String, (Instant, CurrencyRate)>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn valid_code(code: &str) -> bool {
    code.len() == 3 && code.bytes().all(|byte| byte.is_ascii_alphabetic())
}
fn fetch(from: &str, to: &str) -> Result<CurrencyRate, String> {
    let from = from.trim().to_ascii_uppercase();
    let to = to.trim().to_ascii_uppercase();
    if !valid_code(&from) || !valid_code(&to) {
        return Err("Currency codes must be three letters, for example USD or EUR.".into());
    }
    if from == to {
        return Ok(CurrencyRate {
            date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
            from,
            to,
            rate: 1.0,
        });
    }
    let key = format!("{from}:{to}");
    if let Some((at, value)) = CACHE
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(&key)
        .cloned()
    {
        if at.elapsed() < CACHE_FOR {
            return Ok(value);
        }
    }
    let url = format!("{ENDPOINT}/{from}/{to}");
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(12)))
        .user_agent(USER_AGENT)
        .build()
        .into();
    let response: ApiRate = agent
        .get(&url)
        .call()
        .map_err(|error| format!("Could not fetch the currency rate: {error}"))?
        .body_mut()
        .read_json()
        .map_err(|error| format!("Could not read the currency rate: {error}"))?;
    if !response.rate.is_finite() || response.rate <= 0.0 {
        return Err("The currency service returned an invalid rate.".into());
    }
    let rate = CurrencyRate {
        date: response.date,
        from: response.base,
        to: response.quote,
        rate: response.rate,
    };
    CACHE
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .insert(key, (Instant::now(), rate.clone()));
    Ok(rate)
}

#[tauri::command]
pub async fn currency_rate(from: String, to: String) -> Result<CurrencyRate, String> {
    tauri::async_runtime::spawn_blocking(move || fetch(&from, &to))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_currency_codes_without_accepting_paths() {
        assert!(valid_code("USD"));
        assert!(valid_code("eur"));
        assert!(!valid_code("US"));
        assert!(!valid_code("../"));
        assert!(!valid_code("EURO"));
    }
}
