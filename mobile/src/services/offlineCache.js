// Offline SQLite Cache — Phase 3
// Caches 7 days of exercises locally so students can practice without internet
// Sync queue uploads completed sessions when connectivity returns

import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';
import { studentAPI } from './api';

SQLite.enablePromise(true);

let db = null;

// ─── DB init ──────────────────────────────────────────────────────────────────
export const initOfflineDB = async () => {
  db = await SQLite.openDatabase({ name: 'ld_offline.db', location: 'default' });
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS cached_exercises (
      id TEXT PRIMARY KEY,
      exercise_type TEXT NOT NULL,
      level INTEGER NOT NULL,
      title TEXT NOT NULL,
      instruction TEXT NOT NULL,
      content TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    )
  `);
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      payload_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    )
  `);
  await db.executeSql(
    'CREATE INDEX IF NOT EXISTS idx_sync_unsynced ON sync_queue (synced, created_at)'
  );
  console.log('[OfflineCache] DB initialized');
};

// ─── Cache exercises from API ─────────────────────────────────────────────────
const CACHE_TTL_DAYS = 7;

export const cacheExercisesForOffline = async () => {
  const types = ['phonics', 'reading', 'writing', 'math'];
  const now = Date.now();
  const expiryTs = now - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

  // Remove stale cache
  await db.executeSql('DELETE FROM cached_exercises WHERE cached_at < ?', [expiryTs]);

  for (const type of types) {
    try {
      const { exercises } = await studentAPI.getExercises(type);
      for (const ex of exercises) {
        await db.executeSql(
          `INSERT OR REPLACE INTO cached_exercises
             (id, exercise_type, level, title, instruction, content, cached_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [ex.id, ex.exercise_type, ex.level, ex.title, ex.instruction, JSON.stringify(ex.content), now]
        );
      }
      console.log(`[OfflineCache] Cached ${exercises.length} ${type} exercises`);
    } catch (err) {
      console.warn(`[OfflineCache] Failed to cache ${type}:`, err.message);
    }
  }
};

// ─── Get cached exercises (fallback when offline) ─────────────────────────────
export const getCachedExercises = async (exerciseType) => {
  if (!db) await initOfflineDB();
  const [result] = await db.executeSql(
    'SELECT * FROM cached_exercises WHERE exercise_type = ? ORDER BY RANDOM() LIMIT 5',
    [exerciseType]
  );
  const exercises = [];
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    exercises.push({ ...row, content: JSON.parse(row.content) });
  }
  return exercises;
};

// ─── Queue a completed session for later sync ─────────────────────────────────
export const queueSessionForSync = async (sessionPayload) => {
  if (!db) await initOfflineDB();
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.executeSql(
    'INSERT INTO sync_queue (id, payload_type, payload, created_at) VALUES (?, ?, ?, ?)',
    [id, 'practice_session', JSON.stringify(sessionPayload), Date.now()]
  );
  console.log('[OfflineCache] Queued session for sync:', id);
};

// ─── Sync pending sessions when back online ───────────────────────────────────
export const syncPendingSessions = async () => {
  if (!db) return;
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  const [result] = await db.executeSql(
    'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC LIMIT 20'
  );

  let synced = 0;
  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    try {
      const payload = JSON.parse(row.payload);
      // Upload offline session as a bulk record
      await studentAPI.syncOfflineSession(payload);
      await db.executeSql('UPDATE sync_queue SET synced = 1 WHERE id = ?', [row.id]);
      synced++;
    } catch (err) {
      console.warn('[OfflineCache] Sync failed for', row.id, err.message);
    }
  }

  if (synced > 0) console.log(`[OfflineCache] Synced ${synced} pending sessions`);
  return synced;
};

// ─── Smart exercise fetcher (online first, offline fallback) ──────────────────
export const fetchExercisesWithFallback = async (exerciseType) => {
  const netState = await NetInfo.fetch();
  if (netState.isConnected) {
    try {
      const { exercises } = await studentAPI.getExercises(exerciseType);
      return { exercises, source: 'online' };
    } catch {
      // fall through to offline
    }
  }
  const exercises = await getCachedExercises(exerciseType);
  return { exercises, source: 'offline' };
};

export default {
  initOfflineDB,
  cacheExercisesForOffline,
  getCachedExercises,
  queueSessionForSync,
  syncPendingSessions,
  fetchExercisesWithFallback,
};
