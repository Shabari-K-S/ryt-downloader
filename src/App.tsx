import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { initDB, addVideo, getVideos } from "./db";
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
  
  // ✅ FIXED: Added this missing line
  const [isDownloading, setIsDownloading] = useState(false);

  // 1. Setup Event Listeners on Mount
  useEffect(() => {
    initDB().then(refreshLibrary);

    // Listen for Progress Updates
    const unlistenProgress = listen("download-progress", (event: any) => {
      const payload = event.payload; 
      
      setLibrary((prev) => 
        prev.map((item) => {
          if (item.id === payload.id) {
            return { 
              ...item, 
              progress: payload.progress, 
              speed: payload.speed, 
              eta: payload.eta 
            };
          }
          return item;
        })
      );
    });

    // Listen for Completion
    const unlistenFinished = listen("download-finished", (event: any) => {
      const id = event.payload; 
      setLibrary((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "completed", progress: 100, eta: "Done" } : item
        )
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

  async function handleAdd() {
    if (!url) return;

    const tempId = Date.now();
    const newItem: Video = {
      id: tempId,
      url,
      title: "Starting...",
      progress: 0,
      speed: "...",
      eta: "...",
      status: "downloading",
    };

    setLibrary((prev) => [newItem, ...prev]);
    setUrl("");
    setIsDownloading(true);

    try {
      await invoke("download_video", { id: tempId, url: newItem.url });
      await addVideo(newItem.url, "Downloaded Video");
      await refreshLibrary();
    } catch (error) {
      console.error("Download failed:", error);
      
      setLibrary((prev) =>
        prev.map((item) =>
          item.id === tempId ? { 
              ...item, 
              status: "error", 
              title: `Error: ${error}`, 
              speed: "Failed",
              eta: "X"
          } : item
        )
      );
    } finally {
      setIsDownloading(false);
    }
  }

  const downloadingItems = library.filter((v) => v.status === "downloading" || v.status === "error"); // Show errors in top list
  const completedItems = library.filter((v) => v.status === "completed");

  return (
    <div className="app-container">
      <div className="header"><div className="brand">RYT-Downloader</div></div>

      <div className="input-group">
        <input 
            className="url-input" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            placeholder="Video URL" 
            disabled={isDownloading} // Disable input while working
        />
        <button 
            className="add-btn" 
            onClick={handleAdd} 
            disabled={!url || isDownloading} // Disable button while working
        >
            {isDownloading ? "..." : "Add"}
        </button>
      </div>

      <h2 className="section-header">Downloading</h2>
      <div className="download-list">
        {downloadingItems.map((video) => (
          <div key={video.id} className="download-item" style={video.status === 'error' ? {borderColor: '#ff5252'} : {}}>
            <div className="item-title" style={video.status === 'error' ? {color: '#ff5252'} : {}}>{video.status === 'error' ? video.title : video.url}</div>
            
            {/* Progress Bar UI */}
            {video.status !== 'error' && (
                <div style={{flex: 2, marginRight: '15px'}}>
                    <div style={{background: '#444', height: '6px', borderRadius: '3px', width: '100%'}}>
                        <div style={{
                            width: `${video.progress}%`, 
                            background: '#3ea6ff', 
                            height: '100%', 
                            transition: 'width 0.2s'
                        }} />
                    </div>
                </div>
            )}

            <div className="item-meta">{video.speed}</div>
            <div className="item-meta">{video.eta}</div>
          </div>
        ))}
      </div>

      <h2 className="section-header">Completed</h2>
      <div className="download-list">
        {completedItems.map((video) => (
          <div key={video.id} className="download-item item-completed">
            <div className="item-title">{video.title}</div>
            <div className="item-status">Completed</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;