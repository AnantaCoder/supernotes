import React from 'react';

export function StatusBar({
  tool,
  isReadingMode,
  zoom,
  elementCount,
  dbStatus,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) {
  const toolName = isReadingMode
    ? '📖 Reading (Read Only)'
    : (tool ? (
        tool === 'roundRect' ? 'Rounded Rectangle' :
        tool === 'stickyNote' ? 'Sticky Note' :
        tool === 'highlighter' ? 'Highlighter' :
        tool === 'cylinder' ? 'Database (Cylinder)' :
        tool === 'queue' ? 'Queue / Broker (Kafka/RabbitMQ)' :
        tool === 'cloud' ? 'Cloud / CDN Node' :
        tool === 'cache' ? 'Cache (Redis)' :
        (tool.charAt(0).toUpperCase() + tool.slice(1))
      ) : 'Select');
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
        <span id="status-tool" className={`status-item ${isReadingMode ? 'status-reading-mode' : ''}`}>
          <span className="status-label">{isReadingMode ? 'Mode:' : 'Tool:'}</span>
          <span className="status-value">{toolName}</span>
        </span>

        <span className="status-separator"></span>

        <span id="status-zoom" className="status-item status-zoom-controls">
          <span className="status-label">Zoom:</span>
          {onZoomOut && (
            <button
              className="status-zoom-btn"
              onClick={onZoomOut}
              title="Zoom out (Ctrl -)"
              aria-label="Zoom out"
            >
              −
            </button>
          )}
          <button
            className="status-zoom-text-btn"
            onClick={onResetZoom}
            title="Reset zoom to 100% (Ctrl 0)"
            aria-label="Reset zoom"
          >
            {zoomPct}
          </button>
          {onZoomIn && (
            <button
              className="status-zoom-btn"
              onClick={onZoomIn}
              title="Zoom in (Ctrl +)"
              aria-label="Zoom in"
            >
              +
            </button>
          )}
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
