import Database from "@tauri-apps/plugin-sql";

// 1. Open the database (it creates 'library.db' file automatically)
async function getDb() {
  return await Database.load("sqlite:library.db");
}

// 2. Create the table if it doesn't exist
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

// 3. Add a video to the library
export async function addVideo(url: string, title: string) {
  const db = await getDb();
  await db.execute(
    "INSERT INTO videos (url, title) VALUES ($1, $2)",
    [url, title]
  );
}

// 4. Get all videos
export async function getVideos() {
  const db = await getDb();
  return await db.select("SELECT * FROM videos ORDER BY date_added DESC");
}