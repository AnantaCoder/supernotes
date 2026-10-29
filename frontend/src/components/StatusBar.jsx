import React, { useState, useEffect } from 'react';

export function StatusBar({
  tool,
  isReadingMode,
  zoom,
  elementCount,
  selectedCount = 0,
  dbStatus,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) {
  const [now, setNow] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for native fullscreen changes (via button or F11 / Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(active);
      document.body.classList.toggle('is-fullscreen', active);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    handleFullscreenChange();
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateTooltip = now.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ' • ' + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

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

  const isSaving = dbStatus?.status === 'saving';
  const isError = dbStatus?.status === 'error';

  let saveLabel = 'Saved';
  if (isSaving) {
    saveLabel = 'Saving...';
  } else if (isError) {
    saveLabel = 'Saved locally';
  } else if (dbStatus?.text) {
    saveLabel = dbStatus.text.replace(/SQLite\s*/i, '').trim();
    if (!saveLabel || saveLabel.toLowerCase() === 'synced') saveLabel = 'Saved';
  }

  return (
    <footer id="statusbar" role="status" aria-label="Canvas status and controls">
      {/* Left: Active Tool/Mode & Element/Selection Stats */}
      <div className="statusbar-left">
        <span id="status-tool" className={`status-item ${isReadingMode ? 'status-reading-mode' : ''}`}>
          <span className="status-label">{isReadingMode ? 'Mode:' : 'Tool:'}</span>
          <span className="status-value">{toolName}</span>
        </span>

        <span className="status-separator"></span>

        <span id="status-elements" className="status-item">
          <span className="status-value">
            {elementCount === 0 ? '0 items' : `${elementCount} ${elementCount === 1 ? 'item' : 'items'}`}
            {selectedCount > 0 && (
              <span className="status-selected-count">
                ({selectedCount} selected)
              </span>
            )}
          </span>
        </span>
      </div>

      {/* Center: Centered Zoom Feature */}
      <div className="statusbar-center">
        <div id="status-zoom" className="status-zoom-pill">
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
            aria-label="Reset zoom to 100%"
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
        </div>
      </div>

      {/* Right: Auto-Save Status, Live Time Clock & Fullscreen Toggle */}
      <div className="statusbar-right">
        <span
          id="status-save"
          className={`status-save ${isSaving ? 'saving' : ''} ${isError ? 'error' : ''}`}
          title={isSaving ? 'Saving changes...' : isError ? 'Offline (saved to local backup)' : 'All changes saved'}
        >
          <span className="status-dot"></span>
          <span className="status-text">{saveLabel}</span>
        </span>

        <span className="status-separator"></span>

        <span id="status-time" className="status-item status-time-display" title={dateTooltip}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="status-time-icon">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="status-value">{timeString}</span>
        </span>

        <span className="status-separator"></span>

        {/* Fullscreen Button */}
        <button
          id="btn-fullscreen-toggle"
          className={`status-fullscreen-btn ${isFullscreen ? 'active' : ''}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            /* Compress / Exit Fullscreen icon */
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            /* Expand / Enter Fullscreen icon */
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          )}
          <span className="status-fullscreen-label">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
        </button>
      </div>
    </footer>
  );
}
