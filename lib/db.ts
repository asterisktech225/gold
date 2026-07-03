import "./dns-init";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve("./iptv.db");

const db = new Database(DB_PATH);

// Active WAL pour de meilleures performances
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id        TEXT PRIMARY KEY,
    server    TEXT NOT NULL,
    username  TEXT NOT NULL,
    password  TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN ('live','movie','series')),
    stream_id  TEXT NOT NULL,
    name       TEXT NOT NULL,
    cover      TEXT,
    UNIQUE(session_id, type, stream_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL
  );
`);

export default db;

// Helpers settings
export function getSetting(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

// Helpers sessions
export function createSession(id: string, server: string, username: string, password: string) {
  db.prepare("INSERT OR REPLACE INTO sessions (id, server, username, password) VALUES (?, ?, ?, ?)")
    .run(id, server, username, password);
}

export function getSession(id: string): { server: string; username: string; password: string } | undefined {
  return db.prepare("SELECT server, username, password FROM sessions WHERE id = ?").get(id) as any;
}

export function deleteSession(id: string) {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

// Helpers favoris
export function getFavorites(sessionId: string, type?: string) {
  if (type) return db.prepare("SELECT * FROM favorites WHERE session_id = ? AND type = ?").all(sessionId, type);
  return db.prepare("SELECT * FROM favorites WHERE session_id = ?").all(sessionId);
}

export function addFavorite(sessionId: string, type: string, streamId: string, name: string, cover: string) {
  db.prepare("INSERT OR IGNORE INTO favorites (session_id, type, stream_id, name, cover) VALUES (?, ?, ?, ?, ?)")
    .run(sessionId, type, streamId, name, cover);
}

export function removeFavorite(sessionId: string, type: string, streamId: string) {
  db.prepare("DELETE FROM favorites WHERE session_id = ? AND type = ? AND stream_id = ?")
    .run(sessionId, type, streamId);
}

