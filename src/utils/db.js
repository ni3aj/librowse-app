import * as SQLite from "expo-sqlite";

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
        sender_role TEXT,
        sender_photo TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_lib_created ON activities (library_id, created_at DESC);
    `);
    console.log("Local SQLite DB Initialized");
  } catch (error) {
    console.error("Error initializing DB", error);
  }
};

export const resetDatabaseSchema = async () => {
  try {
    console.log("Initiating full SQLite schema reset...");
    await db.execAsync(`DROP TABLE IF EXISTS activities;`);
    await initDB();
    console.log("Database schema completely reset and rebuilt.");
  } catch (error) {
    console.error("Failed to reset database schema", error);
  }
};

export const saveActivitiesToLocal = async (activities) => {
  if (!activities || activities.length === 0) return;

  const statement = await db.prepareAsync(`
    INSERT OR REPLACE INTO activities 
    (id, library_id, sender_id, type, content, created_at, updated_at, is_deleted, sender_name, sender_role, sender_photo) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    for (const msg of activities) {
      await statement.executeAsync([
        msg.id,
        msg.library_id || null,
        msg.sender_id,
        msg.type,
        msg.content,
        msg.created_at,
        msg.updated_at,
        msg.is_deleted ? 1 : 0,
        msg.sender_name,
        msg.sender_role,
        msg.sender_photo || null,
      ]);
    }
  } finally {
    await statement.finalizeAsync();
  }
};

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

  return rows.map((r) => ({ ...r, is_deleted: r.is_deleted === 1 }));
};

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
    await db.runAsync(`DELETE FROM activities WHERE library_id = ?`, [
      libraryId,
    ]);
    console.log(
      `Successfully cleared local chat cache for library: ${libraryId}`,
    );
  } catch (error) {
    console.error("Error clearing local activities:", error);
    throw error;
  }
};
