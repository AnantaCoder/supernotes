const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const db = require('./db');

// Bind to 0.0.0.0 so Antigravity port forwarding, dev tunnels, and local browser can all connect
const PORT = parseInt(process.env.PORT, 10) || 5050;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

// Check if origin is safe: allows any port on localhost/127.0.0.1 (forwarded ports) and Antigravity preview tunnels
function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    // Allow any localhost/127.0.0.1 port (essential for IDE port forwarding)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1' || u.hostname === '0.0.0.0') {
      return true;
    }
    // Allow Antigravity and cloud preview tunnels
    if (
      u.hostname.endsWith('.antigravity.dev') ||
      u.hostname.endsWith('.google.com') ||
      u.hostname.endsWith('.internal') ||
      u.hostname.endsWith('.app.github.dev')
    ) {
      return true;
    }
  } catch (e) {}
  return false;
}

function getCorsHeaders(req) {
  const origin = req.headers.origin;
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
  if (isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  return headers;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    // Limit request body to 15MB (drawing elements in JSON rarely exceed 1-2MB)
    const MAX_SIZE = 15 * 1024 * 1024;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_SIZE) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJson(res, statusCode, data, req) {
  const corsHeaders = req ? getCorsHeaders(req) : {};
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...corsHeaders
  });
  res.end(JSON.stringify(data));
}

// Strict validation for file IDs to prevent path traversal or query injection
function isValidFileId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname;
  try {
    pathname = decodeURI(parsedUrl.pathname);
  } catch (e) {
    pathname = parsedUrl.pathname;
  }

  // Null byte injection protection
  if (pathname.includes('\0')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  // ==================== REST API ENDPOINTS ====================
  if (pathname.startsWith('/api/')) {
    try {
      // GET /api/files - List active files
      if (req.method === 'GET' && pathname === '/api/files') {
        const files = db.listFiles();
        return sendJson(res, 200, { success: true, files }, req);
      }

      // ==================== FOLDERS API ====================
      // GET /api/folders - List all folders with note counts
      if (req.method === 'GET' && pathname === '/api/folders') {
        const folders = db.listFolders();
        return sendJson(res, 200, { success: true, folders }, req);
      }

      // POST /api/folders - Create new folder
      if (req.method === 'POST' && pathname === '/api/folders') {
        const body = await parseBody(req);
        const folder = db.createFolder(body.name);
        return sendJson(res, 201, { success: true, folder }, req);
      }

      // PUT /api/folders/:id - Rename folder
      if (req.method === 'PUT' && pathname.startsWith('/api/folders/')) {
        const folderId = pathname.replace('/api/folders/', '').trim();
        if (!isValidFileId(folderId)) return sendJson(res, 400, { success: false, error: 'Invalid folder ID' }, req);
        const body = await parseBody(req);
        const updated = db.renameFolder(folderId, body.name);
        return sendJson(res, 200, { success: !!updated, folder: updated }, req);
      }

      // DELETE /api/folders/:id - Delete folder (blocked if notes are inside!)
      if (req.method === 'DELETE' && pathname.startsWith('/api/folders/')) {
        const folderId = pathname.replace('/api/folders/', '').trim();
        if (!isValidFileId(folderId)) return sendJson(res, 400, { success: false, error: 'Invalid folder ID' }, req);
        const result = db.deleteFolder(folderId);
        if (!result.success) {
          return sendJson(res, 400, { success: false, error: result.error || 'Cannot delete folder', fileCount: result.fileCount }, req);
        }
        return sendJson(res, 200, { success: true }, req);
      }

      // PUT /api/files/:id/folder - Move file to folder
      if (req.method === 'PUT' && pathname.endsWith('/folder') && pathname.startsWith('/api/files/')) {
        const fileId = pathname.slice('/api/files/'.length, -'/folder'.length);
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const body = await parseBody(req);
        const ok = db.moveFileToFolder(fileId, body.folderId);
        return sendJson(res, 200, { success: ok }, req);
      }

      // GET /api/backup - Download standalone SQLite database backup file
      if (req.method === 'GET' && pathname === '/api/backup') {
        const today = new Date().toISOString().slice(0, 10);
        const fileName = `supernotes-backup-${today}.db`;
        const tempPath = path.join(os.tmpdir(), fileName);
        db.backupDatabase(tempPath);
        res.writeHead(200, {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'X-Content-Type-Options': 'nosniff'
        });
        const readStream = fs.createReadStream(tempPath);
        readStream.pipe(res);
        readStream.on('close', () => {
          try { fs.unlinkSync(tempPath); } catch (e) {}
        });
        return;
      }

      // GET /api/trash - List files in trash
      if (req.method === 'GET' && pathname === '/api/trash') {
        const trash = db.listTrash();
        return sendJson(res, 200, { success: true, trash }, req);
      }

      // POST /api/files/:id/trash - Move file to trash
      if (req.method === 'POST' && pathname.endsWith('/trash') && pathname.startsWith('/api/files/')) {
        const fileId = pathname.slice('/api/files/'.length, -'/trash'.length);
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const ok = db.moveToTrash(fileId);
        return sendJson(res, 200, { success: ok }, req);
      }

      // POST /api/files/:id/restore - Restore file from trash
      if (req.method === 'POST' && pathname.endsWith('/restore') && pathname.startsWith('/api/files/')) {
        const fileId = pathname.slice('/api/files/'.length, -'/restore'.length);
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const ok = db.restoreFile(fileId);
        return sendJson(res, 200, { success: ok }, req);
      }

      // DELETE /api/trash - Empty trash
      if (req.method === 'DELETE' && pathname === '/api/trash') {
        const count = db.emptyTrash();
        return sendJson(res, 200, { success: true, count }, req);
      }

      // GET /api/files/:id/backups - List historical snapshots for a file
      if (req.method === 'GET' && pathname.endsWith('/backups') && pathname.startsWith('/api/files/')) {
        const fileId = pathname.slice('/api/files/'.length, -'/backups'.length);
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const backups = db.listBackups(fileId);
        return sendJson(res, 200, { success: true, backups }, req);
      }

      // POST /api/files/:id/backups/:backupId/restore - Restore specific snapshot
      if (req.method === 'POST' && pathname.includes('/backups/') && pathname.endsWith('/restore')) {
        const parts = pathname.split('/');
        const fileId = parts[3];
        const backupId = parts[5];
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const restored = db.restoreBackup(fileId, backupId);
        if (!restored) return sendJson(res, 404, { success: false, error: 'Backup snapshot not found' }, req);
        return sendJson(res, 200, { success: true, file: restored }, req);
      }

      // DELETE /api/files/:id/permanent - Permanently delete a file
      if (req.method === 'DELETE' && pathname.endsWith('/permanent') && pathname.startsWith('/api/files/')) {
        const fileId = pathname.slice('/api/files/'.length, -'/permanent'.length);
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const ok = db.permanentDelete(fileId);
        return sendJson(res, 200, { success: ok }, req);
      }

      // GET /api/files/:id - Get specific file
      if (req.method === 'GET' && pathname.startsWith('/api/files/')) {
        const fileId = pathname.replace('/api/files/', '').trim();
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const file = db.getFile(fileId);
        if (!file) {
          return sendJson(res, 404, { success: false, error: 'File not found' }, req);
        }
        return sendJson(res, 200, { success: true, file }, req);
      }

      // POST /api/files - Create a file
      if (req.method === 'POST' && pathname === '/api/files') {
        const body = await parseBody(req);
        if (body.id && !isValidFileId(body.id)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const file = db.createFile(body);
        return sendJson(res, 201, { success: true, file }, req);
      }

      // PUT or POST /api/files/:id - Update a file (supports PUT and sendBeacon POST)
      if ((req.method === 'PUT' || req.method === 'POST') && pathname.startsWith('/api/files/') && !pathname.endsWith('/trash') && !pathname.endsWith('/restore') && !pathname.endsWith('/permanent') && !pathname.endsWith('/folder') && !pathname.endsWith('/backups') && pathname !== '/api/files') {
        const fileId = pathname.replace('/api/files/', '').trim();
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const body = await parseBody(req);
        const file = db.updateFile(fileId, body);
        return sendJson(res, 200, { success: true, file }, req);
      }

      // DELETE /api/files/:id - Delete a file (moves to trash)
      if (req.method === 'DELETE' && pathname.startsWith('/api/files/')) {
        const fileId = pathname.replace('/api/files/', '').trim();
        if (!isValidFileId(fileId)) return sendJson(res, 400, { success: false, error: 'Invalid file ID' }, req);
        const ok = db.moveToTrash(fileId);
        return sendJson(res, 200, { success: ok }, req);
      }

      // POST /api/migrate - Batch migrate legacy localStorage files into SQLite
      if (req.method === 'POST' && pathname === '/api/migrate') {
        const body = await parseBody(req);
        const result = db.migrateFiles(body.files);
        return sendJson(res, 200, { success: true, ...result }, req);
      }

      return sendJson(res, 404, { success: false, error: 'Endpoint not found' }, req);
    } catch (err) {
      console.error('API Error:', err.message);
      return sendJson(res, 500, { success: false, error: 'Internal server error' }, req);
    }
  }

  // ==================== STATIC FILE SERVING ====================
  const distCandidates = [
    path.join(BASE_DIR, '..', 'frontend', 'dist'),
    path.join(BASE_DIR, 'dist'),
    path.join(BASE_DIR, '..', 'dist')
  ];
  const distDir = distCandidates.find(d => fs.existsSync(path.join(d, 'index.html'))) || distCandidates[0];
  const hasDist = fs.existsSync(path.join(distDir, 'index.html'));
  const staticRoot = hasDist ? distDir : path.join(BASE_DIR, '..', 'frontend');

  const normalizedStaticRoot = path.normalize(path.resolve(staticRoot));
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.normalize(path.resolve(staticRoot, '.' + reqPath));

  // Verify filePath is strictly inside staticRoot (Path Traversal Protection)
  const relative = path.relative(normalizedStaticRoot, filePath);
  const isInsideStaticRoot = !relative.startsWith('..') && !path.isAbsolute(relative);

  if (!isInsideStaticRoot) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Block access to database files, dotfiles, scripts, and sensitive extensions
  const lower = filePath.toLowerCase();
  const isForbidden = (
    lower.includes('.git') ||
    lower.endsWith('.db') ||
    lower.endsWith('.db-wal') ||
    lower.endsWith('.db-shm') ||
    lower.endsWith('.sqlite') ||
    lower.endsWith('.sqlite3') ||
    lower.endsWith('.env') ||
    lower.endsWith('.bat') ||
    lower.endsWith('.vbs') ||
    lower.endsWith('.ps1') ||
    lower.endsWith('.sh') ||
    lower.endsWith('.cmd')
  );
  if (isForbidden) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // If hasDist is true and requested path is not a file, fallback to dist/index.html (SPA routing)
  if (hasDist && (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile())) {
    filePath = path.join(distDir, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

function openInChrome(url) {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  const chromeExe = chromePaths.find(p => fs.existsSync(p));
  if (chromeExe) {
    exec(`"${chromeExe}" --app=${url}`, err => {
      if (err) exec(`start ${url}`, () => {});
    });
  } else {
    exec(`start ${url}`, () => {});
  }
}

if (require.main === module) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const url = `http://localhost:${PORT}`;
      console.log(`\nSuperNotes is already running at ${url}. Opening in Chrome...`);
      if (process.env.NO_OPEN !== 'true' && !process.env.CI) {
        openInChrome(url);
      }
      setTimeout(() => process.exit(0), 400);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(PORT, HOST, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n========================================`);
    console.log(`  SuperNotes securely bound to: ${HOST}:${PORT}`);
    console.log(`  Access URL: ${url}`);
    console.log(`========================================\n`);

    if (process.env.NO_OPEN !== 'true' && !process.env.CI) {
      openInChrome(url);
    }
  });
}

module.exports = server;
