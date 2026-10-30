const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || (
  fs.existsSync(path.join(__dirname, 'supernotes.db'))
    ? path.join(__dirname, 'supernotes.db')
    : (fs.existsSync(path.join(__dirname, '..', 'supernotes.db'))
      ? path.join(__dirname, '..', 'supernotes.db')
      : path.join(__dirname, 'supernotes.db'))
);
let db = null;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    configurePragmas();
    initTables();
  }
  return db;
}

function configurePragmas() {
  try {
    // Performance & concurrency optimizations for SQLite
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = MEMORY;
      PRAGMA cache_size = -64000;
      PRAGMA foreign_keys = ON;
    `);
  } catch (err) {
    console.error('Failed to configure SQLite pragmas:', err);
  }
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folder_id TEXT DEFAULT NULL,
      elements TEXT NOT NULL DEFAULT '[]',
      scroll_x REAL NOT NULL DEFAULT 0,
      scroll_y REAL NOT NULL DEFAULT 0,
      zoom REAL NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_files_active ON files (deleted_at, updated_at DESC);
  `);

  // Ensure deleted_at and folder_id columns exist for existing tables
  try {
    const columns = db.prepare('PRAGMA table_info(files)').all();
    const hasDeletedAt = columns.some(c => c.name === 'deleted_at');
    if (!hasDeletedAt) {
      db.exec('ALTER TABLE files ADD COLUMN deleted_at INTEGER DEFAULT NULL');
    }
    const hasFolderId = columns.some(c => c.name === 'folder_id');
    if (!hasFolderId) {
      db.exec('ALTER TABLE files ADD COLUMN folder_id TEXT DEFAULT NULL');
    }
  } catch (e) {
    console.error('Migration error checking columns:', e);
  }

  // Create folder index after column check
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_files_folder ON files (folder_id)');
  } catch (e) {}

  // Create file_backups table for automated disaster recovery
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_backups (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        name TEXT NOT NULL,
        elements TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_file_backups ON file_backups (file_id, created_at DESC);
    `);
  } catch (e) {}

  // Purge any expired trash (older than 30 days)
  purgeExpiredTrash();

  // Check if active files are empty, seed starter file if so
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM files WHERE deleted_at IS NULL');
  const result = countStmt.get();
  if (result && result.count === 0) {
    seedStarterFile();
  }
}

function purgeExpiredTrash() {
  try {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const stmt = db.prepare('DELETE FROM files WHERE deleted_at IS NOT NULL AND deleted_at < ?');
    const res = stmt.run(cutoff);
    return res.changes;
  } catch (e) {
    return 0;
  }
}

function seedStarterFile() {
  const starterId = 'welcome-note';
  const now = Date.now();
  const sampleElements = [
    {
      id: 'el-welcome-rect',
      type: 'rectangle',
      x: 180,
      y: 130,
      width: 320,
      height: 140,
      strokeColor: '#6965db',
      fillColor: '#e8e7f8',
      strokeWidth: 2,
      roughness: 1.5,
      opacity: 1,
      seed: 123456
    },
    {
      id: 'el-welcome-text-1',
      type: 'text',
      x: 200,
      y: 155,
      text: '📝 Welcome to SuperNotes!\nDraw, drag & type notes.',
      fontSize: 24,
      fontFamily: "'Patrick Hand', cursive",
      bold: false,
      italic: false,
      underline: false,
      strokeColor: '#1e1e1e'
    },
    {
      id: 'el-welcome-arrow',
      type: 'arrow',
      x: 500,
      y: 200,
      points: [{ x: 500, y: 200 }, { x: 620, y: 200 }],
      strokeColor: '#6965db',
      strokeWidth: 2,
      roughness: 1.2,
      seed: 654321
    },
    {
      id: 'el-welcome-ellipse',
      type: 'ellipse',
      x: 630,
      y: 145,
      width: 170,
      height: 110,
      strokeColor: '#2b8a3e',
      fillColor: '#d3f9d8',
      strokeWidth: 2,
      roughness: 1.5,
      opacity: 1,
      seed: 789012
    },
    {
      id: 'el-welcome-text-2',
      type: 'text',
      x: 660,
      y: 180,
      text: 'SQLite DB\nStorage ⚡',
      fontSize: 22,
      fontFamily: "'Kalam', cursive",
      bold: true,
      italic: false,
      underline: false,
      strokeColor: '#2b8a3e'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO files (id, name, elements, scroll_x, scroll_y, zoom, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    starterId,
    'Welcome to SuperNotes',
    JSON.stringify(sampleElements),
    0,
    0,
    1,
    now,
    now
  );
}

function listFiles() {
  const database = getDb();
  purgeExpiredTrash();
  const stmt = database.prepare('SELECT id, name, folder_id, created_at, updated_at FROM files WHERE deleted_at IS NULL ORDER BY updated_at DESC');
  const rows = stmt.all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    folderId: r.folder_id || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

function listTrash() {
  const database = getDb();
  purgeExpiredTrash();
  const stmt = database.prepare('SELECT id, name, folder_id, created_at, updated_at, deleted_at FROM files WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
  const rows = stmt.all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    folderId: r.folder_id || null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at
  }));
}

function getFile(id) {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM files WHERE id = ?');
  const r = stmt.get(id);
  if (!r) return null;

  let elements = [];
  try {
    elements = JSON.parse(r.elements);
  } catch (e) {
    elements = [];
  }

  return {
    id: r.id,
    name: r.name,
    folderId: r.folder_id || null,
    elements: elements,
    scrollX: Number(r.scroll_x) || 0,
    scrollY: Number(r.scroll_y) || 0,
    zoom: Number(r.zoom) || 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at || null
  };
}

function createFile(data) {
  const database = getDb();
  const id = data.id || ('file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  const name = (data.name || 'Untitled Diagram').trim();
  const folderId = data.folderId !== undefined ? (data.folderId || null) : null;
  const elements = JSON.stringify(data.elements || []);
  const scrollX = Number(data.scrollX) || 0;
  const scrollY = Number(data.scrollY) || 0;
  const zoom = Number(data.zoom) || 1;
  const now = Date.now();
  const createdAt = data.createdAt || now;
  const updatedAt = data.updatedAt || now;
  const deletedAt = data.deletedAt || null;

  const insert = database.prepare(`
    INSERT OR REPLACE INTO files (id, name, folder_id, elements, scroll_x, scroll_y, zoom, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(id, name, folderId, elements, scrollX, scrollY, zoom, createdAt, updatedAt, deletedAt);

  return getFile(id);
}

function updateFile(id, data) {
  const database = getDb();
  const existing = getFile(id);
  if (!existing) {
    // If not found, create it
    return createFile({ id, ...data });
  }

  // Safety Disaster Recovery: If existing note has elements and incoming data clears it, save snapshot
  if (existing.elements && existing.elements.length > 0) {
    if (data.elements !== undefined && data.elements.length === 0) {
      try {
        const backupId = 'snap-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        database.prepare('INSERT INTO file_backups (id, file_id, name, elements, created_at) VALUES (?, ?, ?, ?, ?)').run(
          backupId, id, existing.name || 'Untitled', JSON.stringify(existing.elements), Date.now()
        );
      } catch (err) {}
    }
  }

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  const folderId = data.folderId !== undefined ? (data.folderId || null) : existing.folderId;
  const elements = data.elements !== undefined ? JSON.stringify(data.elements) : JSON.stringify(existing.elements);
  const scrollX = data.scrollX !== undefined ? Number(data.scrollX) : existing.scrollX;
  const scrollY = data.scrollY !== undefined ? Number(data.scrollY) : existing.scrollY;
  const zoom = data.zoom !== undefined ? Number(data.zoom) : existing.zoom;
  const updatedAt = Date.now();
  const deletedAt = data.deletedAt !== undefined ? data.deletedAt : existing.deletedAt;

  const update = database.prepare(`
    UPDATE files
    SET name = ?, folder_id = ?, elements = ?, scroll_x = ?, scroll_y = ?, zoom = ?, updated_at = ?, deleted_at = ?
    WHERE id = ?
  `);

  update.run(name, folderId, elements, scrollX, scrollY, zoom, updatedAt, deletedAt, id);

  return getFile(id);
}

function moveFileToFolder(fileId, folderId) {
  const database = getDb();
  const now = Date.now();
  const stmt = database.prepare('UPDATE files SET folder_id = ?, updated_at = ? WHERE id = ?');
  const res = stmt.run(folderId || null, now, fileId);
  return res.changes > 0;
}

function listFolders() {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT f.id, f.name, f.created_at, f.updated_at,
           (SELECT COUNT(*) FROM files WHERE folder_id = f.id AND deleted_at IS NULL) AS file_count
    FROM folders f
    ORDER BY f.name ASC
  `);
  const rows = stmt.all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    fileCount: Number(r.file_count) || 0
  }));
}

function createFolder(name) {
  const database = getDb();
  const id = 'folder-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const trimmed = (name || 'New Folder').trim();
  const now = Date.now();
  const stmt = database.prepare('INSERT INTO folders (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)');
  stmt.run(id, trimmed, now, now);
  return { id, name: trimmed, createdAt: now, updatedAt: now, fileCount: 0 };
}

function renameFolder(id, name) {
  const database = getDb();
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const now = Date.now();
  const stmt = database.prepare('UPDATE folders SET name = ?, updated_at = ? WHERE id = ?');
  stmt.run(trimmed, now, id);
  return { id, name: trimmed, updatedAt: now };
}

function deleteFolder(id) {
  const database = getDb();
  // Check if folder contains active notes (user requirement: user cannot delete folder if he has notes in it)
  const countStmt = database.prepare('SELECT COUNT(*) as count FROM files WHERE folder_id = ? AND deleted_at IS NULL');
  const res = countStmt.get(id);
  const count = res ? Number(res.count) : 0;
  if (count > 0) {
    return { success: false, error: 'Cannot delete folder containing notes', fileCount: count };
  }
  const stmt = database.prepare('DELETE FROM folders WHERE id = ?');
  const delRes = stmt.run(id);
  return { success: delRes.changes > 0 };
}

function moveToTrash(id) {
  const database = getDb();
  const now = Date.now();
  const stmt = database.prepare('UPDATE files SET deleted_at = ? WHERE id = ?');
  const res = stmt.run(now, id);
  return res.changes > 0;
}

function restoreFile(id) {
  const database = getDb();
  const now = Date.now();
  const stmt = database.prepare('UPDATE files SET deleted_at = NULL, updated_at = ? WHERE id = ?');
  const res = stmt.run(now, id);
  return res.changes > 0;
}

function deleteFile(id) {
  // Safe default: moves to trash
  return moveToTrash(id);
}

function permanentDelete(id) {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM files WHERE id = ?');
  const res = stmt.run(id);
  return res.changes > 0;
}

function emptyTrash() {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM files WHERE deleted_at IS NOT NULL');
  const res = stmt.run();
  return res.changes;
}

function backupDatabase(targetPath) {
  if (!targetPath || typeof targetPath !== 'string' || !targetPath.toLowerCase().endsWith('.db')) {
    throw new Error('Invalid backup target path: must end with .db');
  }
  const database = getDb();
  try {
    database.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch (e) {}

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
  const cleanPath = path.resolve(targetPath).replace(/\\/g, '/').replace(/'/g, "''");
  database.exec(`VACUUM INTO '${cleanPath}'`);
  return targetPath;
}

function migrateFiles(filesList) {
  const database = getDb();
  if (!Array.isArray(filesList)) return { imported: 0 };

  let count = 0;
  for (const item of filesList) {
    if (item && item.id) {
      createFile(item);
      count++;
    }
  }
  return { imported: count };
}

function listBackups(fileId) {
  const database = getDb();
  try {
    const stmt = database.prepare('SELECT id, file_id, name, created_at, length(elements) as len FROM file_backups WHERE file_id = ? ORDER BY created_at DESC LIMIT 20');
    return stmt.all(fileId);
  } catch (e) {
    return [];
  }
}

function restoreBackup(fileId, backupId) {
  const database = getDb();
  try {
    const row = database.prepare('SELECT * FROM file_backups WHERE file_id = ? AND id = ?').get(fileId, backupId);
    if (!row) return null;
    const elements = JSON.parse(row.elements || '[]');
    return updateFile(fileId, { elements, updatedAt: Date.now() });
  } catch (e) {
    return null;
  }
}

module.exports = {
  getDb,
  listFiles,
  listTrash,
  getFile,
  createFile,
  updateFile,
  listBackups,
  restoreBackup,
  moveToTrash,
  restoreFile,
  deleteFile,
  permanentDelete,
  emptyTrash,
  purgeExpiredTrash,
  migrateFiles,
  backupDatabase,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveFileToFolder
};

