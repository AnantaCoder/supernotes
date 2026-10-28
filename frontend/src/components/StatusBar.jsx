import React from 'react';

export function StatusBar({ tool, zoom, elementCount, dbStatus }) {
  const toolName = tool ? (tool.charAt(0).toUpperCase() + tool.slice(1)) : 'Select';
  const zoomPct = Math.round(zoom * 100) + '%';
  const statusColor = dbStatus.status === 'error' ? 'var(--danger)' : (dbStatus.status === 'saving' ? '#e67700' : 'var(--success)');

  return (
    <footer id="statusbar">
      <span id="status-tool">{toolName}</span>
      <span id="status-zoom">{zoomPct}</span>
      <span id="status-elements">{elementCount} {elementCount === 1 ? 'element' : 'elements'}</span>
      <span id="status-storage" className="status-storage" style={{ color: statusColor }}>
        🗄️ SQLite: {dbStatus.text}
      </span>
    </footer>
  );
}

