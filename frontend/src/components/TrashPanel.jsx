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
            title="Permanently delete all files in trash"
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
                    title="Restore / Recycle file"
                  >
                    ♻️ Restore
                  </button>
                  <button
                    className="trash-action-btn delete-perm"
                    onClick={() => onPermanentDelete(item.id)}
                    title="Permanently delete"
                  >
                    ✕
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

