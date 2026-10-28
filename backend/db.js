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
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      elements TEXT NOT NULL DEFAULT '[]',
      scroll_x REAL NOT NULL DEFAULT 0,
      scroll_y REAL NOT NULL DEFAULT 0,
      zoom REAL NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER DEFAULT NULL
    )
  `);

  // Ensure deleted_at column exists for existing tables
  try {
    const columns = db.prepare('PRAGMA table_info(files)').all();
    const hasDeletedAt = columns.some(c => c.name === 'deleted_at');
    if (!hasDeletedAt) {
      db.exec('ALTER TABLE files ADD COLUMN deleted_at INTEGER DEFAULT NULL');
    }
  } catch (e) {
    console.error('Migration error checking deleted_at column:', e);
  }

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
      fontFamily: "'Caveat', cursive",
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
  const stmt = database.prepare('SELECT id, name, created_at, updated_at FROM files WHERE deleted_at IS NULL ORDER BY updated_at DESC');
  const rows = stmt.all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

function listTrash() {
  const database = getDb();
  purgeExpiredTrash();
  const stmt = database.prepare('SELECT id, name, created_at, updated_at, deleted_at FROM files WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
  const rows = stmt.all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
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
  const elements = JSON.stringify(data.elements || []);
  const scrollX = Number(data.scrollX) || 0;
  const scrollY = Number(data.scrollY) || 0;
  const zoom = Number(data.zoom) || 1;
  const now = Date.now();
  const createdAt = data.createdAt || now;
  const updatedAt = data.updatedAt || now;
  const deletedAt = data.deletedAt || null;

  const insert = database.prepare(`
    INSERT OR REPLACE INTO files (id, name, elements, scroll_x, scroll_y, zoom, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(id, name, elements, scrollX, scrollY, zoom, createdAt, updatedAt, deletedAt);

  return getFile(id);
}

function updateFile(id, data) {
  const database = getDb();
  const existing = getFile(id);
  if (!existing) {
    // If not found, create it
    return createFile({ id, ...data });
  }

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  const elements = data.elements !== undefined ? JSON.stringify(data.elements) : JSON.stringify(existing.elements);
  const scrollX = data.scrollX !== undefined ? Number(data.scrollX) : existing.scrollX;
  const scrollY = data.scrollY !== undefined ? Number(data.scrollY) : existing.scrollY;
  const zoom = data.zoom !== undefined ? Number(data.zoom) : existing.zoom;
  const updatedAt = Date.now();
  const deletedAt = data.deletedAt !== undefined ? data.deletedAt : existing.deletedAt;

  const update = database.prepare(`
    UPDATE files
    SET name = ?, elements = ?, scroll_x = ?, scroll_y = ?, zoom = ?, updated_at = ?, deleted_at = ?
    WHERE id = ?
  `);

  update.run(name, elements, scrollX, scrollY, zoom, updatedAt, deletedAt, id);

  return getFile(id);
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

module.exports = {
  getDb,
  listFiles,
  listTrash,
  getFile,
  createFile,
  updateFile,
  moveToTrash,
  restoreFile,
  deleteFile,
  permanentDelete,
  emptyTrash,
  purgeExpiredTrash,
  migrateFiles
};

