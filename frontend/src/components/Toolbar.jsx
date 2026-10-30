import React from 'react';

export function Toolbar({
  currentTool,
  onSetTool,
  strokeColor,
  onChangeStrokeColor,
  fillColor,
  onChangeFillColor,
  noFill,
  onToggleNoFill,
  strokeWidth,
  onChangeStrokeWidth,
  fontFamily,
  onChangeFontFamily,
  fontSize,
  onChangeFontSize,
  isBold,
  isItalic,
  isUnderline,
  onToggleFormatting,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showGrid,
  onToggleGrid,
  isReadingMode,
  onToggleReadingMode,
  onToggleSidebar,
  sidebarCollapsed
}) {
  return (
    <div id="toolbar" role="toolbar" aria-label="Drawing and formatting tools">
      {/* Menu / Sidebar Toggle (especially handy in fullscreen or single-click access) */}
      {onToggleSidebar && (
        <>
          <div className="tool-group" id="toolbar-sidebar-group">
            <button
              id="toolbar-btn-toggle-sidebar"
              className={`tool-btn sidebar-toggle-btn ${!sidebarCollapsed ? 'active' : ''}`}
              onClick={onToggleSidebar}
              title={sidebarCollapsed ? "Open Menu / Files (Ctrl+\\)" : "Close Menu / Files (Ctrl+\\)"}
              aria-label={sidebarCollapsed ? "Open Menu" : "Close Menu"}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
          </div>
          <div className="toolbar-separator"></div>
        </>
      )}

      {/* Group 1 — Selection and drawing */}
      <div className="tool-group" id="tool-buttons">
        <button
          className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`}
          onClick={() => onSetTool('select')}
          title="Select / Move / Resize (V or 1)"
          aria-label="Select tool"
        >
          {/* Apple-style cursor pointer */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 3.5l14 10.5-6.5.5 3.5 7-2.5 1-3.5-7-5 4V3.5z" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'rectangle' ? 'active' : ''}`}
          onClick={() => onSetTool('rectangle')}
          title="Rectangle (R or 2)"
          aria-label="Rectangle tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'roundRect' ? 'active' : ''}`}
          onClick={() => onSetTool('roundRect')}
          title="Rounded Rectangle (U or 9)"
          aria-label="Rounded rectangle tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3.5" y="5.5" width="17" height="13" rx="5" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'ellipse' ? 'active' : ''}`}
          onClick={() => onSetTool('ellipse')}
          title="Ellipse / Circle (O or 3)"
          aria-label="Ellipse tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'diamond' ? 'active' : ''}`}
          onClick={() => onSetTool('diamond')}
          title="Diamond (D or 4)"
          aria-label="Diamond tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3.5L20.5 12 12 20.5 3.5 12z" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'line' ? 'active' : ''}`}
          onClick={() => onSetTool('line')}
          title="Line (L or 5)"
          aria-label="Line tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="4.5" y1="19.5" x2="19.5" y2="4.5" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'arrow' ? 'active' : ''}`}
          onClick={() => onSetTool('arrow')}
          title="Arrow (A or 6)"
          aria-label="Arrow tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4.5" y1="19.5" x2="19.5" y2="4.5" />
            <polyline points="13 4.5 19.5 4.5 19.5 11" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'freehand' ? 'active' : ''}`}
          onClick={() => onSetTool('freehand')}
          title="Handwriting Pencil (P or 7)"
          aria-label="Freehand pencil tool"
        >
          {/* Apple-style stylus / pencil outline */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'highlighter' ? 'active' : ''}`}
          onClick={() => onSetTool('highlighter')}
          title="Highlighter (H)"
          aria-label="Highlighter tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 3.5l5 5L7 22H2v-5L15.5 3.5z" />
            <path d="M13 6l5 5" />
            <line x1="2" y1="22" x2="22" y2="22" strokeWidth="1.8" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'stickyNote' ? 'active' : ''}`}
          onClick={() => onSetTool('stickyNote')}
          title="Sticky Note & Callout Annotation (S)"
          aria-label="Sticky note tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6z" />
            <polyline points="15 3 15 9 21 9" />
            <line x1="7" y1="13" x2="13" y2="13" />
            <line x1="7" y1="17" x2="11" y2="17" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'cylinder' ? 'active' : ''}`}
          onClick={() => onSetTool('cylinder')}
          title="Database (Cylinder) (C)"
          aria-label="Database cylinder tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <ellipse cx="12" cy="5" rx="8" ry="3" />
            <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'queue' ? 'active' : ''}`}
          onClick={() => onSetTool('queue')}
          title="Queue / Broker (Kafka/RabbitMQ) (Q)"
          aria-label="Message queue tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <ellipse cx="6" cy="12" rx="3" ry="7" />
            <line x1="6" y1="5" x2="18" y2="5" />
            <line x1="6" y1="19" x2="18" y2="19" />
            <path d="M18 5c1.66 0 3 3.13 3 7s-1.34 7-3 7" />
            <line x1="14" y1="6" x2="14" y2="18" />
            <line x1="10" y1="6" x2="10" y2="18" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'cloud' ? 'active' : ''}`}
          onClick={() => onSetTool('cloud')}
          title="Cloud / CDN Node (W)"
          aria-label="Cloud node tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H6.5a4.5 4.5 0 0 1-.8-8.9 5.5 5.5 0 0 1 10.6-2.1A4.5 4.5 0 0 1 17.5 19z" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'cache' ? 'active' : ''}`}
          onClick={() => onSetTool('cache')}
          title="Cache (Redis/Memcached) (M)"
          aria-label="Cache tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
            <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
            <path d="M11.5 5.5l-2 3h3l-2 3" strokeWidth="1.5" />
            <line x1="7" y1="13.5" x2="17" y2="13.5" strokeDasharray="2 2" />
            <line x1="7" y1="16.5" x2="17" y2="16.5" strokeDasharray="2 2" />
          </svg>
        </button>

        <button
          className={`tool-btn ${currentTool === 'text' ? 'active' : ''}`}
          onClick={() => onSetTool('text')}
          title="Text Box (T or 8)"
          aria-label="Text tool"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="9" y1="20" x2="15" y2="20" />
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      {/* Group 2 — Appearance */}
      <div className="tool-group" id="appearance-controls">
        {/* Stroke Color Swatch & Quick Pure Black/White dots */}
        <div className="stroke-swatches-container">
          <div className="color-swatch-wrapper" title={`Stroke Color: ${strokeColor}`}>
            <label className="color-swatch-label" htmlFor="stroke-color">
              <span className="swatch-preview" style={{ backgroundColor: strokeColor }}></span>
              <span className="swatch-text">Stroke</span>
            </label>
            <input
              type="color"
              id="stroke-color"
              className="hidden-color-input"
              value={strokeColor}
              onChange={(e) => onChangeStrokeColor(e.target.value)}
            />
          </div>

          <div className="quick-color-dots">
            <button
              type="button"
              className={`quick-dot-btn black-dot ${strokeColor === '#000000' || strokeColor.toLowerCase() === '#000000' ? 'active' : ''}`}
              onClick={() => onChangeStrokeColor('#000000')}
              title="Pure Black (#000000)"
              aria-label="Pure Black"
            />
          </div>
        </div>

        {/* Fill Color Swatch */}
        <div className="color-swatch-wrapper" title={noFill ? "No Fill (click to set fill color)" : `Fill Color: ${fillColor}`}>
          <label className="color-swatch-label" htmlFor="fill-color">
            <span
              className={`swatch-preview ${noFill ? 'no-fill-swatch' : ''}`}
              style={{ backgroundColor: noFill ? 'transparent' : fillColor }}
            >
              {noFill && <span className="swatch-slash"></span>}
            </span>
            <span className="swatch-text">Fill</span>
          </label>
          <input
            type="color"
            id="fill-color"
            className="hidden-color-input"
            value={noFill ? '#a5d8ff' : fillColor}
            onChange={(e) => onChangeFillColor(e.target.value)}
          />
        </div>

        {/* No Fill Toggle */}
        <label className="no-fill-checkbox" title="Toggle shape fill">
          <input
            type="checkbox"
            id="no-fill"
            checked={noFill}
            onChange={(e) => onToggleNoFill(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span className="checkbox-label">No fill</span>
        </label>

        {/* Stroke Width (Limited to 1, 2, 3, 4) */}
        <div className="width-control width-limited-control" title={`Stroke width: ${strokeWidth}px`}>
          <span className="width-label">Width</span>
          <div className="width-stepper-pills">
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                type="button"
                className={`width-pill-btn ${strokeWidth === w ? 'active' : ''}`}
                onClick={() => onChangeStrokeWidth(w)}
                title={`Stroke Width ${w}px`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="toolbar-separator"></div>

      {/* Group 3 — Writing */}
      <div className="tool-group" id="font-controls">
        <label className="font-select-label" title="Typography Style">
          <select
            id="font-family"
            className="toolbar-select font-family-select"
            value={fontFamily}
            onChange={(e) => onChangeFontFamily(e.target.value)}
          >
            <option value="'Patrick Hand', cursive">Handwriting</option>
            <option value="'Architects Daughter', cursive">Architect</option>
            <option value="'Kalam', cursive">Casual</option>
            <option value="Inter, sans-serif">Sans</option>
            <option value="'Fira Code', monospace">Monospace</option>
          </select>
        </label>

        <label className="font-select-label" title="Font Size">
          <select
            id="font-size"
            className="toolbar-select font-size-select"
            value={fontSize}
            onChange={(e) => onChangeFontSize(parseInt(e.target.value, 10) || 24)}
          >
            <option value="16">16px</option>
            <option value="24">24px</option>
            <option value="36">36px</option>
            <option value="48">48px</option>
          </select>
        </label>

        <div className="text-formatting-subgroup">
          <button
            id="btn-bold"
            className={`tool-btn text-style-btn ${isBold ? 'active' : ''}`}
            onClick={() => onToggleFormatting('bold')}
            title="Bold (Ctrl+B)"
            aria-label="Bold text"
          >
            <b>B</b>
          </button>
          <button
            id="btn-italic"
            className={`tool-btn text-style-btn ${isItalic ? 'active' : ''}`}
            onClick={() => onToggleFormatting('italic')}
            title="Italic (Ctrl+I)"
            aria-label="Italic text"
          >
            <i>I</i>
          </button>
          <button
            id="btn-underline"
            className={`tool-btn text-style-btn ${isUnderline ? 'active' : ''}`}
            onClick={() => onToggleFormatting('underline')}
            title="Underline (Ctrl+U)"
            aria-label="Underline text"
          >
            <u>U</u>
          </button>
        </div>
      </div>

      <div className="toolbar-separator"></div>

      {/* Group 4 — History */}
      <div className="tool-group" id="history-controls">
        <button
          id="btn-undo"
          className="tool-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          id="btn-redo"
          className="tool-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
          aria-label="Redo"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
