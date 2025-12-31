# RYT-Downloader (Rust YouTube Downloader)

![Tauri](https://img.shields.io/badge/built%20with-Tauri-24C8DB.svg) ![Rust](https://img.shields.io/badge/backend-Rust-orange.svg)

**RYT-Downloader** is a high-performance, desktop YouTube video downloader and manager built with [Tauri v2](https://v2.tauri.app/). It combines a lightweight React frontend with a powerful Rust backend to provide real-time download tracking, a persistent library, and a modern dark UI.



## 🚀 Features

* **⚡ Native Performance:** Powered by Rust and `yt-dlp` for maximum download speeds.
* **📊 Real-time Progress:** Live progress bars, download speed, and ETA tracking.
* **📂 Organized Library:** Automatically saves files to `~/Downloads/RYT-Downloads` and tracks history in a local SQLite database.
* **🎨 Modern UI:** Sleek, dark-mode interface with glassmorphism effects and Lucide icons.
* **🛠️ Smart Recovery:** Retry failed downloads with a single click and robust error handling.
* **🔒 Privacy Focused:** Runs entirely locally on your machine. No tracking or external servers.

---

## 🛠️ Tech Stack

* **Frontend:** React, TypeScript, Vite, CSS Modules
* **Backend:** Rust, Tauri v2 (Shell, SQL, Opener plugins)
* **Database:** SQLite
* **Engine:** [yt-dlp](https://github.com/yt-dlp/yt-dlp) (bundled as a sidecar)

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js & npm** (v16+)
2.  **Rust & Cargo** ([Install Guide](https://www.rust-lang.org/tools/install))
3.  **FFmpeg** (Required by `yt-dlp` for merging video/audio)
    * *Linux (Arch):* `sudo pacman -S ffmpeg`
    * *Windows/Mac:* Download and add to system PATH.
4.  **Python** (Required runtime for `yt-dlp`)

---

## 📥 Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/Shabari-K-S/ryt-downloader.git]
cd ryt-downloader
```

### 2. Install Dependencies

```bash
npm install
# OR
pnpm install
```

---

## 🖥️ Development

To start the app in development mode with hot-reloading:

```bash
npm run tauri dev

```

* The frontend runs on `localhost:1420`.
* Rust compiles incrementally.

---

## 📦 Building for Production

To create an optimized executable installer for your machine:

```bash
npm run tauri build

```

The output (AppImage, .deb, .msi, or .dmg) will be located in:
`src-tauri/target/release/bundle/`

