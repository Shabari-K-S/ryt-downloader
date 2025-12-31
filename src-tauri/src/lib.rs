use tauri::{command, AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use regex::Regex;

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    id: u64,
    progress: f64,
    speed: String,
    eta: String,
    status: String,
}

#[command]
async fn download_video(app: AppHandle, id: u64, url: String) -> Result<(), String> {
    let download_path = app.path().download_dir().unwrap();
    let file_template = format!("{}/%(title)s.%(ext)s", download_path.to_string_lossy());

    let sidecar = app.shell().sidecar("yt-dlp").map_err(|e| e.to_string())?;

    let command = sidecar.args([
        "--newline",
        "-o", &file_template,
        &url
    ]);

    let (mut rx, _) = command.spawn().map_err(|e| e.to_string())?;
    
    // Regex to parse progress
    let re = Regex::new(r"\[download\]\s+(\d+\.\d+)%?.*?at\s+([^\s]+).*?ETA\s+([^\s]+)").unwrap();
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
                // Capture error output
                let line = String::from_utf8_lossy(&line_bytes);
                if !line.contains("WARNING") {
                    last_error = line.to_string();
                    println!("YT-DLP Error: {}", line); 
                }
            }
            CommandEvent::Terminated(payload) => {
                // Check for non-zero exit code
                if let Some(code) = payload.code {
                    if code != 0 {
                        return Err(format!("Download Failed: {}", last_error));
                    }
                }
            }
            _ => {}
        }
    }

    let _ = app.emit("download-finished", id);
    Ok(())
}

// -------------------------------------------------------------------------
// THIS FUNCTION BELOW WAS MISSING OR BROKEN IN YOUR FILE
// It connects everything together so main.rs can find it.
// -------------------------------------------------------------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![download_video]) // Registers the command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}