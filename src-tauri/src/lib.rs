mod registry;

use registry::InstalledApp;
use std::process::Command;

#[tauri::command]
fn get_installed_apps() -> Result<Vec<InstalledApp>, String> {
    registry::scan_installed_apps().map_err(|e| e.to_string())
}

#[tauri::command]
fn uninstall_app(uninstall_string: String) -> Result<String, String> {
    if uninstall_string.is_empty() {
        return Err("No uninstall command available".into());
    }

    // Parse the uninstall string - handle both quoted and unquoted paths
    let (program, args) = parse_uninstall_string(&uninstall_string);

    let output = Command::new("cmd")
        .args(["/C", &format!("{} {}", program, args)])
        .output()
        .map_err(|e| format!("Failed to execute uninstall command: {}", e))?;

    if output.status.success() {
        Ok("Uninstall process started successfully".into())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Many uninstallers return non-zero but still work (they spawn a GUI)
        // So we still report success-ish
        Ok(format!(
            "Uninstall process launched (exit code: {:?}, stderr: {})",
            output.status.code(),
            stderr
        ))
    }
}

fn parse_uninstall_string(s: &str) -> (String, String) {
    let trimmed = s.trim();
    if trimmed.starts_with('"') {
        // Find closing quote
        if let Some(end) = trimmed[1..].find('"') {
            let program = &trimmed[..end + 2];
            let args = trimmed[end + 2..].trim();
            return (program.to_string(), args.to_string());
        }
    }
    // If there's a space and no quotes, try to split at first arg-like part
    if let Some(pos) = trimmed.find(" /") {
        let program = &trimmed[..pos];
        let args = &trimmed[pos..];
        return (program.to_string(), args.to_string());
    }
    if let Some(pos) = trimmed.find(" -") {
        let program = &trimmed[..pos];
        let args = &trimmed[pos..];
        return (program.to_string(), args.to_string());
    }
    (trimmed.to_string(), String::new())
}

#[tauri::command]
fn remove_registry_entry(registry_key: String) -> Result<String, String> {
    registry::remove_registry_entry(&registry_key).map_err(|e| e.to_string())
}

#[tauri::command]
fn refresh_app_status(install_location: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&install_location).exists())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            uninstall_app,
            remove_registry_entry,
            refresh_app_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
