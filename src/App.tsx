import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Download, FolderOpen, RefreshCw, AlertCircle, CheckCircle2, Play, Trash2, X } from "lucide-react";
import { initDB, addVideo, getVideos, clearLibrary } from "./db";
import "./App.css";

interface Video {
  id: number;
  url: string;
  title: string;
  progress: number;
  speed: string;
  eta: string;
  status: "downloading" | "completed" | "error";
}

function App() {
  const [url, setUrl] = useState("");
  const [library, setLibrary] = useState<Video[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // New State for the Custom Modal
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    initDB().then(refreshLibrary);

    const unlistenProgress = listen("download-progress", (event: any) => {
      const p = event.payload; 
      setLibrary((prev) => 
        prev.map((item) => item.id === p.id ? { 
            ...item, 
            progress: p.progress, 
            speed: p.speed, 
            eta: p.eta 
        } : item)
      );
    });

    const unlistenFinished = listen("download-finished", (event: any) => {
      setLibrary((prev) =>
        prev.map((item) => item.id === event.payload ? { ...item, status: "completed", progress: 100, eta: "Done" } : item)
      );
    });

    return () => {
      unlistenProgress.then((f) => f());
      unlistenFinished.then((f) => f());
    };
  }, []);

  async function refreshLibrary() {
    const videos: any = await getVideos();
    const loadedVideos = videos.map((v: any) => ({
      ...v,
      status: "completed",
      progress: 100,
      speed: "-",
      eta: "Done"
    }));
    setLibrary(loadedVideos);
  }

  // Updated: Just opens the modal, doesn't delete yet
  function requestClearHistory() {
    setShowClearModal(true);
  }

  // Updated: Actually performs the delete
  async function confirmClearHistory() {
    await clearLibrary();
    setLibrary([]); 
    setShowClearModal(false);
  }

  async function startDownload(videoUrl: string) {
    if (!videoUrl) return;
    setIsDownloading(true);
    
    const tempId = Date.now();
    let realTitle = "Fetching Info...";

    try {
        realTitle = await invoke("get_video_title", { url: videoUrl });
    } catch (e) { console.log("Title fetch failed", e); }

    const newItem: Video = {
      id: tempId,
      url: videoUrl,
      title: realTitle,
      progress: 0,
      speed: "Starting...",
      eta: "--:--",
      status: "downloading",
    };

    setLibrary((prev) => [newItem, ...prev]);
    setUrl("");

    try {
      await invoke("download_video", { id: tempId, url: newItem.url });
      await addVideo(newItem.url, realTitle); 
      await refreshLibrary();
    } catch (error) {
      setLibrary((prev) =>
        prev.map((item) => item.id === tempId ? { 
            ...item, status: "error", title: `Error: ${error}`, speed: "Failed", eta: "" 
        } : item)
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function openDownloads() {
    try {
        await invoke("open_ryt_folder");
    } catch (e) { 
        console.error(e);
        alert("Could not open folder. Check if 'RYT-Downloads' exists.");
    }
  }

  const downloadingItems = library.filter((v) => v.status === "downloading" || v.status === "error");
  const completedItems = library.filter((v) => v.status === "completed");

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
            <Play fill="white" size={24} className="brand-icon" />
            <span>RYT-Downloader</span>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
            <button className="icon-btn" onClick={openDownloads} title="Open Folder">
                <FolderOpen size={20} />
            </button>
            {/* Opens the custom modal now */}
            <button className="icon-btn danger" onClick={requestClearHistory} title="Clear History">
                <Trash2 size={20} />
            </button>
        </div>
      </header>

      <div className="input-section">
        <div className="input-wrapper">
            <input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="Paste YouTube Link here..." 
                disabled={isDownloading}
            />
            <button 
                className="primary-btn" 
                onClick={() => startDownload(url)} 
                disabled={!url || isDownloading}
            >
                {isDownloading ? <RefreshCw className="spin" size={20} /> : <Download size={20} />}
                <span>Download</span>
            </button>
        </div>
      </div>

      {downloadingItems.length > 0 && (
        <section className="section">
            <h3>Active Queue</h3>
            <div className="card-list">
                {downloadingItems.map((video) => (
                    <div key={video.id} className={`card ${video.status}`}>
                        <div className="card-info">
                            <div className="card-header">
                                <span className="card-title">{video.title}</span>
                                {video.status === 'error' && <AlertCircle color="#ff5252" size={18} />}
                            </div>
                            {video.status !== 'error' && (
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${video.progress}%` }}></div>
                                </div>
                            )}
                            <div className="meta-row">
                                <span className="meta-pill">{video.speed}</span>
                                <span className="meta-pill">{video.eta}</span>
                                <span className="meta-percent">{video.progress.toFixed(0)}%</span>
                            </div>
                        </div>
                        {video.status === 'error' && (
                            <button className="retry-btn" onClick={() => startDownload(video.url)}><RefreshCw size={18} /></button>
                        )}
                    </div>
                ))}
            </div>
        </section>
      )}

      <section className="section">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3>Library</h3>
        </div>
        <div className="card-list">
            {completedItems.length === 0 ? (
                <div className="empty-state">Library empty.</div>
            ) : (
                completedItems.map((video) => (
                    <div key={video.id} className="card completed">
                        <div className="icon-box"><CheckCircle2 color="#4caf50" size={24} /></div>
                        <div className="card-info">
                            <span className="card-title">{video.title}</span>
                            <span className="card-subtitle">{video.url}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </section>

      {/* --- CUSTOM MODAL --- */}
      {showClearModal && (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h4>Clear History?</h4>
                    <button className="close-btn" onClick={() => setShowClearModal(false)}>
                        <X size={18} />
                    </button>
                </div>
                <p className="modal-body">
                    Are you sure you want to clear your download history? 
                    <br/><br/>
                    <span style={{color: '#a1a1aa', fontSize: '0.9em'}}>
                        (Actual video files in RYT-Downloads will <b>not</b> be deleted)
                    </span>
                </p>
                <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => setShowClearModal(false)}>
                        Cancel
                    </button>
                    <button className="danger-btn-solid" onClick={confirmClearHistory}>
                        Clear History
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;