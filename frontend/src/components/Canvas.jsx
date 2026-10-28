import React, { useRef, useEffect, useState, useCallback } from 'react';
import rough from 'roughjs';
import {
  createElement,
  getBounds,
  hitTest,
  hitTestHandle,
  move,
  resize,
  normalizeElement,
  measureText
} from '../utils/elements.js';
import {
  renderElement,
  renderSelection,
  renderMarquee,
  drawGrid,
  getAdaptiveStroke
} from '../utils/renderer.js';

export function Canvas({
  elements,
  onChangeElements,
  selectedIds,
  onSelectIds,
  currentTool,
  onSetTool,
  strokeColor,
  fillColor,
  noFill,
  strokeWidth,
  fontSize,
  fontFamily,
  isBold,
  isItalic,
  isUnderline,
  zoom,
  onZoomChange,
  scrollX,
  scrollY,
  onScrollChange,
  isDark,
  showGrid = false,
  onRecordHistory
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);

  // Text editor overlay state
  const [textEdit, setTextEdit] = useState(null); // { element, canvasX, canvasY, text, bold, italic, underline, fontSize, fontFamily }

  // Interaction tracking refs
  const interactionRef = useRef({
    isInteracting: false,
    type: null, // 'drawing', 'moving', 'resizing', 'panning', 'marquee'
    startPoint: { x: 0, y: 0 },
    lastPoint: { x: 0, y: 0 },
    lastScreenPoint: { x: 0, y: 0 },
    hasMoved: false,
    currentElement: null,
    resizingElement: null,
    resizeHandle: null,
    originalBounds: null,
    originalFontSize: null,
    originalWidth: null,
    originalHeight: null,
    spacePressed: false,
    selectionBox: null
  });

  // Screen to Canvas coordinate translation
  const screenToCanvas = useCallback((screenX, screenY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - scrollX) / zoom,
      y: (screenY - rect.top - scrollY) / zoom
    };
  }, [scrollX, scrollY, zoom]);

  const canvasToContainer = useCallback((canvasX, canvasY) => {
    return {
      x: canvasX * zoom + scrollX,
      y: canvasY * zoom + scrollY
    };
  }, [scrollX, scrollY, zoom]);

  // Main canvas render loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Grid (optional, low-contrast, off by default)
    drawGrid(ctx, width, height, zoom, scrollX, scrollY, isDark, showGrid);

    // 2. Viewport transform
    ctx.translate(scrollX, scrollY);
    ctx.scale(zoom, zoom);

    const rc = rough.canvas(canvas);

    // 3. Render all elements
    for (let i = 0; i < elements.length; i++) {
      // Don't render text element that is actively being edited in overlay
      if (textEdit && textEdit.element && textEdit.element.id === elements[i].id) {
        continue;
      }
      renderElement(ctx, rc, elements[i], isDark);
    }

    // 4. Selection bounding boxes & handles
    const selectedElements = elements.filter(el => selectedIds.has(el.id));
    renderSelection(ctx, selectedElements, isDark);

    // 5. Marquee box
    if (interactionRef.current.selectionBox) {
      renderMarquee(ctx, interactionRef.current.selectionBox, isDark);
    }

    ctx.restore();
  }, [elements, selectedIds, zoom, scrollX, scrollY, isDark, showGrid, textEdit]);

  // Request animation frame render
  useEffect(() => {
    let animId = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  // Auto-resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      renderCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // Spacebar pan detection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !textEdit && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        interactionRef.current.spacePressed = true;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        interactionRef.current.spacePressed = false;
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [textEdit]);

  // Text editor auto-resize
  useEffect(() => {
    if (textareaRef.current && textEdit) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      if (textEdit.element && textEdit.element.width > 20) {
        textarea.style.width = (textEdit.element.width * zoom) + 'px';
        textarea.style.height = Math.max(38, textarea.scrollHeight + 6) + 'px';
      } else {
        textarea.style.width = Math.max(100, textarea.scrollWidth + 16) + 'px';
        textarea.style.height = Math.max(38, textarea.scrollHeight + 6) + 'px';
      }
    }
  }, [textEdit, zoom]);

  // Commit text editor
  const commitTextEditor = useCallback(() => {
    if (!textEdit) return;
    const trimmed = (textEdit.text || '').trim();
    setTextEdit(null);

    if (textEdit.element) {
      if (trimmed === '') {
        const nextElements = elements.filter(el => el.id !== textEdit.element.id);
        const nextSelected = new Set(selectedIds);
        nextSelected.delete(textEdit.element.id);
        onChangeElements(nextElements);
        onSelectIds(nextSelected);
        onRecordHistory(nextElements);
      } else {
        const changed = trimmed !== textEdit.element.text ||
                        textEdit.bold !== textEdit.element.bold ||
                        textEdit.italic !== textEdit.element.italic ||
                        textEdit.underline !== textEdit.element.underline;
        if (changed) {
          const updated = elements.map(el => {
            if (el.id === textEdit.element.id) {
              const clone = {
                ...el,
                text: trimmed,
                bold: textEdit.bold,
                italic: textEdit.italic,
                underline: textEdit.underline
              };
              const tb = measureText(clone);
              clone.height = tb.height;
              return clone;
            }
            return el;
          });
          onChangeElements(updated);
          onRecordHistory(updated);
        }
      }
    } else if (trimmed !== '') {
      const newEl = createElement('text', {
        x: textEdit.canvasX,
        y: textEdit.canvasY,
        text: trimmed,
        fontSize: textEdit.fontSize,
        fontFamily: textEdit.fontFamily,
        bold: textEdit.bold,
        italic: textEdit.italic,
        underline: textEdit.underline,
        strokeColor: strokeColor
      }, { strokeColor, fontSize, fontFamily, isBold, isItalic, isUnderline });

      const measured = measureText(newEl);
      newEl.width = measured.width;
      newEl.height = measured.height;

      const updated = [...elements, newEl];
      onChangeElements(updated);
      onSelectIds(new Set([newEl.id]));
      onRecordHistory(updated);
    }

    if (currentTool === 'text') {
      onSetTool('select');
    }
  }, [textEdit, elements, selectedIds, currentTool, strokeColor, fontSize, fontFamily, isBold, isItalic, isUnderline, onChangeElements, onSelectIds, onRecordHistory, onSetTool]);

  const cancelTextEditor = useCallback(() => {
    setTextEdit(null);
    if (currentTool === 'text') {
      onSetTool('select');
    }
  }, [currentTool, onSetTool]);

  const startTextEditing = useCallback((canvasX, canvasY, existingEl = null) => {
    const fSize = existingEl ? (existingEl.fontSize || 24) : (fontSize || 24);
    const fFamily = existingEl ? (existingEl.fontFamily || fontFamily) : fontFamily;
    const bld = existingEl ? !!existingEl.bold : !!isBold;
    const itl = existingEl ? !!existingEl.italic : !!isItalic;
    const und = existingEl ? !!existingEl.underline : !!isUnderline;

    setTextEdit({
      element: existingEl,
      canvasX: existingEl ? existingEl.x : canvasX,
      canvasY: existingEl ? existingEl.y : canvasY,
      text: existingEl ? existingEl.text : '',
      bold: bld,
      italic: itl,
      underline: und,
      fontSize: fSize,
      fontFamily: fFamily
    });

    if (existingEl) {
      onSelectIds(new Set([existingEl.id]));
    }
  }, [fontSize, fontFamily, isBold, isItalic, isUnderline, onSelectIds]);

  // Pointer event handlers
  const handlePointerDown = (e) => {
    // If text edit is active, commit it
    if (textEdit) {
      commitTextEditor();
    }

    const pt = screenToCanvas(e.clientX, e.clientY);
    const inter = interactionRef.current;
    inter.isInteracting = true;
    inter.startPoint = { x: pt.x, y: pt.y };
    inter.lastPoint = { x: pt.x, y: pt.y };
    inter.lastScreenPoint = { x: e.clientX, y: e.clientY };
    inter.hasMoved = false;

    // Middle click or Spacebar = Panning
    if (e.button === 1 || inter.spacePressed) {
      inter.type = 'panning';
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    // Left click
    if (currentTool === 'text') {
      // Prioritize clicking existing text
      const hitText = [...elements].reverse().find(el => el.type === 'text' && hitTest(el, pt.x, pt.y, 8 / zoom));
      if (hitText) {
        startTextEditing(hitText.x, hitText.y, hitText);
      } else {
        startTextEditing(pt.x, pt.y, null);
      }
      inter.isInteracting = false;
      return;
    }

    if (currentTool === 'select') {
      // 1. Check resize handle on currently selected element(s)
      const selected = elements.filter(el => selectedIds.has(el.id));
      if (selected.length === 1) {
        const handle = hitTestHandle(selected[0], pt.x, pt.y, 10 / zoom);
        if (handle) {
          inter.type = 'resizing';
          inter.resizingElement = selected[0];
          inter.resizeHandle = handle;
          inter.originalBounds = getBounds(selected[0]);
          inter.originalFontSize = selected[0].fontSize;
          inter.originalWidth = selected[0].width;
          inter.originalHeight = selected[0].height;
          return;
        }
      }

      // 2. Check hit test on elements (text prioritized first)
      let hit = [...elements].reverse().find(el => el.type === 'text' && hitTest(el, pt.x, pt.y, 8 / zoom));
      if (!hit) {
        hit = [...elements].reverse().find(el => hitTest(el, pt.x, pt.y, 8 / zoom));
      }

      if (hit) {
        if (e.shiftKey) {
          const next = new Set(selectedIds);
          if (next.has(hit.id)) next.delete(hit.id);
          else next.add(hit.id);
          onSelectIds(next);
        } else {
          if (!selectedIds.has(hit.id)) {
            onSelectIds(new Set([hit.id]));
          }
        }
        inter.type = 'moving';
      } else {
        // Marquee selection in empty space
        const initial = e.shiftKey ? new Set(selectedIds) : new Set();
        if (!e.shiftKey) onSelectIds(new Set());
        inter.type = 'marquee';
        inter.selectionBox = {
          startX: pt.x,
          startY: pt.y,
          currentX: pt.x,
          currentY: pt.y,
          initialSelected: initial
        };
      }
      return;
    }

    // Shape drawing tools
    inter.type = 'drawing';
    let newEl = null;

    if (currentTool === 'rectangle' || currentTool === 'roundRect' || currentTool === 'ellipse' || currentTool === 'diamond') {
      newEl = createElement(currentTool, {
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0
      }, { strokeColor, fillColor, noFill, strokeWidth });
    } else if (currentTool === 'line' || currentTool === 'arrow') {
      newEl = createElement(currentTool, {
        x: pt.x,
        y: pt.y,
        points: [{ x: pt.x, y: pt.y }, { x: pt.x, y: pt.y }]
      }, { strokeColor, strokeWidth });
    } else if (currentTool === 'freehand') {
      newEl = createElement('freehand', {
        x: pt.x,
        y: pt.y,
        points: [{ x: pt.x, y: pt.y }]
      }, { strokeColor, strokeWidth });
    }

    if (newEl) {
      inter.currentElement = newEl;
      onChangeElements([...elements, newEl]);
      onSelectIds(new Set([newEl.id]));
    }
  };

  const handlePointerMove = (e) => {
    const pt = screenToCanvas(e.clientX, e.clientY);
    const inter = interactionRef.current;

    // Hover cursor updates when select tool is active
    if (!inter.isInteracting && currentTool === 'select' && canvasRef.current) {
      const selected = elements.filter(el => selectedIds.has(el.id));
      if (selected.length === 1) {
        const handle = hitTestHandle(selected[0], pt.x, pt.y, 10 / zoom);
        if (handle) {
          canvasRef.current.style.cursor = handle.cursor || 'pointer';
          return;
        }
      }
      const hit = [...elements].reverse().find(el => hitTest(el, pt.x, pt.y, 8 / zoom));
      canvasRef.current.style.cursor = hit ? 'move' : 'default';
    }

    if (!inter.isInteracting) return;

    if (inter.type === 'panning') {
      const pdx = e.clientX - inter.lastScreenPoint.x;
      const pdy = e.clientY - inter.lastScreenPoint.y;
      inter.lastScreenPoint = { x: e.clientX, y: e.clientY };
      onScrollChange(scrollX + pdx, scrollY + pdy);
      return;
    }

    if (inter.type === 'moving') {
      const dx = pt.x - inter.lastPoint.x;
      const dy = pt.y - inter.lastPoint.y;
      if (Math.abs(pt.x - inter.startPoint.x) > 2 || Math.abs(pt.y - inter.startPoint.y) > 2) {
        inter.hasMoved = true;
      }
      const updated = elements.map(el => {
        if (selectedIds.has(el.id)) {
          const clone = { ...el, points: el.points ? el.points.map(p => ({ ...p })) : [] };
          if (el.controlPoint) clone.controlPoint = { ...el.controlPoint };
          move(clone, dx, dy);
          return clone;
        }
        return el;
      });
      inter.lastPoint = { x: pt.x, y: pt.y };
      onChangeElements(updated);
      return;
    }

    if (inter.type === 'resizing' && inter.resizingElement) {
      inter.hasMoved = true;
      const targetId = inter.resizingElement.id;
      const updated = elements.map(el => {
        if (el.id === targetId) {
          const clone = { ...el, points: el.points ? el.points.map(p => ({ ...p })) : [] };
          if (el.controlPoint) clone.controlPoint = { ...el.controlPoint };
          resize(
            clone,
            inter.resizeHandle.position,
            pt.x,
            pt.y,
            inter.originalBounds,
            inter.originalFontSize,
            inter.originalWidth,
            inter.originalHeight
          );
          return clone;
        }
        return el;
      });
      onChangeElements(updated);
      return;
    }

    if (inter.type === 'marquee' && inter.selectionBox) {
      inter.selectionBox.currentX = pt.x;
      inter.selectionBox.currentY = pt.y;

      const x1 = Math.min(inter.selectionBox.startX, pt.x);
      const y1 = Math.min(inter.selectionBox.startY, pt.y);
      const x2 = Math.max(inter.selectionBox.startX, pt.x);
      const y2 = Math.max(inter.selectionBox.startY, pt.y);

      const next = new Set(inter.selectionBox.initialSelected);
      elements.forEach(el => {
        const b = getBounds(el);
        const intersects = !(b.x2 < x1 || b.x > x2 || b.y2 < y1 || b.y > y2);
        if (intersects) next.add(el.id);
      });
      onSelectIds(next);
      return;
    }

    if (inter.type === 'drawing' && inter.currentElement) {
      const dElId = inter.currentElement.id;
      const updated = elements.map(el => {
        if (el.id === dElId) {
          const clone = { ...el, points: el.points ? el.points.map(p => ({ ...p })) : [] };
          if (clone.type === 'rectangle' || clone.type === 'roundRect' || clone.type === 'ellipse' || clone.type === 'diamond') {
            clone.width = pt.x - clone.x;
            clone.height = pt.y - clone.y;
          } else if (clone.type === 'line' || clone.type === 'arrow') {
            clone.points[1] = { x: pt.x, y: pt.y };
          } else if (clone.type === 'freehand') {
            clone.points.push({ x: pt.x, y: pt.y });
          }
          return clone;
        }
        return el;
      });
      onChangeElements(updated);
    }
  };

  const handlePointerUp = () => {
    const inter = interactionRef.current;
    if (!inter.isInteracting) return;

    const type = inter.type;
    const hadMoved = inter.hasMoved;
    inter.isInteracting = false;
    inter.type = null;
    inter.hasMoved = false;

    if (canvasRef.current) canvasRef.current.style.cursor = 'default';

    if (type === 'marquee') {
      inter.selectionBox = null;
      return;
    }

    if (type === 'moving' && hadMoved) {
      onRecordHistory(elements);
      return;
    }

    if (type === 'resizing') {
      if (inter.resizingElement) {
        normalizeElement(inter.resizingElement);
        inter.resizingElement = null;
        inter.resizeHandle = null;
      }
      if (hadMoved) {
        onRecordHistory(elements);
      }
      return;
    }

    if (type === 'drawing' && inter.currentElement) {
      const dEl = elements.find(el => el.id === inter.currentElement.id);
      inter.currentElement = null;

      if (dEl) {
        normalizeElement(dEl);
        const b = getBounds(dEl);
        if (b.width < 4 && b.height < 4 && (!dEl.points || dEl.points.length <= 1)) {
          const filtered = elements.filter(el => el.id !== dEl.id);
          onChangeElements(filtered);
          onSelectIds(new Set());
        } else {
          onRecordHistory(elements);
          onSetTool('select');
        }
      }
    }
  };

  const handleDoubleClick = (e) => {
    const pt = screenToCanvas(e.clientX, e.clientY);
    const hitText = [...elements].reverse().find(el => el.type === 'text' && hitTest(el, pt.x, pt.y, 8 / zoom));
    if (hitText) {
      startTextEditing(hitText.x, hitText.y, hitText);
    } else {
      startTextEditing(pt.x, pt.y, null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = 1.1;
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
      const clampedZoom = Math.max(0.1, Math.min(5, newZoom));

      const newScrollX = mouseX - (mouseX - scrollX) * (clampedZoom / zoom);
      const newScrollY = mouseY - (mouseY - scrollY) * (clampedZoom / zoom);

      onZoomChange(clampedZoom);
      onScrollChange(newScrollX, newScrollY);
    } else {
      // Pan
      onScrollChange(scrollX - e.deltaX, scrollY - e.deltaY);
    }
  };

  // Text editor overlay coordinates
  const textEditorPos = textEdit ? canvasToContainer(textEdit.canvasX, textEdit.canvasY) : { x: 0, y: 0 };
  const textEditorStroke = textEdit ? getAdaptiveStroke(strokeColor, isDark) : strokeColor;

  return (
    <div id="canvas-container" ref={containerRef}>
      <canvas
        id="canvas"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {textEdit && (
        <textarea
          id="text-input"
          ref={textareaRef}
          value={textEdit.text}
          autoFocus
          placeholder="Type text here..."
          style={{
            display: 'block',
            left: `${textEditorPos.x}px`,
            top: `${textEditorPos.y}px`,
            fontSize: `${textEdit.fontSize * zoom}px`,
            fontFamily: textEdit.fontFamily,
            fontWeight: textEdit.bold ? 'bold' : 'normal',
            fontStyle: textEdit.italic ? 'italic' : 'normal',
            textDecoration: textEdit.underline ? 'underline' : 'none',
            color: textEditorStroke
          }}
          onChange={(e) => setTextEdit(prev => ({ ...prev, text: e.target.value }))}
          onBlur={commitTextEditor}
          onKeyDown={(e) => {
            e.stopPropagation();
            if ((e.ctrlKey || e.metaKey)) {
              const k = e.key.toLowerCase();
              if (k === 'b') {
                setTextEdit(prev => ({ ...prev, bold: !prev.bold }));
                e.preventDefault();
                return;
              }
              if (k === 'i') {
                setTextEdit(prev => ({ ...prev, italic: !prev.italic }));
                e.preventDefault();
                return;
              }
              if (k === 'u') {
                setTextEdit(prev => ({ ...prev, underline: !prev.underline }));
                e.preventDefault();
                return;
              }
              if (e.key === 'Enter') {
                commitTextEditor();
                e.preventDefault();
                return;
              }
            }
            if (e.key === 'Escape') {
              cancelTextEditor();
              e.preventDefault();
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

