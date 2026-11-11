//! User-selected weather forecasts. City search is explicit (never IP geolocation),
//! and both geocoding and forecasts are cached to respect the public services.

use std::collections::{BTreeMap, HashMap};
use std::sync::{LazyLock, Mutex};
use std::thread::sleep;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use serde_json::Value;

const USER_AGENT: &str = "IslandW/0.1.0 (+https://github.com/mexanik737-hub/island-w)";
const GEO_URL: &str = "https://nominatim.openstreetmap.org/search";
const FORECAST_URL: &str = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const CACHE_FOR: Duration = Duration::from_secs(30 * 60);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherHour {
    pub time: String,
    pub temperature: f64,
    pub symbol: String,
    pub precipitation: Option<f64>,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherDay {
    pub date: String,
    pub minimum: f64,
    pub maximum: f64,
    pub symbol: String,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeatherForecast {
    pub city: String,
    pub temperature: f64,
    pub humidity: Option<f64>,
    pub wind_speed: Option<f64>,
    pub precipitation: Option<f64>,
    pub symbol: String,
    pub updated_at: String,
    pub hours: Vec<WeatherHour>,
    pub days: Vec<WeatherDay>,
}

#[derive(Debug, Clone, Deserialize)]
struct GeocodeResult {
    display_name: String,
    lat: String,
    lon: String,
}
#[derive(Debug, Clone)]
struct City {
    label: String,
    lat: f64,
    lon: f64,
}

static GEO_CACHE: LazyLock<Mutex<HashMap<String, City>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static FORECAST_CACHE: LazyLock<Mutex<HashMap<String, (Instant, WeatherForecast)>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static LAST_GEOCODE: LazyLock<Mutex<Option<Instant>>> = LazyLock::new(|| Mutex::new(None));

fn agent() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(Duration::from_secs(12)))
        .user_agent(USER_AGENT)
        .build()
        .into()
}

fn city_label(display_name: &str) -> String {
    display_name
        .split(',')
        .take(2)
        .map(str::trim)
        .collect::<Vec<_>>()
        .join(", ")
}

fn geocode(query: &str) -> Result<City, String> {
    let key = query.trim().to_lowercase();
    if key.is_empty() {
        return Err("Enter a city or place name.".into());
    }
    if let Some(city) = GEO_CACHE.lock().unwrap_or_else(|e| e.into_inner()).get(&key).cloned() {
        return Ok(city);
    }

    // Nominatim's public instance asks applications to stay at or below
    // one request per second; this lock serializes requests from this process.
    {
        let mut previous = LAST_GEOCODE.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(at) = *previous {
            sleep(Duration::from_secs(1).saturating_sub(at.elapsed()));
        }
        *previous = Some(Instant::now());
    }

    let response: Vec<GeocodeResult> = agent()
        .get(GEO_URL)
        .query("format", "jsonv2")
        .query("limit", "1")
        .query("q", query.trim())
        .call()
        .map_err(|e| format!("Place search failed: {e}"))?
        .body_mut()
        .read_json()
        .map_err(|e| format!("Could not read place search results: {e}"))?;

    let found = response.into_iter().next().ok_or_else(|| "No matching place was found.".to_string())?;
    let lat: f64 = found.lat.parse().map_err(|_| "Invalid latitude in place result.".to_string())?;
    let lon: f64 = found.lon.parse().map_err(|_| "Invalid longitude in place result.".to_string())?;
    let city = City { label: city_label(&found.display_name), lat, lon };
    GEO_CACHE.lock().unwrap_or_else(|e| e.into_inner()).insert(key, city.clone());
    Ok(city)
}

fn number_at(value: &Value, path: &[&str]) -> Option<f64> {
    path.iter().try_fold(value, |node, key| node.get(*key))?.as_f64()
}
fn string_at(value: &Value, path: &[&str]) -> Option<String> {
    path.iter()
        .try_fold(value, |node, key| node.get(*key))?
        .as_str()
        .map(str::to_owned)
}
fn symbol_for(data: &Value) -> String {
    string_at(data, &["next_1_hours", "summary", "symbol_code"])
        .or_else(|| string_at(data, &["next_6_hours", "summary", "symbol_code"]))
        .or_else(|| string_at(data, &["next_12_hours", "summary", "symbol_code"]))
        .unwrap_or_else(|| "cloudy".into())
}
fn build_forecast(city: &City, document: &Value) -> Result<WeatherForecast, String> {
    let series = document
        .get("properties")
        .and_then(|p| p.get("timeseries"))
        .and_then(Value::as_array)
        .ok_or_else(|| "The weather service returned no forecast.".to_string())?;
    let current = series.first().ok_or_else(|| "The forecast is empty for this place.".to_string())?;
    let current_data = current.get("data").ok_or_else(|| "The current forecast is incomplete.".to_string())?;
    let temperature = number_at(current_data, &["instant", "details", "air_temperature"])
        .ok_or_else(|| "The weather service did not report a temperature.".to_string())?;
    let humidity = number_at(current_data, &["instant", "details", "relative_humidity"]);
    let wind_speed = number_at(current_data, &["instant", "details", "wind_speed"]);
    let precipitation = number_at(current_data, &["next_1_hours", "details", "precipitation_amount"])
        .or_else(|| number_at(current_data, &["next_6_hours", "details", "precipitation_amount"]));

    let hours = series.iter().take(12).filter_map(|step| {
        let data = step.get("data")?;
        Some(WeatherHour {
            time: step.get("time")?.as_str()?.to_owned(),
            temperature: number_at(data, &["instant", "details", "air_temperature"] )?,
            symbol: symbol_for(data),
            precipitation: number_at(data, &["next_1_hours", "details", "precipitation_amount"]),
        })
    }).collect::<Vec<_>>();

    let mut by_day: BTreeMap<String, (f64, f64, String)> = BTreeMap::new();
    for step in series {
        let Some(time) = step.get("time").and_then(Value::as_str) else { continue; };
        let date = time.split('T').next().unwrap_or(time).to_owned();
        let Some(data) = step.get("data") else { continue; };
        let Some(temp) = number_at(data, &["instant", "details", "air_temperature"]) else { continue; };
        let symbol = symbol_for(data);
        by_day.entry(date)
            .and_modify(|value| {
                value.0 = value.0.min(temp);
                value.1 = value.1.max(temp);
                if value.2 == "cloudy" { value.2 = symbol.clone(); }
            })
            .or_insert((temp, temp, symbol));
    }
    let days = by_day.into_iter().take(7).map(|(date, (minimum, maximum, symbol))| {
        WeatherDay { date, minimum, maximum, symbol }
    }).collect();

    Ok(WeatherForecast {
        city: city.label.clone(),
        temperature,
        humidity,
        wind_speed,
        precipitation,
        symbol: symbol_for(current_data),
        updated_at: string_at(document, &["properties", "meta", "updated_at"]).unwrap_or_default(),
        hours,
        days,
    })
}

fn fetch(place: &str) -> Result<WeatherForecast, String> {
    let city = geocode(place)?;
    let key = format!("{:.4},{:.4}", city.lat, city.lon);
    if let Some((at, forecast)) = FORECAST_CACHE.lock().unwrap_or_else(|e| e.into_inner()).get(&key).cloned() {
        if at.elapsed() < CACHE_FOR {
            return Ok(forecast);
        }
    }
    // Four decimals improve cache sharing while retaining street-level city accuracy.
    let lat = format!("{:.4}", city.lat);
    let lon = format!("{:.4}", city.lon);
    let document: Value = agent()
        .get(FORECAST_URL)
        .query("lat", lat)
        .query("lon", lon)
        .call()
        .map_err(|e| format!("Weather forecast request failed: {e}"))?
        .body_mut()
        .read_json()
        .map_err(|e| format!("Could not read the weather forecast: {e}"))?;
    let forecast = build_forecast(&city, &document)?;
    FORECAST_CACHE.lock().unwrap_or_else(|e| e.into_inner()).insert(key, (Instant::now(), forecast.clone()));
    Ok(forecast)
}

#[tauri::command]
pub async fn weather_forecast(place: String) -> Result<WeatherForecast, String> {
    tauri::async_runtime::spawn_blocking(move || fetch(&place))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn symbol_prefers_hourly_then_six_hour_summary() {
        let hourly = serde_json::json!({"next_1_hours":{"summary":{"symbol_code":"rain"}}});
        let six = serde_json::json!({"next_6_hours":{"summary":{"symbol_code":"snow"}}});
        assert_eq!(symbol_for(&hourly), "rain");
        assert_eq!(symbol_for(&six), "snow");
    }

    #[test]
    fn forecast_extracts_current_and_daily_values() {
        let city = City { label: "Helsinki".into(), lat: 60.17, lon: 24.94 };
        let document = serde_json::json!({
          "properties":{
            "meta":{"updated_at":"2026-11-11T12:00:00Z"},
            "timeseries":[
              {"time":"2026-11-11T12:00:00Z","data":{"instant":{"details":{"air_temperature":4.0,"relative_humidity":80.0,"wind_speed":3.0}},"next_1_hours":{"summary":{"symbol_code":"cloudy"},"details":{"precipitation_amount":0.2}}}},
              {"time":"2026-11-11T13:00:00Z","data":{"instant":{"details":{"air_temperature":5.0}},"next_1_hours":{"summary":{"symbol_code":"clearsky_day"}}}},
              {"time":"2026-11-12T12:00:00Z","data":{"instant":{"details":{"air_temperature":1.0}},"next_6_hours":{"summary":{"symbol_code":"snow"}}}}
            ]
          }
        });
        let result = build_forecast(&city, &document).unwrap();
        assert_eq!(result.city, "Helsinki");
        assert_eq!(result.temperature, 4.0);
        assert_eq!(result.precipitation, Some(0.2));
        assert_eq!(result.days.len(), 2);
        assert_eq!(result.days[0].minimum, 4.0);
        assert_eq!(result.days[0].maximum, 5.0);
        assert_eq!(result.days[1].symbol, "snow");
      }
}
