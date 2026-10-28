import React, { useState } from 'react';
import { TrashPanel } from './TrashPanel.jsx';

export function Sidebar({
  files,
  currentFileId,
  trashFiles,
  collapsed,
  onCollapse,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onEmptyTrash
}) {
  const [editingFileId, setEditingFileId] = useState(null);
  const [editName, setEditName] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);

  const startRename = (file) => {
    setEditingFileId(file.id);
    setEditName(file.name || 'Untitled');
  };

  const submitRename = (fileId) => {
    if (editingFileId === fileId && editName.trim()) {
      onRenameFile(fileId, editName.trim());
    }
    setEditingFileId(null);
  };

  return (
    <aside id="sidebar" className={collapsed ? 'collapsed' : ''} aria-label="Notes sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-title-icon">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>Files</span>
        </div>

        <div className="sidebar-header-actions">
          <button
            id="btn-new-file"
            className="sidebar-btn"
            onClick={() => onCreateFile(null, null)}
            title="Create new note"
            aria-label="New Note"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New</span>
          </button>

          <button
            id="btn-collapse-sidebar"
            className="sidebar-icon-btn"
            onClick={onCollapse}
            title="Collapse sidebar (Ctrl+\)"
            aria-label="Collapse sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </div>

      <div id="file-list" role="list">
        {files.map((file) => {
          const isActive = file.id === currentFileId;
          const isEditing = editingFileId === file.id;

          return (
            <div
              key={file.id}
              className={`file-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFile(file.id)}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelectFile(file.id);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="file-item-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>

              <span className="file-item-name" onDoubleClick={() => startRename(file)}>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => submitRename(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename(file.id);
                      if (e.key === 'Escape') setEditingFileId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Rename note"
                  />
                ) : (
                  file.name || 'Untitled'
                )}
              </span>

              <div className="file-item-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="file-action-btn"
                  onClick={() => startRename(file)}
                  title="Rename note"
                  aria-label="Rename Note"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
                <button
                  className="file-action-btn delete"
                  onClick={() => onMoveToTrash(file.id)}
                  title="Move to Trash"
                  aria-label="Move to Trash"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-trash-section">
        <div
          id="btn-toggle-trash"
          className="trash-header"
          onClick={() => setTrashOpen(prev => !prev)}
          title="Toggle Trash Panel"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setTrashOpen(prev => !prev);
          }}
        >
          <span className="trash-header-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="trash-icon">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Trash</span>
            <span id="trash-count" className={`trash-badge ${trashFiles.length > 0 ? 'has-items' : ''}`}>
              {trashFiles.length}
            </span>
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`trash-toggle-icon ${trashOpen ? 'open' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <TrashPanel
          trashFiles={trashFiles}
          isOpen={trashOpen}
          onRestore={onRestoreFromTrash}
          onPermanentDelete={onPermanentDelete}
          onEmptyTrash={onEmptyTrash}
        />
      </div>
    </aside>
  );
}
