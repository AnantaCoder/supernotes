import React, { useRef } from 'react';
import { AppLogo } from './AppLogo.jsx';

export function Header({
  isDark,
  onToggleTheme,
  dbStatus,
  onToggleSidebar,
  sidebarCollapsed,
  onExport,
  onImport
}) {
  const fileInputRef = useRef(null);

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

  return (
    <header id="header">
      <div className="header-left">
        <button
          id="btn-toggle-sidebar"
          className={`header-btn sidebar-toggle-btn ${!sidebarCollapsed ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Toggle Sidebar (Ctrl+\)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
        <AppLogo size={28} />
        <h1 className="app-title">SuperNotes</h1>
        <span
          id="db-badge"
          className={`db-badge ${dbStatus.status === 'saving' ? 'saving' : ''} ${dbStatus.status === 'error' ? 'error' : ''}`}
          title="Stored in local SQLite database (supernotes.db)"
        >
          <span className="db-dot"></span>
          <span className="db-text">{dbStatus.text}</span>
        </span>
      </div>

      <div className="header-right">
        <button
          id="btn-theme-toggle"
          className="header-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title="Toggle Dark/Light Mode"
        >
          <span id="theme-toggle-icon">{isDark ? '☀️' : '🌙'}</span>
          <span id="theme-toggle-text">{isDark ? 'Light' : 'Dark'}</span>
        </button>

        <button id="btn-export" className="header-btn" onClick={onExport} title="Export current file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>

        <button id="btn-import" className="header-btn" onClick={handleImportClick} title="Import diagram file">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import
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

