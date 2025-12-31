use tauri::{command, AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use regex::Regex;
use std::fs;
use std::path::PathBuf;

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    id: u64,
    progress: f64,
    speed: String,
    eta: String,
    status: String,
}

// Helper to get our custom folder path: ~/Downloads/RYT-Downloads
fn get_ryt_folder(app: &AppHandle) -> PathBuf {
    let download_dir = app.path().download_dir().expect("Could not find downloads");
    download_dir.join("RYT-Downloads")
}

#[command]
async fn open_ryt_folder(app: AppHandle) -> Result<(), String> {
    let folder_path = get_ryt_folder(&app);
    
    // Create it if it doesn't exist so opening doesn't fail
    if !folder_path.exists() {
        fs::create_dir_all(&folder_path).map_err(|e| e.to_string())?;
    }

    // Use the opener plugin to open the directory in file manager
    open::that(folder_path).map_err(|e| e.to_string())?;
        
    Ok(())
}

#[command]
async fn get_video_title(app: AppHandle, url: String) -> Result<String, String> {
    let sidecar = app.shell().sidecar("yt-dlp").map_err(|e| e.to_string())?;
    let command = sidecar.args(["--get-title", &url]);
    let output = command.output().await.map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Ok("Unknown Video".to_string())
    }
}

#[command]
async fn download_video(app: AppHandle, id: u64, url: String) -> Result<(), String> {
    let folder_path = get_ryt_folder(&app);

    // 1. Create the "RYT-Downloads" folder if it doesn't exist
    if !folder_path.exists() {
        fs::create_dir_all(&folder_path).map_err(|e| format!("Failed to create folder: {}", e))?;
    }

    // 2. Set output template to use this new folder
    let file_template = format!("{}/%(title)s.%(ext)s", folder_path.to_string_lossy());

    let sidecar = app.shell().sidecar("yt-dlp").map_err(|e| e.to_string())?;

    let command = sidecar.args([
        "--newline",
        "--no-playlist",
        "--progress-template", "[download] %(progress._percent_str)s | %(progress._speed_str)s | %(progress._eta_str)s", 
        "-o", &file_template,
        &url
    ]);

    let (mut rx, _) = command.spawn().map_err(|e| e.to_string())?;
    
    let re = Regex::new(r"(\d+\.\d+)%\s*\|\s*([^\s|]+)\s*\|\s*([^\s]+)").unwrap();
    let mut last_error = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                if let Some(caps) = re.captures(&line) {
                    let progress = caps.get(1).map_or(0.0, |m| m.as_str().parse().unwrap_or(0.0));
                    let speed = caps.get(2).map_or("?".to_string(), |m| m.as_str().to_string());
                    let eta = caps.get(3).map_or("?".to_string(), |m| m.as_str().to_string());

                    let payload = DownloadProgress {
                        id,
                        progress,
                        speed,
                        eta,
                        status: "downloading".to_string(),
                    };
                    let _ = app.emit("download-progress", &payload);
                }
            }
            CommandEvent::Stderr(line_bytes) => {
                let line = String::from_utf8_lossy(&line_bytes);
                if !line.contains("WARNING") {
                    last_error = line.to_string();
                }
            }
            CommandEvent::Terminated(payload) => {
                if let Some(code) = payload.code {
                    if code != 0 {
                        return Err(format!("Failed: {}", last_error));
                    }
                }
            }
            _ => {}
        }
    }

    let _ = app.emit("download-finished", id);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init()) // Ensure opener is init here
        .plugin(tauri_plugin_sql::Builder::default().build())
        // Register all 3 commands
        .invoke_handler(tauri::generate_handler![download_video, get_video_title, open_ryt_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}