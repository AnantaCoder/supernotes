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
  onRedo
}) {
  return (
    <div id="toolbar">
      <div className="tool-group" id="tool-buttons">
        <button
          className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`}
          onClick={() => onSetTool('select')}
          title="Select (V)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M5 3l14 11-6 0 3.5 7-2.5 1-3.5-7-5.5 4z" fill="currentColor" />
          </svg>
        </button>
        <button
          className={`tool-btn ${currentTool === 'rectangle' ? 'active' : ''}`}
          onClick={() => onSetTool('rectangle')}
          title="Rectangle (R)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <rect x="4" y="6" width="16" height="12" fill="none" stroke="currentColor" strokeWidth="2" rx="1" />
          </svg>
        </button>
        <button
          className={`tool-btn ${currentTool === 'roundRect' ? 'active' : ''}`}
          onClick={() => onSetTool('roundRect')}
          title="Rounded Rectangle (U)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <rect x="4" y="6" width="16" height="12" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          className={`tool-btn ${currentTool === 'ellipse' ? 'active' : ''}`}
          onClick={() => onSetTool('ellipse')}
          title="Ellipse (O)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <ellipse cx="12" cy="12" rx="9" ry="6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          className={`tool-btn ${currentTool === 'diamond' ? 'active' : ''}`}
          onClick={() => onSetTool('diamond')}
          title="Diamond (D)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <rect x="5" y="5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(45 12 12)" />
          </svg>
        </button>
        <button
          className={`tool-btn ${currentTool === 'line' ? 'active' : ''}`}
          onClick={() => onSetTool('line')}
          title="Line (L)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          className={`tool-btn ${currentTool === 'arrow' ? 'active' : ''}`}
          onClick={() => onSetTool('arrow')}
          title="Arrow (A)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" strokeWidth="2" />
            <polyline points="13,5 19,5 19,11" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          className={`tool-btn ${currentTool === 'freehand' ? 'active' : ''}`}
          onClick={() => onSetTool('freehand')}
          title="Pencil (P)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M4 17 Q8 9 12 13 Q16 17 20 9" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          className={`tool-btn ${currentTool === 'text' ? 'active' : ''}`}
          onClick={() => onSetTool('text')}
          title="Text (T)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor">T</text>
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="tool-group">
        <label className="color-label" title="Stroke color">
          <input
            type="color"
            id="stroke-color"
            value={strokeColor}
            onChange={(e) => onChangeStrokeColor(e.target.value)}
          />
        </label>
        <label className="color-label" title="Fill color">
          <input
            type="color"
            id="fill-color"
            value={fillColor}
            onChange={(e) => onChangeFillColor(e.target.value)}
          />
        </label>
        <label className="no-fill-label" title="Toggle fill">
          <input
            type="checkbox"
            id="no-fill"
            checked={noFill}
            onChange={(e) => onToggleNoFill(e.target.checked)}
          />
          <span>No fill</span>
        </label>
      </div>

      <div className="toolbar-separator"></div>

      <div className="tool-group">
        <label className="width-label" title="Stroke width">
          <span>Width:</span>
          <input
            type="range"
            id="stroke-width"
            min="1"
            max="12"
            value={strokeWidth}
            onChange={(e) => onChangeStrokeWidth(parseInt(e.target.value, 10) || 2)}
          />
          <span id="stroke-width-value">{strokeWidth}</span>
        </label>
      </div>

      <div className="toolbar-separator"></div>

      <div className="tool-group" id="font-controls">
        <label className="font-select-label" title="Font Family">
          <select
            id="font-family"
            className="toolbar-select"
            value={fontFamily}
            onChange={(e) => onChangeFontFamily(e.target.value)}
          >
            <option value="'Caveat', cursive">✍️ Caveat (Handwriting)</option>
            <option value="'Kalam', cursive">📝 Kalam (Handwriting)</option>
            <option value="'Indie Flower', cursive">🌸 Indie Flower (Handwriting)</option>
            <option value="'Patrick Hand', cursive">🖊️ Patrick Hand (Handwriting)</option>
            <option value="'Fira Code', monospace">💻 Monospace (Code)</option>
          </select>
        </label>
        <label className="font-select-label" title="Font Size">
          <select
            id="font-size"
            className="toolbar-select"
            value={fontSize}
            onChange={(e) => onChangeFontSize(parseInt(e.target.value, 10) || 24)}
          >
            <option value="16">16px</option>
            <option value="24">24px</option>
            <option value="36">36px</option>
            <option value="48">48px</option>
          </select>
        </label>
      </div>

      <div className="toolbar-separator"></div>

      <div className="tool-group" id="text-formatting-group">
        <button
          id="btn-bold"
          className={`tool-btn text-style-btn ${isBold ? 'active' : ''}`}
          onClick={() => onToggleFormatting('bold')}
          title="Bold (Ctrl+B)"
        >
          <b>B</b>
        </button>
        <button
          id="btn-italic"
          className={`tool-btn text-style-btn ${isItalic ? 'active' : ''}`}
          onClick={() => onToggleFormatting('italic')}
          title="Italic (Ctrl+I)"
        >
          <i>I</i>
        </button>
        <button
          id="btn-underline"
          className={`tool-btn text-style-btn ${isUnderline ? 'active' : ''}`}
          onClick={() => onToggleFormatting('underline')}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="tool-group">
        <button
          id="btn-undo"
          className="tool-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          id="btn-redo"
          className="tool-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
          </svg>
        </button>
      </div>
    </div>
  );
}

