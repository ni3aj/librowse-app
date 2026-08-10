// src/utils/db.js
import * as SQLite from "expo-sqlite";

// Open (or create) the local database file
const db = SQLite.openDatabaseSync("librowse_chat.db");

export const initDB = async () => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        library_id TEXT,
        sender_id TEXT,
        type TEXT,
        content TEXT,
        created_at TEXT,
        updated_at TEXT,
        is_deleted INTEGER,
        sender_name TEXT,
        sender_role TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_lib_created ON activities (library_id, created_at DESC);
    `);
    console.log("Local SQLite DB Initialized");
  } catch (error) {
    console.error("Error initializing DB", error);
  }
};

// Insert or Update messages from the server
export const saveActivitiesToLocal = async (activities) => {
  if (!activities || activities.length === 0) return;

  const statement = await db.prepareAsync(`
    INSERT OR REPLACE INTO activities 
    (id, library_id, sender_id, type, content, created_at, updated_at, is_deleted, sender_name, sender_role) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    for (const msg of activities) {
      await statement.executeAsync([
        msg.id,
        msg.library_id || null, // Ensure this comes from API or pass it in
        msg.sender_id,
        msg.type,
        msg.content,
        msg.created_at,
        msg.updated_at,
        msg.is_deleted ? 1 : 0, // SQLite uses 1/0 for booleans
        msg.sender_name,
        msg.sender_role,
      ]);
    }
  } finally {
    await statement.finalizeAsync();
  }
};

// Fetch messages instantly from the phone's storage
export const getLocalActivities = async (
  libraryId,
  limit = 50,
  cursor = null,
) => {
  let query = `SELECT * FROM activities WHERE library_id = ?`;
  let params = [libraryId];

  if (cursor) {
    query += ` AND created_at < ?`;
    params.push(cursor);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const rows = await db.getAllAsync(query, params);

  // Convert 1/0 back to true/false for the React Native UI
  return rows.map((r) => ({ ...r, is_deleted: r.is_deleted === 1 }));
};

// Get the timestamp of the last time we updated a message to send to the Delta Sync API
export const getLastSyncTime = async (libraryId) => {
  const result = await db.getFirstAsync(
    `SELECT MAX(updated_at) as last_update FROM activities WHERE library_id = ?`,
    [libraryId],
  );
  return result?.last_update || null;
};

export const clearLocalActivities = async (libraryId) => {
  if (!libraryId) return;

  try {
    // 📌 Safely delete only the messages for THIS specific library
    await db.runAsync(`DELETE FROM activities WHERE library_id = ?`, [
      libraryId,
    ]);
    console.log(
      `Successfully cleared local chat cache for library: ${libraryId}`,
    );
  } catch (error) {
    console.error("Error clearing local activities:", error);
    throw error; // Throw so the UI can catch it and show an error toast if needed
  }
};
