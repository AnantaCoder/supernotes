import { useState, useEffect, useCallback, useRef } from 'react';
import { createElement } from '../utils/elements.js';

const ACTIVE_FILE_KEY = 'supernotes_active_file_id';
const LEGACY_PREFIX = 'supernotes_file_';
const TRASH_KEY = 'supernotes_trash';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function useFileManager({ onFileLoaded }) {
  const [files, setFiles] = useState([]);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [trashFiles, setTrashFiles] = useState([]);
  const [dbStatus, setDbStatus] = useState({ status: 'connected', text: 'SQLite Synced' });
  const saveTimeoutRef = useRef(null);

  // Load files and trash on mount
  useEffect(() => {
    loadFiles();
    loadTrash();
  }, []);

  const loadFiles = async () => {
    setDbStatus({ status: 'saving', text: 'Loading SQLite...' });
    let fetchedFiles = [];
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.files) && data.files.length > 0) {
        fetchedFiles = data.files;
        setDbStatus({ status: 'connected', text: 'SQLite Synced' });
      }
    } catch (err) {
      console.warn('API connection failed, trying localStorage:', err);
      setDbStatus({ status: 'error', text: 'Offline / Local' });
    }

    if (fetchedFiles.length === 0) {
      // Check legacy localStorage index
      const legacyRaw = localStorage.getItem('supernotes_files_index');
      if (legacyRaw) {
        try { fetchedFiles = JSON.parse(legacyRaw); } catch (e) {}
      }
    }

    if (!fetchedFiles || fetchedFiles.length === 0) {
      // Create starter Welcome note
      await createFile('Welcome to SuperNotes', null);
      return;
    }

    setFiles(fetchedFiles);
    const savedActiveId = localStorage.getItem(ACTIVE_FILE_KEY);
    const exists = fetchedFiles.find(f => f.id === savedActiveId);
    const targetId = exists ? savedActiveId : fetchedFiles[0].id;
    await switchFile(targetId);
  };

  const loadTrash = async () => {
    try {
      const res = await fetch('/api/trash');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.trash)) {
        setTrashFiles(data.trash);
        return;
      }
    } catch (e) {}

    // Fallback to localStorage
    const raw = localStorage.getItem(TRASH_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) || [];
        const valid = parsed.filter(f => (Date.now() - (f.deletedAt || 0)) < THIRTY_DAYS_MS);
        setTrashFiles(valid);
      } catch (e) {
        setTrashFiles([]);
      }
    }
  };

  const switchFile = async (fileId) => {
    let fileData = null;
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`);
      const data = await res.json();
      if (data && data.success && data.file) {
        fileData = data.file;
      }
    } catch (err) {}

    if (!fileData) {
      const raw = localStorage.getItem(LEGACY_PREFIX + fileId);
      if (raw) {
        try { fileData = JSON.parse(raw); } catch (e) {}
      }
    }

    if (!fileData) {
      console.error('File not found:', fileId);
      return;
    }

    setCurrentFileId(fileId);
    setCurrentFile(fileData);
    localStorage.setItem(ACTIVE_FILE_KEY, fileId);

    if (onFileLoaded) {
      onFileLoaded(fileData);
    }
  };

  const saveImmediate = useCallback(async (fileId, payload) => {
    if (!fileId) return;
    setDbStatus({ status: 'saving', text: 'Saving...' });

    // Save to local storage as safety backup
    try {
      localStorage.setItem(LEGACY_PREFIX + fileId, JSON.stringify(payload));
    } catch (e) {}

    try {
      const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.success) {
        setDbStatus({ status: 'connected', text: 'SQLite Synced' });
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: payload.name || f.name, updatedAt: Date.now() } : f));
      }
    } catch (err) {
      setDbStatus({ status: 'error', text: 'Saved Locally' });
    }
  }, []);

  const saveCurrent = useCallback((fileId, payload) => {
    if (!fileId) return;
    setDbStatus({ status: 'saving', text: 'Saving...' });
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveImmediate(fileId, payload);
    }, 400);
  }, [saveImmediate]);

  const createFile = async (name, initialElements = []) => {
    const fileName = (name || ('Diagram ' + (files.length + 1))).trim();
    const payload = {
      name: fileName,
      elements: initialElements || [],
      scrollX: 0,
      scrollY: 0,
      zoom: 1
    };

    let newFile = null;
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.success && data.file) {
        newFile = data.file;
      }
    } catch (e) {}

    if (!newFile) {
      const localId = 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      newFile = { id: localId, ...payload, createdAt: Date.now(), updatedAt: Date.now() };
      try {
        localStorage.setItem(LEGACY_PREFIX + localId, JSON.stringify(newFile));
      } catch (e) {}
    }

    setFiles(prev => [newFile, ...prev]);
    await switchFile(newFile.id);
    return newFile;
  };

  const renameFile = async (fileId, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: trimmed, updatedAt: Date.now() } : f));
    if (currentFileId === fileId) {
      setCurrentFile(prev => prev ? { ...prev, name: trimmed } : prev);
    }

    try {
      await fetch(`/api/files/${encodeURIComponent(fileId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
    } catch (e) {}
  };

  const moveToTrash = async (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const confirmed = window.confirm(`Move "${file.name || 'Untitled'}" to Trash?\n(Files in Trash auto-delete after 30 days and can be restored anytime.)`);
    if (!confirmed) return;

    const now = Date.now();
    const trashEntry = {
      id: file.id,
      name: file.name,
      createdAt: file.createdAt || now,
      updatedAt: file.updatedAt || now,
      deletedAt: now
    };

    // If deleting the only remaining note, spawn a new untitled note first
    let remainingFiles = files.filter(f => f.id !== fileId);
    if (remainingFiles.length === 0) {
      const freshNote = await createFile('Untitled Note', []);
      remainingFiles = [freshNote];
    }

    try {
      await fetch(`/api/files/${encodeURIComponent(fileId)}/trash`, { method: 'POST' });
    } catch (e) {}

    setFiles(remainingFiles);
    setTrashFiles(prev => [trashEntry, ...prev.filter(f => f.id !== fileId)]);

    if (currentFileId === fileId) {
      await switchFile(remainingFiles[0].id);
    }
  };

  const restoreFromTrash = async (fileId) => {
    const trashItem = trashFiles.find(f => f.id === fileId);
    if (!trashItem) return;

    try {
      await fetch(`/api/files/${encodeURIComponent(fileId)}/restore`, { method: 'POST' });
    } catch (e) {}

    setTrashFiles(prev => prev.filter(f => f.id !== fileId));
    const restoredEntry = { ...trashItem, updatedAt: Date.now() };
    delete restoredEntry.deletedAt;

    setFiles(prev => [restoredEntry, ...prev]);
    await switchFile(fileId);
  };

  const permanentDelete = async (fileId) => {
    const trashItem = trashFiles.find(f => f.id === fileId);
    const confirmed = window.confirm(`Permanently delete "${trashItem ? trashItem.name : 'this note'}"?\nThis cannot be undone.`);
    if (!confirmed) return;

    try {
      await fetch(`/api/files/${encodeURIComponent(fileId)}/permanent`, { method: 'DELETE' });
    } catch (e) {}

    setTrashFiles(prev => prev.filter(f => f.id !== fileId));
    localStorage.removeItem(LEGACY_PREFIX + fileId);
  };

  const emptyTrash = async () => {
    if (trashFiles.length === 0) return;
    const confirmed = window.confirm(`Empty Trash?\nAll ${trashFiles.length} item(s) will be permanently deleted.`);
    if (!confirmed) return;

    try {
      await fetch('/api/trash', { method: 'DELETE' });
    } catch (e) {}

    trashFiles.forEach(f => localStorage.removeItem(LEGACY_PREFIX + f.id));
    setTrashFiles([]);
  };

  const exportCurrentFile = (currentCanvasData) => {
    try {
      const file = files.find(f => f.id === currentFileId);
      const safeName = (file && file.name ? file.name : 'note').replace(/[^a-z0-9_\-]/gi, '_');

      const exportData = {
        type: 'supernotes',
        version: 1,
        id: currentFileId,
        name: file ? file.name : 'Untitled',
        elements: currentCanvasData.elements || [],
        scrollX: currentCanvasData.scrollX || 0,
        scrollY: currentCanvasData.scrollY || 0,
        zoom: currentCanvasData.zoom || 1,
        exportedAt: new Date().toISOString()
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = safeName + '.json';
      const container = document.body || document.documentElement;
      if (container) {
        container.appendChild(a);
        a.click();
        container.removeChild(a);
      } else {
        a.click();
      }

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert('Failed to export file: ' + err.message);
    }
  };

  const importFile = (fileObj) => {
    if (!fileObj) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const raw = e.target.result;
        const data = JSON.parse(raw);

        let rawElements = null;
        if (Array.isArray(data)) {
          rawElements = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.elements)) {
          rawElements = data.elements;
        }

        if (!rawElements) {
          throw new Error('Selected JSON does not contain valid diagram elements.');
        }

        const validElements = [];
        const allowedTypes = [
          'rectangle', 'roundRect', 'ellipse', 'diamond',
          'line', 'arrow', 'freehand', 'highlighter',
          'stickyNote', 'text', 'image',
          'cylinder', 'queue', 'cloud', 'cache'
        ];
        for (let i = 0; i < rawElements.length; i++) {
          const item = rawElements[i];
          if (item && typeof item === 'object' && allowedTypes.includes(item.type)) {
            validElements.push(createElement(item.type, item));
          }
        }

        const fileName = (data.name || fileObj.name.replace(/\.(json|supernotes)$/i, '') || 'Imported Note').trim();
        await createFile(fileName, validElements);
      } catch (err) {
        alert('Invalid diagram file: ' + (err.message || 'Check JSON schema.'));
      }
    };
    reader.readAsText(fileObj);
  };

  return {
    files,
    currentFileId,
    currentFile,
    trashFiles,
    dbStatus,
    switchFile,
    createFile,
    renameFile,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    emptyTrash,
    saveCurrent,
    saveImmediate,
    exportCurrentFile,
    importFile
  };
}

