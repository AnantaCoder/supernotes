import React, { useRef, useState, useEffect } from 'react';
import { AppLogo } from './AppLogo.jsx';

export function Header({
  isDark,
  onToggleTheme,
  dbStatus,
  onToggleSidebar,
  sidebarCollapsed,
  showGrid,
  onToggleGrid,
  isReadingMode,
  onToggleReadingMode,
  onExport,
  onImport
}) {
  const fileInputRef = useRef(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      onImport(file);
    }
  };

  const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateTooltip = now.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ' • ' + now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Human-readable, compact status text
  const isSaving = dbStatus?.status === 'saving';
  const isError = dbStatus?.status === 'error';

  let saveLabel = 'Saved';
  if (isSaving) {
    saveLabel = 'Saving...';
  } else if (isError) {
    saveLabel = 'Offline';
  } else if (dbStatus?.text) {
    saveLabel = dbStatus.text.replace(/SQLite\s*/i, '').trim();
    if (!saveLabel || saveLabel.toLowerCase() === 'synced') saveLabel = 'Saved';
  }

  return (
    <header id="header">
      <div className="header-left">
        <button
          id="btn-toggle-sidebar"
          className={`header-btn sidebar-toggle-btn ${!sidebarCollapsed ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Toggle Sidebar (Ctrl+\)"
          aria-label="Toggle Sidebar"
        >
          {/* Apple-style sidebar toggle icon */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        <div className="brand-group">
          <AppLogo size={20} />
          <span className="app-title">SuperNotes</span>
        </div>

        <div
          id="header-time-pill"
          className={`header-time-pill ${isSaving ? 'saving' : ''} ${isError ? 'error' : ''}`}
          title={`${dateTooltip} — ${saveLabel}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="header-clock-icon">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="header-time-text">{timeString}</span>
          <span className="header-dot"></span>
          <span className="header-save-text">{saveLabel}</span>
        </div>
      </div>

      <div className="header-right">
        {onToggleGrid && (
          <button
            id="btn-grid-toggle"
            className={`header-btn grid-toggle-btn ${showGrid ? 'active' : ''}`}
            onClick={onToggleGrid}
            title={showGrid ? "Hide Grid (G)" : "Show Grid (G)"}
            aria-label="Toggle Canvas Grid"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeDasharray="1.5 2.5" />
            </svg>
            <span className="header-btn-label">Grid</span>
          </button>
        )}

        {onToggleReadingMode && (
          <button
            id="btn-reading-mode-toggle"
            className={`header-btn reading-mode-btn ${isReadingMode ? 'active' : ''}`}
            onClick={onToggleReadingMode}
            title={isReadingMode ? "Exit Reading Mode" : "Enter Reading Mode (Read Only)"}
            aria-label="Toggle Reading Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span className="header-btn-label">{isReadingMode ? 'Reading' : 'Read'}</span>
          </button>
        )}

        <button
          id="btn-theme-toggle"
          className="header-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            /* Apple-style Sun outline */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            /* Apple-style Moon outline */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          <span id="theme-toggle-text" className="header-btn-label">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <div className="header-separator"></div>

        <button
          id="btn-export"
          className="header-btn"
          onClick={onExport}
          title="Export note as JSON"
          aria-label="Export Note"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="header-btn-label">Export</span>
        </button>

        <button
          id="btn-import"
          className="header-btn"
          onClick={handleImportClick}
          title="Import note from JSON"
          aria-label="Import Note"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="header-btn-label">Import</span>
        </button>

        <button
          id="btn-backup-db"
          className="header-btn"
          onClick={() => window.open('/api/backup', '_blank')}
          title="Download complete SQLite database backup (.db snapshot for Google Drive)"
          aria-label="Backup Database"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span className="header-btn-label">Backup</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,.supernotes"
          style={{ display: 'none' }}
        />
      </div>
    </header>
  );
}
