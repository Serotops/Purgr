mod disk;
mod registry;

use std::process::Command;
use tauri::Emitter;

#[tauri::command]
fn get_installed_apps() -> Result<Vec<registry::InstalledApp>, String> {
    registry::scan_installed_apps().map_err(|e| e.to_string())
}

#[tauri::command]
async fn uninstall_app(uninstall_string: String) -> Result<String, String> {
    if uninstall_string.is_empty() {
        return Err("No uninstall command available".into());
    }

    let result = tauri::async_runtime::spawn_blocking(move || {
        let output = Command::new("cmd")
            .args(["/C", &uninstall_string])
            .output();

        match output {
            Ok(o) if o.status.success() => Ok("completed".to_string()),
            Ok(o) => {
                let code = o.status.code().unwrap_or(-1);
                if code == 5 || code == 740 {
                    run_elevated(&uninstall_string)
                } else {
                    Ok("completed".to_string())
                }
            }
            Err(e) => {
                let msg = e.to_string();
                if msg.contains("740") || msg.contains("elevation") {
                    run_elevated(&uninstall_string)
                } else {
                    Err(format!("Failed to execute uninstall command: {}", e))
                }
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| e)?;

    Ok(result)
}

fn run_elevated(command: &str) -> Result<String, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Start-Process cmd.exe -ArgumentList '/C {}' -Verb RunAs -Wait",
                command.replace('\'', "''").replace('"', "'\\\"'")
            ),
        ])
        .output()
        .map_err(|e| format!("Failed to launch elevated process: {}", e))?;

    if output.status.success() {
        Ok("completed".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("canceled") || stderr.contains("cancelled") || stderr.contains("The operation was canceled") {
            Err("User cancelled the elevation prompt".to_string())
        } else {
            Ok("completed".to_string())
        }
    }
}

#[tauri::command]
fn check_app_installed(registry_key: String) -> Result<bool, String> {
    registry::check_entry_exists(&registry_key).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_registry_entry(registry_key: String) -> Result<String, String> {
    registry::remove_registry_entry(&registry_key).map_err(|e| e.to_string())
}

#[tauri::command]
fn refresh_app_status(install_location: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&install_location).exists())
}

// ── Disk analysis commands ───────────────────────────────────────────────────

#[tauri::command]
fn list_drives() -> Result<Vec<disk::DriveInfo>, String> {
    disk::list_drives().map_err(|e| e.to_string())
}

/// Scan a specific directory with the fast parallel scanner.
#[tauri::command]
async fn scan_directory(path: String, max_depth: u32) -> Result<disk::DirEntry, String> {
    tauri::async_runtime::spawn_blocking(move || {
        disk::scan_fast(&path, max_depth)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| e.to_string())
}

/// Progressive drive scan:
///   1. Emits "scan-shallow" instantly with folder names (no sizes)
///   2. Tries MFT scan (instant full results if admin + NTFS)
///   3. Falls back to parallel FindFirstFileExW scan
///   4. Emits "scan-complete" with full results
#[tauri::command]
async fn scan_drive_progressive(
    drive_letter: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let letter = drive_letter.chars().next().unwrap_or('C');
    let path = format!("{}:\\", letter);

    // Phase 1: Instant shallow scan (just folder names, no sizes)
    let shallow_path = path.clone();
    let shallow = tauri::async_runtime::spawn_blocking(move || {
        disk::scan_shallow(&shallow_path)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;

    let _ = app.emit("scan-shallow", &shallow);

    // Phase 2: Try MFT scan first (needs admin, NTFS)
    let app_handle = app.clone();
    let mft_result = tauri::async_runtime::spawn_blocking(move || {
        let progress_emitter = |pct: f64, msg: &str| {
            let _ = app_handle.emit("scan-progress", serde_json::json!({
                "percent": pct,
                "message": msg,
            }));
        };

        // Try MFT
        match disk::scan_mft(letter, &progress_emitter) {
            Ok(result) => Ok(result),
            Err(_mft_err) => {
                // MFT failed — fall back to parallel fast scan with progress
                disk::scan_fast_with_progress(&path, 4, &progress_emitter)
            }
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| e.to_string())?;

    let _ = app.emit("scan-complete", &mft_result);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            uninstall_app,
            check_app_installed,
            remove_registry_entry,
            refresh_app_status,
            list_drives,
            scan_directory,
            scan_drive_progressive,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
