//! Local Windows OCR using the OCR language packs installed on this PC.

const MAX_IMAGE_BYTES: usize = 16 * 1024 * 1024;
const BASE64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn decode_image_data(value: &str) -> Result<Vec<u8>, String> {
    let encoded = value
        .split_once(',')
        .map(|(_, payload)| payload)
        .unwrap_or(value);
    if encoded.len() > (MAX_IMAGE_BYTES * 4 / 3 + 16) {
        return Err("The screenshot is too large for OCR (maximum 16 MB).".into());
    }
    let mut output = Vec::with_capacity(encoded.len() * 3 / 4);
    let mut buffer: u32 = 0;
    let mut bits = 0u32;
    for byte in encoded.bytes() {
        if byte.is_ascii_whitespace() {
            continue;
        }
        if byte == b'=' {
            break;
        }
        let value = BASE64
            .iter()
            .position(|candidate| *candidate == byte)
            .ok_or_else(|| "The screenshot data is not valid Base64.".to_string())?
            as u32;
        buffer = ((buffer << 6) | value) & 0x00ff_ffff;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            output.push(((buffer >> bits) & 0xff) as u8);
            if output.len() > MAX_IMAGE_BYTES {
                return Err("The screenshot is too large for OCR (maximum 16 MB).".into());
            }
        }
    }
    if output.is_empty() {
        return Err("The screenshot is empty.".into());
    }
    Ok(output)
}

#[cfg(target_os = "windows")]
fn recognize_windows(bytes: &[u8]) -> Result<String, String> {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};
    use windows::Graphics::Imaging::BitmapDecoder;
    use windows::Media::Ocr::OcrEngine;
    use windows::Storage::{FileAccessMode, StorageFile};
    use windows::Win32::System::Com::{COINIT_MULTITHREADED, CoInitializeEx};
    use windows::core::HSTRING;

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos();
    let path =
        std::env::temp_dir().join(format!("island-w-ocr-{}-{stamp}.png", std::process::id()));
    fs::write(&path, bytes)
        .map_err(|error| format!("Could not prepare the screenshot for OCR: {error}"))?;

    let result = (|| -> Result<String, String> {
        let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        let path_text = path.to_string_lossy();
        let file = StorageFile::GetFileFromPathAsync(&HSTRING::from(path_text.as_ref()))
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        let stream = file
            .OpenAsync(FileAccessMode::Read)
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        let decoder = BitmapDecoder::CreateAsync(&stream)
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        let bitmap = decoder
            .GetSoftwareBitmapAsync()
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        let engine = OcrEngine::TryCreateFromUserProfileLanguages()
            .map_err(|_| "Windows OCR is unavailable. Install an OCR language pack in Settings → Time & language → Language & region.".to_string())?;
        let result = engine
            .RecognizeAsync(&bitmap)
            .map_err(|error| error.to_string())?
            .join()
            .map_err(|error| error.to_string())?;
        result
            .Text()
            .map(|value| value.to_string())
            .map_err(|error| error.to_string())
    })();

    let _ = fs::remove_file(&path);
    result
}

#[cfg(not(target_os = "windows"))]
fn recognize_windows(_bytes: &[u8]) -> Result<String, String> {
    Err("OCR is currently available on Windows 11 only.".into())
}

#[tauri::command]
pub async fn ocr_image(image_base64: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let bytes = decode_image_data(&image_base64)?;
        recognize_windows(&bytes)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_png_base64_from_a_data_url() {
        let bytes = decode_image_data("data:image/png;base64,aGVsbG8=").unwrap();
        assert_eq!(bytes, b"hello");
    }

    #[test]
    fn rejects_invalid_data() {
        assert!(decode_image_data("%%%").is_err());
        assert!(decode_image_data("data:image/png;base64,").is_err());
    }
}
