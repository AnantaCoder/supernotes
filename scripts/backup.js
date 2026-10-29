const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('../backend/db');

function formatTimestamp(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
}

async function runBackup() {
  const timestamp = formatTimestamp();
  const backupFileName = `supernotes-backup-${timestamp}.db`;

  // 1. Ensure local backups directory exists in project
  const localBackupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(localBackupDir)) {
    fs.mkdirSync(localBackupDir, { recursive: true });
  }

  const localBackupPath = path.join(localBackupDir, backupFileName);
  console.log('Creating fresh, consistent SQLite snapshot...');
  db.backupDatabase(localBackupPath);
  const sizeKb = (fs.statSync(localBackupPath).size / 1024).toFixed(1);
  console.log(`[OK] Snapshot created: ${localBackupPath} (${sizeKb} KB)`);

  // 2. Candidate Google Drive / Cloud folders
  const userProfile = process.env.USERPROFILE || 'C:\\Users\\Default';
  const candidates = [
    'G:\\My Drive\\SuperNotes_Backups',
    'G:\\My Drive',
    path.join(userProfile, 'Google Drive', 'SuperNotes_Backups'),
    path.join(userProfile, 'Google Drive'),
    path.join(userProfile, 'OneDrive', 'SuperNotes_Backups'),
    path.join(userProfile, 'OneDrive')
  ];

  let targetCloudDir = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      targetCloudDir = c.endsWith('SuperNotes_Backups') ? c : path.join(c, 'SuperNotes_Backups');
      break;
    }
  }

  if (targetCloudDir) {
    if (!fs.existsSync(targetCloudDir)) {
      fs.mkdirSync(targetCloudDir, { recursive: true });
    }
    const cloudDest = path.join(targetCloudDir, backupFileName);
    fs.copyFileSync(localBackupPath, cloudDest);
    console.log(`[SYNCED] Backed up to Cloud Drive: ${cloudDest}`);
  } else {
    console.log(`[NOTE] Google Drive desktop folder not detected automatically.`);
    console.log(`Your backup is safely stored locally at:`);
    console.log(`  ${localBackupPath}`);
    console.log(`You can drag-and-drop this file into https://drive.google.com anytime.`);
  }

  // 3. Keep only the 10 most recent local backups to save disk space
  try {
    const allBackups = fs.readdirSync(localBackupDir)
      .filter(f => f.startsWith('supernotes-backup-') && f.endsWith('.db'))
      .map(f => ({ name: f, path: path.join(localBackupDir, f), time: fs.statSync(path.join(localBackupDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (allBackups.length > 10) {
      for (const old of allBackups.slice(10)) {
        try { fs.unlinkSync(old.path); } catch (e) {}
      }
    }
  } catch (e) {}

  return localBackupPath;
}

if (require.main === module) {
  runBackup().catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
}

module.exports = { runBackup };

