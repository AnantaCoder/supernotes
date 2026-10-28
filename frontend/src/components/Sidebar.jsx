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
    <aside id="sidebar" className={collapsed ? 'collapsed' : ''}>
      <div className="sidebar-header">
        <h3>📁 Files</h3>
        <div className="sidebar-header-actions">
          <button
            id="btn-new-file"
            className="sidebar-btn"
            onClick={() => onCreateFile(null, null)}
            title="New file"
          >
            + New
          </button>
          <button
            id="btn-collapse-sidebar"
            className="sidebar-icon-btn"
            onClick={onCollapse}
            title="Collapse sidebar"
          >
            ◀
          </button>
        </div>
      </div>

      <div id="file-list">
        {files.map((file) => {
          const isActive = file.id === currentFileId;
          const isEditing = editingFileId === file.id;

          return (
            <div
              key={file.id}
              className={`file-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFile(file.id)}
            >
              <span className="file-item-icon">📄</span>

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
                  />
                ) : (
                  file.name || 'Untitled'
                )}
              </span>

              <div className="file-item-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="file-action-btn"
                  onClick={() => startRename(file)}
                  title="Rename file"
                >
                  ✏️
                </button>
                <button
                  className="file-action-btn delete"
                  onClick={() => onMoveToTrash(file.id)}
                  title="Move to Trash (30-day recycle)"
                >
                  🗑️
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
          title="Click to view Trash"
        >
          <span className="trash-header-title">
            🗑️ Trash{' '}
            <span id="trash-count" className={`trash-badge ${trashFiles.length > 0 ? 'has-items' : ''}`}>
              {trashFiles.length}
            </span>
          </span>
          <span id="trash-arrow" className={`trash-toggle-icon ${trashOpen ? 'open' : ''}`}>
            ▼
          </span>
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

