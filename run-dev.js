const { spawn, exec } = require('child_process');
const path = require('path');

const cyan = '\x1b[36m';
const magenta = '\x1b[35m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

console.log(`\n${bold}${green}==============================================${reset}`);
console.log(`${bold}${green}   Starting SuperNotes (Backend + Frontend)   ${reset}`);
console.log(`${bold}${green}==============================================${reset}\n`);

// 1. Start Backend API & SQLite (port 5050)
const backend = spawn('node', ['backend/server.js'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, NO_OPEN: 'true' }
});

backend.stdout.on('data', data => {
  const lines = data.toString().trimEnd().split('\n');
  for (const line of lines) {
    if (line.trim()) console.log(`${cyan}[backend]${reset} ${line}`);
  }
});

backend.stderr.on('data', data => {
  const lines = data.toString().trimEnd().split('\n');
  for (const line of lines) {
    if (line.trim()) console.error(`${cyan}[backend-err]${reset} ${line}`);
  }
});

// 2. Start Frontend Vite Server (port 3000 with /api proxy to 5050)
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontend = spawn(npmCmd, ['--prefix', 'frontend', 'run', 'dev'], {
  stdio: 'pipe',
  shell: true
});

frontend.stdout.on('data', data => {
  const lines = data.toString().trimEnd().split('\n');
  for (const line of lines) {
    if (line.trim()) console.log(`${magenta}[frontend]${reset} ${line}`);
  }
});

frontend.stderr.on('data', data => {
  const lines = data.toString().trimEnd().split('\n');
  for (const line of lines) {
    if (line.trim()) console.error(`${magenta}[frontend-err]${reset} ${line}`);
  }
});

// Automatically open browser once frontend is ready
let opened = false;
function openBrowser() {
  if (opened) return;
  opened = true;
  console.log(`\n${green}✓ Both services are up! Opening http://localhost:3000${reset}\n`);
  const openCmd = process.platform === 'win32' ? 'start http://localhost:3000' : 'open http://localhost:3000';
  exec(openCmd, () => {});
}

// Check for ready message from Vite
frontend.stdout.on('data', data => {
  if (data.toString().includes('Local:') || data.toString().includes('3000')) {
    openBrowser();
  }
});

let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${yellow}Stopping SuperNotes backend & frontend...${reset}`);
  
  if (process.platform === 'win32') {
    if (backend.pid) spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
    if (frontend.pid) spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
  } else {
    backend.kill('SIGINT');
    frontend.kill('SIGINT');
  }

  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

