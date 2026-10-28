import React from 'react';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function TrashPanel({
  trashFiles,
  isOpen,
  onRestore,
  onPermanentDelete,
  onEmptyTrash
}) {
  if (!isOpen) return null;

  const now = Date.now();

  return (
    <div id="trash-panel" className="trash-panel">
      <div className="trash-panel-header">
        <span className="trash-notice">Auto-deletes after 30 days</span>
        {trashFiles.length > 0 && (
          <button
            id="btn-empty-trash"
            className="trash-empty-btn"
            onClick={onEmptyTrash}
            title="Permanently empty trash"
          >
            Empty
          </button>
        )}
      </div>

      <div id="trash-list" className="trash-list">
        {trashFiles.length === 0 ? (
          <div className="trash-empty">Trash is empty</div>
        ) : (
          trashFiles.map((item) => {
            const deletedAt = item.deletedAt || now;
            const remainingMs = (deletedAt + THIRTY_DAYS_MS) - now;
            const daysLeft = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

            return (
              <div key={item.id} className="trash-item">
                <div className="trash-item-info">
                  <span className="trash-item-name" title={item.name}>
                    {item.name || 'Untitled'}
                  </span>
                  <span className="trash-item-days">
                    {daysLeft > 0 ? `${daysLeft}d left` : 'Expires today'}
                  </span>
                </div>
                <div className="trash-item-actions">
                  <button
                    className="trash-action-btn recycle"
                    onClick={() => onRestore(item.id)}
                    title="Restore file to workspace"
                    aria-label="Restore file"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    <span>Restore</span>
                  </button>
                  <button
                    className="trash-action-btn delete-perm"
                    onClick={() => onPermanentDelete(item.id)}
                    title="Permanently delete"
                    aria-label="Permanently delete"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
