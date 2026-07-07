import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./iptv.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Init tables
await db.execute(`
  CREATE TABLE IF NOT EXISTS sessions (
    id        TEXT PRIMARY KEY,
    server    TEXT NOT NULL,
    username  TEXT NOT NULL,
    password  TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS favorites (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN ('live','movie','series')),
    stream_id  TEXT NOT NULL,
    name       TEXT NOT NULL,
    cover      TEXT,
    UNIQUE(session_id, type, stream_id)
  )
`);

// Dernier contenu regardé par type, clé sur serveur|username pour survivre aux reconnexions
await db.execute(`
  CREATE TABLE IF NOT EXISTS watch_history (
    user_key   TEXT NOT NULL,
    type       TEXT NOT NULL CHECK(type IN ('live','movie','series')),
    stream_id  TEXT NOT NULL,
    name       TEXT NOT NULL,
    cover      TEXT,
    data       TEXT,
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    PRIMARY KEY (user_key, type)
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

export default db;

// Helpers settings
export async function getSetting(key: string): Promise<string | undefined> {
  const result = await db.execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [key],
  });
  return (result.rows[0] as any)?.value;
}

export async function setSetting(key: string, value: string) {
  await db.execute({
    sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    args: [key, value],
  });
}

// Helpers sessions
export async function createSession(id: string, server: string, username: string, password: string) {
  await db.execute({
    sql: "INSERT OR REPLACE INTO sessions (id, server, username, password) VALUES (?, ?, ?, ?)",
    args: [id, server, username, password],
  });
}

export async function getSession(id: string): Promise<{ server: string; username: string; password: string } | undefined> {
  const result = await db.execute({
    sql: "SELECT server, username, password FROM sessions WHERE id = ?",
    args: [id],
  });
  return result.rows[0] as any;
}

export async function deleteSession(id: string) {
  await db.execute({
    sql: "DELETE FROM sessions WHERE id = ?",
    args: [id],
  });
}

// Helpers favoris
export async function getFavorites(sessionId: string, type?: string) {
  if (type) {
    const result = await db.execute({
      sql: "SELECT * FROM favorites WHERE session_id = ? AND type = ?",
      args: [sessionId, type],
    });
    return result.rows;
  }
  const result = await db.execute({
    sql: "SELECT * FROM favorites WHERE session_id = ?",
    args: [sessionId],
  });
  return result.rows;
}

export async function addFavorite(sessionId: string, type: string, streamId: string, name: string, cover: string) {
  await db.execute({
    sql: "INSERT OR IGNORE INTO favorites (session_id, type, stream_id, name, cover) VALUES (?, ?, ?, ?, ?)",
    args: [sessionId, type, streamId, name, cover],
  });
}

export async function removeFavorite(sessionId: string, type: string, streamId: string) {
  await db.execute({
    sql: "DELETE FROM favorites WHERE session_id = ? AND type = ? AND stream_id = ?",
    args: [sessionId, type, streamId],
  });
}

// Helpers historique de visionnage
export function userKey(server: string, username: string): string {
  return `${server}|${username}`;
}

export async function setLastWatched(key: string, type: string, streamId: string, name: string, cover?: string | null, data?: string | null) {
  await db.execute({
    sql: `INSERT OR REPLACE INTO watch_history (user_key, type, stream_id, name, cover, data, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, strftime('%s','now'))`,
    args: [key, type, streamId, name, cover ?? null, data ?? null],
  });
}

export async function getLastWatched(key: string) {
  const result = await db.execute({
    sql: "SELECT * FROM watch_history WHERE user_key = ? ORDER BY updated_at DESC",
    args: [key],
  });
  return result.rows;
}
