const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('./db');

const PORT = process.env.PORT || 5050;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
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

  // ==================== REST API ENDPOINTS ====================
  if (pathname.startsWith('/api/')) {
    try {
      // GET /api/files - List active files
      if (req.method === 'GET' && pathname === '/api/files') {
        const files = db.listFiles();
        return sendJson(res, 200, { success: true, files });
      }

      // GET /api/backup - Download standalone SQLite database backup file
      if (req.method === 'GET' && pathname === '/api/backup') {
        const os = require('os');
        const today = new Date().toISOString().slice(0, 10);
        const fileName = `supernotes-backup-${today}.db`;
        const tempPath = path.join(os.tmpdir(), fileName);
        db.backupDatabase(tempPath);
        res.writeHead(200, {
          'Content-Type': 'application/x-sqlite3',
          'Content-Disposition': `attachment; filename="${fileName}"`
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
        return sendJson(res, 200, { success: true, trash });
      }

      // POST /api/files/:id/trash - Move file to trash
      if (req.method === 'POST' && pathname.endsWith('/trash') && pathname.startsWith('/api/files/')) {
        const fileId = pathname.slice('/api/files/'.length, -'/trash'.length);
        const ok = db.moveToTrash(fileId);
        return sendJson(res, 200, { success: ok });
      }

      // POST /api/files/:id/restore - Restore file from trash
      if (req.method === 'POST' && pathname.endsWith('/restore') && pathname.startsWith('/api/files/')) {
        const fileId = pathname.slice('/api/files/'.length, -'/restore'.length);
        const ok = db.restoreFile(fileId);
        return sendJson(res, 200, { success: ok });
      }

      // DELETE /api/trash - Empty trash
      if (req.method === 'DELETE' && pathname === '/api/trash') {
        const count = db.emptyTrash();
        return sendJson(res, 200, { success: true, count });
      }

      // DELETE /api/files/:id/permanent - Permanently delete a file
      if (req.method === 'DELETE' && pathname.endsWith('/permanent') && pathname.startsWith('/api/files/')) {
        const fileId = pathname.slice('/api/files/'.length, -'/permanent'.length);
        const ok = db.permanentDelete(fileId);
        return sendJson(res, 200, { success: ok });
      }

      // GET /api/files/:id - Get specific file
      if (req.method === 'GET' && pathname.startsWith('/api/files/')) {
        const fileId = pathname.replace('/api/files/', '').trim();
        const file = db.getFile(fileId);
        if (!file) {
          return sendJson(res, 404, { success: false, error: 'File not found' });
        }
        return sendJson(res, 200, { success: true, file });
      }

      // POST /api/files - Create a file
      if (req.method === 'POST' && pathname === '/api/files') {
        const body = await parseBody(req);
        const file = db.createFile(body);
        return sendJson(res, 201, { success: true, file });
      }

      // PUT /api/files/:id - Update a file
      if (req.method === 'PUT' && pathname.startsWith('/api/files/')) {
        const fileId = pathname.replace('/api/files/', '').trim();
        const body = await parseBody(req);
        const file = db.updateFile(fileId, body);
        return sendJson(res, 200, { success: true, file });
      }

      // DELETE /api/files/:id - Delete a file (moves to trash)
      if (req.method === 'DELETE' && pathname.startsWith('/api/files/')) {
        const fileId = pathname.replace('/api/files/', '').trim();
        const ok = db.moveToTrash(fileId);
        return sendJson(res, 200, { success: ok });
      }

      // POST /api/migrate - Batch migrate legacy localStorage files into SQLite
      if (req.method === 'POST' && pathname === '/api/migrate') {
        const body = await parseBody(req);
        const result = db.migrateFiles(body.files);
        return sendJson(res, 200, { success: true, ...result });
      }

      return sendJson(res, 404, { success: false, error: 'Endpoint not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { success: false, error: err.message || 'Server error' });
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

  let reqPath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.resolve(staticRoot, '.' + reqPath);

  // If hasDist is true and requested path is not a file, fallback to dist/index.html (SPA routing)
  if (hasDist && (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile())) {
    filePath = path.join(distDir, 'index.html');
  }

  // Prevent path traversal & forbid database / source protection
  if (!filePath.startsWith(staticRoot) || filePath.endsWith('.db') || filePath.endsWith('.sqlite')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const url = `http://localhost:${PORT}`;
      console.log(`\nSuperNotes is already running at ${url}. Opening in browser...`);
      if (process.env.NO_OPEN !== 'true' && !process.env.CI) {
        exec(`start ${url}`, () => {});
      }
      setTimeout(() => process.exit(0), 400);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n========================================`);
    console.log(`  SuperNotes with SQLite DB running at:`);
    console.log(`  ${url}`);
    console.log(`========================================\n`);

    if (process.env.NO_OPEN !== 'true' && !process.env.CI) {
      exec(`start ${url}`, () => {});
    }
  });
}

module.exports = server;
