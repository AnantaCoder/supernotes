import React from 'react';

export function StatusBar({ tool, zoom, elementCount, dbStatus }) {
  const toolName = tool ? (tool === 'roundRect' ? 'Rounded Rectangle' : (tool.charAt(0).toUpperCase() + tool.slice(1))) : 'Select';
  const zoomPct = Math.round(zoom * 100) + '%';

  const isSaving = dbStatus.status === 'saving';
  const isError = dbStatus.status === 'error';

  let statusLabel = 'SQLite Synced';
  if (isSaving) {
    statusLabel = 'Saving to SQLite...';
  } else if (isError) {
    statusLabel = 'Offline / Local';
  } else if (dbStatus.text) {
    statusLabel = dbStatus.text;
  }

  return (
    <footer id="statusbar" role="status" aria-label="Canvas status and sync info">
      <div className="statusbar-left">
        <span id="status-tool" className="status-item">
          <span className="status-label">Tool:</span>
          <span className="status-value">{toolName}</span>
        </span>

        <span className="status-separator"></span>

        <span id="status-zoom" className="status-item">
          <span className="status-label">Zoom:</span>
          <span className="status-value">{zoomPct}</span>
        </span>

        <span className="status-separator"></span>

        <span id="status-elements" className="status-item">
          <span className="status-value">
            {elementCount === 0 ? 'No elements' : `${elementCount} ${elementCount === 1 ? 'element' : 'elements'}`}
          </span>
        </span>
      </div>

      <div className="statusbar-right">
        <span
          id="status-storage"
          className={`status-storage ${isSaving ? 'saving' : ''} ${isError ? 'error' : ''}`}
        >
          <span className="status-dot"></span>
          <span className="status-text">{statusLabel}</span>
        </span>
      </div>
    </footer>
  );
}
