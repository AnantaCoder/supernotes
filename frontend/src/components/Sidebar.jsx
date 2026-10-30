import React, { useState, useRef, useEffect } from 'react';
import { TrashPanel } from './TrashPanel.jsx';

export function Sidebar({
  files = [],
  folders = [],
  currentFileId,
  trashFiles = [],
  collapsed,
  onCollapse,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onEmptyTrash,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFileToFolder
}) {
  const [editingFileId, setEditingFileId] = useState(null);
  const [editName, setEditName] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);

  // Folder states
  const [expandedFolderIds, setExpandedFolderIds] = useState(() => new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [movingFileId, setMovingFileId] = useState(null);

  // Right-click context menu / window state
  const [folderContextMenu, setFolderContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  // Close context menu on click outside or Escape
  useEffect(() => {
    if (!folderContextMenu) return;

    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setFolderContextMenu(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFolderContextMenu(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [folderContextMenu]);

  // Open right-click context window for folder
  const handleFolderContextMenu = (folder, e) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 240;
    const menuHeight = 190;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setFolderContextMenu({
      folder,
      x: Math.max(10, x),
      y: Math.max(10, y),
      editName: folder.name || 'Untitled Folder'
    });
  };

  // Toggle expand/collapse for folders
  const toggleFolderExpand = (folderId, e) => {
    e?.stopPropagation();
    setExpandedFolderIds(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleStartCreateFolder = () => {
    setIsCreatingFolder(true);
    setNewFolderName('');
  };

  const handleFinishCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (trimmed && onCreateFolder) {
      const created = await onCreateFolder(trimmed);
      if (created && created.id) {
        setExpandedFolderIds(prev => new Set([...prev, created.id]));
      }
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const handleStartRenameFolder = (folder, e) => {
    e?.stopPropagation();
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name || 'Untitled Folder');
  };

  const handleFinishRenameFolder = (folderId) => {
    const trimmed = editFolderName.trim();
    if (trimmed && onRenameFolder) {
      onRenameFolder(folderId, trimmed);
    }
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (folder, e) => {
    e?.stopPropagation();
    // Enforce rule: User cannot delete folder if it contains notes!
    const notesInFolder = files.filter(f => f.folderId === folder.id);
    if (notesInFolder.length > 0) {
      alert(`Cannot delete "${folder.name}": this folder contains ${notesInFolder.length} note(s).\nPlease move or delete the notes inside it first.`);
      return;
    }

    const confirmed = window.confirm(`Delete empty folder "${folder.name}"?`);
    if (confirmed && onDeleteFolder) {
      onDeleteFolder(folder.id);
    }
  };

  const startRenameFile = (file, e) => {
    e?.stopPropagation();
    setEditingFileId(file.id);
    setEditName(file.name || 'Untitled');
  };

  const submitRenameFile = (fileId) => {
    if (editingFileId === fileId && editName.trim()) {
      onRenameFile(fileId, editName.trim());
    }
    setEditingFileId(null);
  };

  // Group files: unfiled vs folder-wise
  const unfiledFiles = files.filter(f => !f.folderId);

  const renderFileItem = (file, isInsideFolder = false) => {
    const isActive = file.id === currentFileId;
    const isEditing = editingFileId === file.id;
    const isMoving = movingFileId === file.id;

    return (
      <div
        key={file.id}
        className={`file-item ${isActive ? 'active' : ''} ${isInsideFolder ? 'nested-file-item' : ''}`}
        onClick={() => onSelectFile(file.id)}
        role="listitem"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelectFile(file.id);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="file-item-icon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>

        <span className="file-item-name" onDoubleClick={(e) => startRenameFile(file, e)}>
          {isEditing ? (
            <input
              type="text"
              value={editName}
              autoFocus
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => submitRenameFile(file.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRenameFile(file.id);
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
          {/* Move to folder trigger */}
          <div className="file-move-wrapper">
            <button
              className="file-action-btn"
              onClick={() => setMovingFileId(prev => prev === file.id ? null : file.id)}
              title="Move note to folder"
              aria-label="Move to folder"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <polyline points="12 11 12 17 15 14" />
              </svg>
            </button>

            {isMoving && (
              <div className="move-folder-popup" onClick={(e) => e.stopPropagation()}>
                <div className="move-popup-header">Move note to:</div>
                <button
                  className={`move-popup-option ${!file.folderId ? 'selected' : ''}`}
                  onClick={() => {
                    onMoveFileToFolder(file.id, null);
                    setMovingFileId(null);
                  }}
                >
                  📄 Unfiled (Root)
                </button>
                {folders.map(f => (
                  <button
                    key={f.id}
                    className={`move-popup-option ${file.folderId === f.id ? 'selected' : ''}`}
                    onClick={() => {
                      onMoveFileToFolder(file.id, f.id);
                      setMovingFileId(null);
                    }}
                  >
                    📁 {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="file-action-btn"
            onClick={(e) => startRenameFile(file, e)}
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
  };

  return (
    <aside id="sidebar" className={collapsed ? 'collapsed' : ''} aria-label="Notes sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-title-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span>Workspace</span>
        </div>

        <div className="sidebar-header-actions">
          {/* New Folder Icon Button */}
          <button
            id="btn-new-folder"
            className="sidebar-icon-btn"
            onClick={handleStartCreateFolder}
            title="New folder"
            aria-label="New Folder"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </button>

          {/* New Note / File Icon Button */}
          <button
            id="btn-new-file"
            className="sidebar-icon-btn"
            onClick={() => onCreateFile(null, null)}
            title="New note"
            aria-label="New Note"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
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
        {/* Inline Create Folder Input */}
        {isCreatingFolder && (
          <div className="inline-create-folder-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <input
              type="text"
              className="inline-folder-input"
              placeholder="Folder name..."
              value={newFolderName}
              autoFocus
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishCreateFolder();
                if (e.key === 'Escape') setIsCreatingFolder(false);
              }}
              onBlur={handleFinishCreateFolder}
            />
          </div>
        )}

        {/* FOLDERS SECTION */}
        {folders.map((folder) => {
          const isExpanded = expandedFolderIds.has(folder.id);
          const isEditing = editingFolderId === folder.id;
          const folderNotes = files.filter(f => f.folderId === folder.id);
          const count = folderNotes.length;

          return (
            <div key={folder.id} className="folder-group" role="group">
              <div
                className={`folder-item ${folderContextMenu?.folder?.id === folder.id ? 'context-active' : ''}`}
                onClick={(e) => toggleFolderExpand(folder.id, e)}
                onContextMenu={(e) => handleFolderContextMenu(folder, e)}
                role="button"
                tabIndex={0}
                title={folder.name}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleFolderExpand(folder.id, e);
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`folder-chevron ${isExpanded ? 'open' : ''}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="folder-icon">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>

                <span className="folder-name" onDoubleClick={(e) => handleStartRenameFolder(folder, e)}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFolderName}
                      autoFocus
                      onChange={(e) => setEditFolderName(e.target.value)}
                      onBlur={() => handleFinishRenameFolder(folder.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRenameFolder(folder.id);
                        if (e.key === 'Escape') setEditingFolderId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Rename folder"
                    />
                  ) : (
                    folder.name
                  )}
                </span>

                <span className="folder-count-badge" title={`${count} note(s)`}>
                  {count}
                </span>
              </div>

              {/* Nested Notes inside expanded folder */}
              {isExpanded && (
                <div className="folder-notes-container">
                  {folderNotes.length === 0 ? (
                    <div className="empty-folder-hint">No notes in folder</div>
                  ) : (
                    folderNotes.map(file => renderFileItem(file, true))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* UNFILED / GENERAL NOTES SECTION */}
        {folders.length > 0 && (
          <div className="sidebar-section-divider">
            <span>Notes</span>
          </div>
        )}

        {unfiledFiles.map(file => renderFileItem(file, false))}
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

      {/* Folder Right-Click Small Window / Context Menu */}
      {folderContextMenu && (
        <div
          ref={contextMenuRef}
          className="folder-context-window"
          style={{
            top: `${folderContextMenu.y}px`,
            left: `${folderContextMenu.x}px`
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="folder-context-header">
            <div className="folder-context-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5AC58" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span className="folder-context-heading-text">{folderContextMenu.folder.name}</span>
            </div>
            <button
              type="button"
              className="folder-context-close-btn"
              onClick={() => setFolderContextMenu(null)}
              title="Close"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="folder-context-rename-section">
            <label className="folder-context-label">Rename Folder</label>
            <div className="folder-context-rename-row">
              <input
                type="text"
                className="folder-context-input"
                value={folderContextMenu.editName}
                autoFocus
                onChange={(e) => setFolderContextMenu(prev => ({ ...prev, editName: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = folderContextMenu.editName.trim();
                    if (trimmed && onRenameFolder) {
                      onRenameFolder(folderContextMenu.folder.id, trimmed);
                    }
                    setFolderContextMenu(null);
                  } else if (e.key === 'Escape') {
                    setFolderContextMenu(null);
                  }
                }}
                placeholder="Folder name..."
              />
              <button
                type="button"
                className="folder-context-save-btn"
                onClick={() => {
                  const trimmed = folderContextMenu.editName.trim();
                  if (trimmed && onRenameFolder) {
                    onRenameFolder(folderContextMenu.folder.id, trimmed);
                  }
                  setFolderContextMenu(null);
                }}
              >
                Rename
              </button>
            </div>
          </div>

          <div className="folder-context-divider" />

          <div className="folder-context-actions">
            <button
              type="button"
              className="folder-context-action-btn"
              onClick={() => {
                setExpandedFolderIds(prev => new Set([...prev, folderContextMenu.folder.id]));
                onCreateFile(null, null, folderContextMenu.folder.id);
                setFolderContextMenu(null);
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New note in this folder</span>
            </button>

            {(() => {
              const folderNotes = files.filter(f => f.folderId === folderContextMenu.folder.id);
              const hasNotes = folderNotes.length > 0;
              return (
                <button
                  type="button"
                  className={`folder-context-action-btn delete-btn ${hasNotes ? 'disabled' : ''}`}
                  onClick={() => {
                    if (hasNotes) {
                      alert(`Cannot delete "${folderContextMenu.folder.name}": this folder contains ${folderNotes.length} note(s).\nPlease move or delete the notes inside it first.`);
                      return;
                    }
                    const confirmed = window.confirm(`Delete empty folder "${folderContextMenu.folder.name}"?`);
                    if (confirmed && onDeleteFolder) {
                      onDeleteFolder(folderContextMenu.folder.id);
                    }
                    setFolderContextMenu(null);
                  }}
                  title={hasNotes ? `Cannot delete: contains ${folderNotes.length} note(s)` : 'Delete folder'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>{hasNotes ? `Delete (${folderNotes.length} notes inside)` : 'Delete folder'}</span>
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </aside>
  );
}
