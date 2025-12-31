import Database from "@tauri-apps/plugin-sql";

async function getDb() {
  return await Database.load("sqlite:library.db");
}

export async function initDB() {
  const db = await getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      title TEXT,
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function addVideo(url: string, title: string) {
  const db = await getDb();
  await db.execute(
    "INSERT INTO videos (url, title) VALUES ($1, $2)",
    [url, title]
  );
}

export async function getVideos() {
  const db = await getDb();
  return await db.select("SELECT * FROM videos ORDER BY date_added DESC");
}

// --- NEW FUNCTION ---
export async function clearLibrary() {
  const db = await getDb();
  await db.execute("DELETE FROM videos");
}