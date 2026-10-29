import React, { useRef, useEffect, useState, useCallback } from 'react';
import rough from 'roughjs';
import {
  createElement,
  getBounds,
  getConnectionPoints,
  hitTest,
  hitTestHandle,
  move,
  resize,
  normalizeElement,
  measureText,
  getWrappedTextLines
} from '../utils/elements.js';
import {
  renderElement,
  renderSelection,
  renderMarquee,
  renderHoveredConnectionPoints,
  drawGrid,
  getAdaptiveStroke,
  PASTEL_PALETTE,
  resolvePastelTint
} from '../utils/renderer.js';

const CALLOUT_PRESETS = [
  { id: 'Bottleneck', label: '⚠️ Bottleneck', tint: 'rose' },
  { id: 'Trade-off',  label: '⚖️ Trade-off',  tint: 'green' },
  { id: 'Latency',    label: '⚡ Latency',    tint: 'blue' },
  { id: 'Note',       label: '📌 Note',       tint: 'yellow' },
  { id: 'Decision',   label: '💡 Decision',   tint: 'purple' }
];

const SNAP_RADIUS = 18; // canvas units

function findNearestConnectionPoint(elements, px, py, excludeId, zoom) {
  const snapDist = SNAP_RADIUS / zoom;
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.id === excludeId) continue;
    const pts = getConnectionPoints(el);
    for (let j = 0; j < pts.length; j++) {
      const pt = pts[j];
      const dx = pt.x - px;
      const dy = pt.y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < snapDist && d < bestDist) {
        bestDist = d;
        best = pt;
      }
    }
  }
  return best;
}

function updateBoundArrows(elements, movedIds) {
  // For any arrow/line with startBinding or endBinding pointing to a moved element,
  // recompute the bound endpoint position.
  return elements.map(el => {
    if (el.type !== 'arrow' && el.type !== 'line') return el;
    const hasStart = el.startBinding && movedIds.has(el.startBinding.elementId);
    const hasEnd = el.endBinding && movedIds.has(el.endBinding.elementId);
    if (!hasStart && !hasEnd) return el;

    const clone = { ...el, points: el.points ? el.points.map(p => ({ ...p })) : [] };
    if (el.controlPoint) clone.controlPoint = { ...el.controlPoint };

    // Capture old midpoint and bend offset before endpoints change
    const oldP0 = el.points && el.points.length > 0 ? el.points[0] : null;
    const oldP1 = el.points && el.points.length > 1 ? el.points[el.points.length - 1] : null;
    const oldMidX = (oldP0 && oldP1) ? (oldP0.x + oldP1.x) / 2 : 0;
    const oldMidY = (oldP0 && oldP1) ? (oldP0.y + oldP1.y) / 2 : 0;
    const bendOffsetX = el.controlPoint ? (el.controlPoint.x - oldMidX) : 0;
    const bendOffsetY = el.controlPoint ? (el.controlPoint.y - oldMidY) : 0;

    if (hasStart) {
      const boundEl = elements.find(e => e.id === el.startBinding.elementId);
      if (boundEl) {
        const pts = getConnectionPoints(boundEl);
        const cp = pts.find(p => p.id === el.startBinding.pointId);
        if (cp && clone.points.length > 0) {
          clone.points[0] = { x: cp.x, y: cp.y };
        }
      }
    }
    if (hasEnd) {
      const boundEl = elements.find(e => e.id === el.endBinding.elementId);
      if (boundEl) {
        const pts = getConnectionPoints(boundEl);
        const cp = pts.find(p => p.id === el.endBinding.pointId);
        if (cp && clone.points.length > 0) {
          clone.points[clone.points.length - 1] = { x: cp.x, y: cp.y };
        }
      }
    }

    // Preserve the user's curve offset relative to the new chord midpoint
    if (clone.controlPoint && (hasStart || hasEnd) && clone.points.length >= 2) {
      const p0 = clone.points[0];
      const p1 = clone.points[clone.points.length - 1];
      const newMidX = (p0.x + p1.x) / 2;
      const newMidY = (p0.y + p1.y) / 2;
      clone.controlPoint = { x: newMidX + bendOffsetX, y: newMidY + bendOffsetY };
    }

    return clone;
  });
}

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
  onRecordHistory,
  isReadingMode = false,
  onToggleReadingMode
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);

  // Text editor overlay state
  const [textEdit, setTextEdit] = useState(null);

  // Snap overlay state (tracked as refs to avoid re-renders during drawing)
  const snapStateRef = useRef({
    hoveredPoints: [],       // connection points on hovered shape
    nearestPoint: null,      // the snappable point
    drawingArrowId: null,    // id of arrow being drawn (to exclude from snap search)
  });
  // This state triggers a re-render of the canvas overlay ONLY when snap changes
  const [snapVersion, setSnapVersion] = useState(0);
  const bumpSnap = useCallback(() => setSnapVersion(v => v + 1), []);

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
    selectionBox: null,
    // Snap state for active drawing
    pendingStartBinding: null,
    pendingEndBinding: null,
    drawingArrowId: null,
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

    // 1. Grid
    drawGrid(ctx, width, height, zoom, scrollX, scrollY, isDark, showGrid);

    // 2. Viewport transform
    ctx.translate(scrollX, scrollY);
    ctx.scale(zoom, zoom);

    const rc = rough.canvas(canvas);

    // 3. Render all elements
    // Render highlighters first so they sit underneath regular ink/shapes
    const highlighters = [];
    const regularElements = [];
    for (let i = 0; i < elements.length; i++) {
      if (textEdit && textEdit.element && textEdit.element.id === elements[i].id) {
        if (elements[i].type === 'stickyNote' || ['cylinder', 'queue', 'cloud', 'cache'].includes(elements[i].type)) {
          regularElements.push({ ...elements[i], text: '' });
        }
        continue;
      }
      if (elements[i].type === 'highlighter') {
        highlighters.push(elements[i]);
      } else {
        regularElements.push(elements[i]);
      }
    }

    for (let i = 0; i < highlighters.length; i++) {
      renderElement(ctx, rc, highlighters[i], isDark);
    }
    for (let i = 0; i < regularElements.length; i++) {
      renderElement(ctx, rc, regularElements[i], isDark);
    }

    if (!isReadingMode) {
      // 4. Snap indicators (connection points on hovered shape + nearest point highlight)
      const snap = snapStateRef.current;
      if (snap.hoveredPoints.length > 0) {
        renderHoveredConnectionPoints(ctx, snap.hoveredPoints, snap.nearestPoint, isDark);
      }

      // 5. Selection
      const selectedElements = elements.filter(el => selectedIds.has(el.id));
      renderSelection(ctx, selectedElements, isDark);

      // 6. Marquee
      if (interactionRef.current.selectionBox) {
        renderMarquee(ctx, interactionRef.current.selectionBox, isDark);
      }
    }

    ctx.restore();
  }, [elements, selectedIds, zoom, scrollX, scrollY, isDark, showGrid, textEdit, snapVersion, isReadingMode]);

  useEffect(() => {
    let animId = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

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

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = isReadingMode ? 'grab' : 'default';
    }
  }, [isReadingMode]);

  useEffect(() => {
    if (textareaRef.current && textEdit) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      if (textEdit.element && textEdit.element.type === 'stickyNote') {
        const pad = 14 * zoom;
        const availableW = Math.max(60, (textEdit.element.width * zoom) - pad * 2);
        textarea.style.width = availableW + 'px';
        const topOffset = (textEdit.element.calloutTag ? 46 : 28) * zoom;
        const neededH = Math.max(
          (textEdit.element.height * zoom) - topOffset,
          textarea.scrollHeight
        );
        textarea.style.height = neededH + 'px';
      } else if (textEdit.element && ['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element.type)) {
        const pad = 24 * zoom;
        const availableW = Math.max(80, (textEdit.element.width * zoom) - pad);
        textarea.style.width = availableW + 'px';
        textarea.style.height = Math.max(34, textarea.scrollHeight + 4) + 'px';
      } else if (textEdit.element && textEdit.element.hasCustomWidth && textEdit.element.width > 20) {
        textarea.style.width = (textEdit.element.width * zoom) + 'px';
        textarea.style.height = Math.max(38, textarea.scrollHeight + 6) + 'px';
      } else {
        // Auto-width text box: measure natural text width dynamically to avoid premature wrapping
        const tb = measureText({
          type: 'text',
          text: textEdit.text || 'W',
          fontSize: textEdit.fontSize || 24,
          fontFamily: textEdit.fontFamily || "'Patrick Hand', cursive",
          bold: textEdit.bold,
          italic: textEdit.italic,
          hasCustomWidth: false
        });
        const dynamicW = Math.max(90, Math.ceil((tb.width + 16) * zoom));
        textarea.style.width = dynamicW + 'px';
        textarea.style.height = Math.max(38, textarea.scrollHeight + 6) + 'px';
      }
    }
  }, [textEdit, zoom]);

  const commitTextEditor = useCallback(() => {
    if (!textEdit) return;
    const current = textEdit;
    setTextEdit(null);

    const actualText = (textareaRef.current && textareaRef.current.value !== undefined)
      ? textareaRef.current.value
      : (current.text || '');
    const trimmed = actualText.trim();
    const isSticky = current.element && current.element.type === 'stickyNote';
    const isArch = current.element && ['cylinder', 'queue', 'cloud', 'cache'].includes(current.element.type);

    try {
      if (current.element) {
        if (trimmed === '' && !isSticky && !isArch) {
          const nextElements = elements.filter(el => el.id !== current.element.id);
          const nextSelected = new Set(selectedIds);
          nextSelected.delete(current.element.id);
          onChangeElements(nextElements);
          onSelectIds(nextSelected);
          onRecordHistory(nextElements);
        } else {
          const updated = elements.map(el => {
            if (el.id === current.element.id) {
              const clone = {
                ...el,
                text: actualText,
                bold: current.bold,
                italic: current.italic,
                underline: current.underline
              };
              if (isSticky) {
                const maxWidth = Math.max(60, (clone.width || 180) - 28);
                const lines = getWrappedTextLines(clone, maxWidth);
                const fSize = clone.fontSize || 20;
                const topPad = clone.calloutTag ? 46 : 28;
                const neededHeight = Math.max(160, topPad + lines.length * fSize * 1.35 + 8);
                clone.height = Math.max(clone.height || 160, neededHeight);
              } else if (isArch) {
                clone.text = actualText;
              } else {
                const tb = measureText(clone);
                if (!clone.hasCustomWidth) {
                  clone.width = tb.width;
                }
                clone.height = tb.height;
              }
              return clone;
            }
            return el;
          });
          onChangeElements(updated);
          onRecordHistory(updated);
        }
      } else if (trimmed !== '') {
        const newEl = createElement('text', {
          x: current.canvasX,
          y: current.canvasY,
          text: trimmed,
          fontSize: current.fontSize,
          fontFamily: current.fontFamily,
          bold: current.bold,
          italic: current.italic,
          underline: current.underline,
          strokeColor: strokeColor,
          hasCustomWidth: false
        }, { strokeColor, fontSize, fontFamily, isBold, isItalic, isUnderline });

        const measured = measureText(newEl);
        newEl.width = measured.width;
        newEl.height = measured.height;

        const updated = [...elements, newEl];
        onChangeElements(updated);
        onSelectIds(new Set([newEl.id]));
        onRecordHistory(updated);
      }
    } catch (err) {
      console.error('Error committing text editor:', err);
    }

    if (currentTool === 'text') {
      onSetTool('select');
    }
  }, [textEdit, elements, selectedIds, currentTool, strokeColor, fontSize, fontFamily, isBold, isItalic, isUnderline, onChangeElements, onSelectIds, onRecordHistory, onSetTool]);

  const cancelTextEditor = useCallback(() => {
    setTextEdit(null);
    if (currentTool === 'text') onSetTool('select');
  }, [currentTool, onSetTool]);

  const startTextEditing = useCallback((canvasX, canvasY, existingEl = null) => {
    const fSize = existingEl ? (existingEl.fontSize || 20) : (fontSize || 24);
    const fFamily = existingEl ? (existingEl.fontFamily || fontFamily) : fontFamily;
    const bld = existingEl ? !!existingEl.bold : !!isBold;
    const itl = existingEl ? !!existingEl.italic : !!isItalic;
    const und = existingEl ? !!existingEl.underline : !!isUnderline;

    let posX = canvasX;
    let posY = canvasY;
    if (existingEl) {
      if (existingEl.type === 'stickyNote') {
        posX = existingEl.x + 14;
        posY = existingEl.y + (existingEl.calloutTag ? 36 : 14);
      } else if (['cylinder', 'queue', 'cloud', 'cache'].includes(existingEl.type)) {
        const b = getBounds(existingEl);
        posX = b.x + 12;
        posY = b.y + b.height / 2 - 16;
      } else {
        posX = existingEl.x;
        posY = existingEl.y;
      }
    }

    setTextEdit({
      element: existingEl,
      canvasX: posX,
      canvasY: posY,
      text: existingEl ? (existingEl.text || '') : '',
      bold: bld, italic: itl, underline: und,
      fontSize: fSize, fontFamily: fFamily
    });

    if (existingEl) onSelectIds(new Set([existingEl.id]));
  }, [fontSize, fontFamily, isBold, isItalic, isUnderline, onSelectIds]);

  // Pointer event handlers
  const handlePointerDown = (e) => {
    if (textEdit) commitTextEditor();

    if (isReadingMode) {
      if (e.button === 0 || e.button === 1 || interactionRef.current.spacePressed) {
        const pt = screenToCanvas(e.clientX, e.clientY);
        const inter = interactionRef.current;
        inter.isInteracting = true;
        inter.type = 'panning';
        inter.startPoint = { x: pt.x, y: pt.y };
        inter.lastPoint = { x: pt.x, y: pt.y };
        inter.lastScreenPoint = { x: e.clientX, y: e.clientY };
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      }
      return;
    }

    if (e.button !== 0 && e.button !== 1 && !interactionRef.current.spacePressed) {
      return;
    }

    const pt = screenToCanvas(e.clientX, e.clientY);
    const inter = interactionRef.current;
    inter.isInteracting = true;
    inter.startPoint = { x: pt.x, y: pt.y };
    inter.lastPoint = { x: pt.x, y: pt.y };
    inter.lastScreenPoint = { x: e.clientX, y: e.clientY };
    inter.hasMoved = false;
    inter.pendingStartBinding = null;
    inter.pendingEndBinding = null;
    inter.drawingArrowId = null;

    if (e.button === 1 || inter.spacePressed) {
      inter.type = 'panning';
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    if (currentTool === 'text') {
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

      let hit = [...elements].reverse().find(el => el.type === 'text' && hitTest(el, pt.x, pt.y, 8 / zoom));
      if (!hit) hit = [...elements].reverse().find(el => hitTest(el, pt.x, pt.y, 8 / zoom));

      if (hit) {
        if (e.shiftKey) {
          const next = new Set(selectedIds);
          if (next.has(hit.id)) next.delete(hit.id);
          else next.add(hit.id);
          onSelectIds(next);
        } else {
          if (!selectedIds.has(hit.id)) onSelectIds(new Set([hit.id]));
        }
        inter.type = 'moving';
      } else {
        const initial = e.shiftKey ? new Set(selectedIds) : new Set();
        if (!e.shiftKey) onSelectIds(new Set());
        inter.type = 'marquee';
        inter.selectionBox = { startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y, initialSelected: initial };
      }
      return;
    }

    // Shape/line/arrow/drawing tools
    inter.type = 'drawing';
    let newEl = null;

    if (['rectangle', 'roundRect', 'ellipse', 'diamond'].includes(currentTool)) {
      newEl = createElement(currentTool, { x: pt.x, y: pt.y, width: 0, height: 0 }, { strokeColor, fillColor, noFill, strokeWidth });
    } else if (currentTool === 'cylinder') {
      newEl = createElement('cylinder', {
        x: pt.x, y: pt.y, width: 0, height: 0,
        text: '',
        fillColor: noFill ? 'transparent' : (fillColor !== 'transparent' ? fillColor : (isDark ? '#263445' : '#E8F3FF'))
      }, { strokeColor, fillColor, noFill, strokeWidth });
    } else if (currentTool === 'queue') {
      newEl = createElement('queue', {
        x: pt.x, y: pt.y, width: 0, height: 0,
        text: '',
        fillColor: noFill ? 'transparent' : (fillColor !== 'transparent' ? fillColor : (isDark ? '#3D2D1E' : '#FFF7ED'))
      }, { strokeColor, fillColor, noFill, strokeWidth });
    } else if (currentTool === 'cloud') {
      newEl = createElement('cloud', {
        x: pt.x, y: pt.y, width: 0, height: 0,
        text: '',
        fillColor: noFill ? 'transparent' : (fillColor !== 'transparent' ? fillColor : (isDark ? '#1E2F3D' : '#F0F9FF'))
      }, { strokeColor, fillColor, noFill, strokeWidth });
    } else if (currentTool === 'cache') {
      newEl = createElement('cache', {
        x: pt.x, y: pt.y, width: 0, height: 0,
        text: '',
        fillColor: noFill ? 'transparent' : (fillColor !== 'transparent' ? fillColor : (isDark ? '#3B1F24' : '#FEF2F2'))
      }, { strokeColor, fillColor, noFill, strokeWidth });
    } else if (currentTool === 'stickyNote') {
      const defaultBg = isDark ? '#36301A' : '#FEF08A';
      const defaultBorder = isDark ? '#786624' : '#EAB308';
      newEl = createElement('stickyNote', {
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
        fillColor: defaultBg,
        strokeColor: defaultBorder,
        fontSize: fontSize || 20,
        fontFamily: fontFamily || "'Patrick Hand', cursive",
        text: '',
        tint: 'yellow'
      }, { strokeColor, fillColor, strokeWidth, fontSize, fontFamily, isDark });
    } else if (currentTool === 'line' || currentTool === 'arrow') {
      // Check if starting on a connection point
      const startSnap = findNearestConnectionPoint(elements, pt.x, pt.y, null, zoom);
      const startPt = startSnap ? { x: startSnap.x, y: startSnap.y } : { x: pt.x, y: pt.y };
      newEl = createElement(currentTool, {
        x: startPt.x,
        y: startPt.y,
        points: [{ x: startPt.x, y: startPt.y }, { x: startPt.x, y: startPt.y }]
      }, { strokeColor, strokeWidth });
      if (startSnap) {
        inter.pendingStartBinding = { elementId: startSnap.elementId, pointId: startSnap.id };
      }
    } else if (currentTool === 'freehand') {
      newEl = createElement('freehand', { x: pt.x, y: pt.y, points: [{ x: pt.x, y: pt.y }] }, { strokeColor, strokeWidth });
    } else if (currentTool === 'highlighter') {
      let hlColor = strokeColor;
      if (hlColor === '#252525' || hlColor === '#1e1e1e' || hlColor === '#f2f2f0') {
        hlColor = '#ffd43b';
      }
      newEl = createElement('highlighter', {
        x: pt.x,
        y: pt.y,
        points: [{ x: pt.x, y: pt.y }],
        strokeColor: hlColor,
        strokeWidth: Math.max(18, strokeWidth * 3),
        opacity: isDark ? 0.45 : 0.38
      }, { strokeColor: hlColor, strokeWidth });
    }

    if (newEl) {
      inter.currentElement = newEl;
      inter.drawingArrowId = newEl.id;
      onChangeElements([...elements, newEl]);
      onSelectIds(new Set([newEl.id]));
    }
  };

  const handlePointerMove = (e) => {
    if (isReadingMode) {
      const inter = interactionRef.current;
      if (inter.isInteracting && inter.type === 'panning') {
        const pdx = e.clientX - inter.lastScreenPoint.x;
        const pdy = e.clientY - inter.lastScreenPoint.y;
        inter.lastScreenPoint = { x: e.clientX, y: e.clientY };
        onScrollChange(scrollX + pdx, scrollY + pdy);
      } else if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
      return;
    }

    const pt = screenToCanvas(e.clientX, e.clientY);
    const inter = interactionRef.current;

    // Snap indicator update when drawing arrow/line (hover preview, not actively dragging)
    if ((currentTool === 'arrow' || currentTool === 'line') && !inter.isInteracting) {
      let hoveredPoints = [];
      let nearestPoint = null;
      const nearest = findNearestConnectionPoint(elements, pt.x, pt.y, null, zoom);
      if (nearest) {
        const el = elements.find(e => e.id === nearest.elementId);
        if (el) hoveredPoints = getConnectionPoints(el);
        nearestPoint = nearest;
      } else {
        // Show connection points on hovered shape
        const hovered = [...elements].reverse().find(el =>
          ['rectangle', 'roundRect', 'ellipse', 'diamond'].includes(el.type) &&
          hitTest(el, pt.x, pt.y, 10 / zoom)
        );
        if (hovered) hoveredPoints = getConnectionPoints(hovered);
      }
      const snap = snapStateRef.current;
      const changed = snap.hoveredPoints.length !== hoveredPoints.length || snap.nearestPoint !== nearestPoint;
      if (changed) {
        snapStateRef.current = { hoveredPoints, nearestPoint, drawingArrowId: null };
        bumpSnap();
      }
    } else if (!inter.isInteracting) {
      // Clear snap when not drawing arrow and not interacting
      if (snapStateRef.current.hoveredPoints.length > 0 || snapStateRef.current.nearestPoint) {
        snapStateRef.current = { hoveredPoints: [], nearestPoint: null, drawingArrowId: null };
        bumpSnap();
      }
    }

    // Hover cursor updates
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
      // Move selected elements
      let updated = elements.map(el => {
        if (selectedIds.has(el.id)) {
          const clone = { ...el, points: el.points ? el.points.map(p => ({ ...p })) : [] };
          if (el.controlPoint) clone.controlPoint = { ...el.controlPoint };
          move(clone, dx, dy);
          return clone;
        }
        return el;
      });
      // Update arrows bound to moved shapes
      updated = updateBoundArrows(updated, selectedIds);
      inter.lastPoint = { x: pt.x, y: pt.y };
      onChangeElements(updated);
      return;
    }

    if (inter.type === 'resizing' && inter.resizingElement) {
      inter.hasMoved = true;
      const targetId = inter.resizingElement.id;
      let updated = elements.map(el => {
        if (el.id === targetId) {
          const clone = { ...el, points: el.points ? el.points.map(p => ({ ...p })) : [] };
          if (el.controlPoint) clone.controlPoint = { ...el.controlPoint };
          resize(clone, inter.resizeHandle.position, pt.x, pt.y, inter.originalBounds, inter.originalFontSize, inter.originalWidth, inter.originalHeight);
          return clone;
        }
        return el;
      });
      // Also update arrows bound to resized element
      updated = updateBoundArrows(updated, new Set([targetId]));
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
        if (!(b.x2 < x1 || b.x > x2 || b.y2 < y1 || b.y > y2)) next.add(el.id);
      });
      onSelectIds(next);
      return;
    }

    if (inter.type === 'drawing' && inter.currentElement) {
      const dElId = inter.currentElement.id;

      // For arrow/line: check end snap
      let endSnap = null;
      if (inter.currentElement.type === 'arrow' || inter.currentElement.type === 'line') {
        endSnap = findNearestConnectionPoint(elements, pt.x, pt.y, dElId, zoom);
        // Update snap overlay
        let hoveredPoints = [];
        if (endSnap) {
          const el = elements.find(e => e.id === endSnap.elementId);
          if (el) hoveredPoints = getConnectionPoints(el);
        }
        snapStateRef.current = { hoveredPoints, nearestPoint: endSnap, drawingArrowId: dElId };
        bumpSnap();
        inter.pendingEndBinding = endSnap ? { elementId: endSnap.elementId, pointId: endSnap.id } : null;
      }

      const snappedPt = endSnap ? { x: endSnap.x, y: endSnap.y } : { x: pt.x, y: pt.y };

      const updated = elements.map(el => {
        if (el.id === dElId) {
          const clone = { ...el, points: el.points ? el.points.map(p => ({ ...p })) : [] };
          if (['rectangle', 'roundRect', 'ellipse', 'diamond', 'stickyNote', 'cylinder', 'queue', 'cloud', 'cache'].includes(clone.type)) {
            clone.width = pt.x - clone.x;
            clone.height = pt.y - clone.y;
          } else if (clone.type === 'line' || clone.type === 'arrow') {
            clone.points[1] = { x: snappedPt.x, y: snappedPt.y };
          } else if (clone.type === 'freehand' || clone.type === 'highlighter') {
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

    if (isReadingMode) {
      inter.isInteracting = false;
      inter.type = null;
      inter.hasMoved = false;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      return;
    }

    const type = inter.type;
    const hadMoved = inter.hasMoved;
    inter.isInteracting = false;
    inter.type = null;
    inter.hasMoved = false;

    // Clear snap overlay
    snapStateRef.current = { hoveredPoints: [], nearestPoint: null, drawingArrowId: null };
    bumpSnap();

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
      if (hadMoved) onRecordHistory(elements);
      return;
    }

    if (type === 'drawing' && inter.currentElement) {
      const dEl = elements.find(el => el.id === inter.currentElement.id);
      const startBinding = inter.pendingStartBinding;
      const endBinding = inter.pendingEndBinding;
      inter.currentElement = null;
      inter.drawingArrowId = null;
      inter.pendingStartBinding = null;
      inter.pendingEndBinding = null;

      if (dEl) {
        if (dEl.type === 'stickyNote') {
          if (Math.abs(dEl.width) < 20 || Math.abs(dEl.height) < 20) {
            dEl.width = 180;
            dEl.height = 160;
          }
          normalizeElement(dEl);
          onRecordHistory(elements);
          onSetTool('select');
          startTextEditing(dEl.x + 14, dEl.y + (dEl.calloutTag ? 36 : 14), dEl);
          return;
        }

        if (['cylinder', 'queue', 'cloud', 'cache'].includes(dEl.type)) {
          if (Math.abs(dEl.width) < 20 || Math.abs(dEl.height) < 20) {
            if (dEl.type === 'cylinder') { dEl.width = 140; dEl.height = 90; }
            else if (dEl.type === 'queue') { dEl.width = 160; dEl.height = 70; }
            else if (dEl.type === 'cloud') { dEl.width = 160; dEl.height = 100; }
            else if (dEl.type === 'cache') { dEl.width = 140; dEl.height = 80; }
          }
          normalizeElement(dEl);
          onRecordHistory(elements);
          onSetTool('select');
          return;
        }

        normalizeElement(dEl);
        const b = getBounds(dEl);
        if (b.width < 4 && b.height < 4 && (!dEl.points || dEl.points.length <= 1) && dEl.type !== 'highlighter') {
          const filtered = elements.filter(el => el.id !== dEl.id);
          onChangeElements(filtered);
          onSelectIds(new Set());
        } else {
          // Attach bindings to the final element
          if ((dEl.type === 'arrow' || dEl.type === 'line') && (startBinding || endBinding)) {
            const withBindings = elements.map(el => {
              if (el.id !== dEl.id) return el;
              const clone = { ...el };
              if (startBinding) clone.startBinding = startBinding;
              if (endBinding) clone.endBinding = endBinding;
              return clone;
            });
            onChangeElements(withBindings);
            onRecordHistory(withBindings);
          } else {
            onRecordHistory(elements);
          }
          onSetTool('select');
        }
      }
    }
  };

  const handleDoubleClick = (e) => {
    if (isReadingMode) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    const hitEditable = [...elements].reverse().find(el =>
      (el.type === 'text' || el.type === 'stickyNote' || ['cylinder', 'queue', 'cloud', 'cache'].includes(el.type)) &&
      hitTest(el, pt.x, pt.y, 8 / zoom)
    );

    if (hitEditable) {
      if (hitEditable.type === 'stickyNote') {
        startTextEditing(hitEditable.x + 14, hitEditable.y + (hitEditable.calloutTag ? 36 : 14), hitEditable);
      } else if (['cylinder', 'queue', 'cloud', 'cache'].includes(hitEditable.type)) {
        const b = getBounds(hitEditable);
        startTextEditing(b.x + 12, b.y + b.height / 2 - 16, hitEditable);
      } else {
        startTextEditing(hitEditable.x, hitEditable.y, hitEditable);
      }
      return;
    }

    startTextEditing(pt.x, pt.y, null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
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
      onScrollChange(scrollX - e.deltaX, scrollY - e.deltaY);
    }
  };

  const selectedElements = elements.filter(el => selectedIds.has(el.id));
  const activeSingleEl = selectedElements.length === 1 ? selectedElements[0] : null;

  let floatingBarPos = null;
  if (activeSingleEl && activeSingleEl.type === 'stickyNote' && !textEdit) {
    const b = getBounds(activeSingleEl);
    const screenTopLeft = canvasToContainer(b.x, b.y);
    const screenTopRight = canvasToContainer(b.x + b.width, b.y);
    const screenBottom = canvasToContainer(b.x, b.y + b.height);
    const centerX = (screenTopLeft.x + screenTopRight.x) / 2;
    const containerW = containerRef.current?.clientWidth || 800;
    const containerH = containerRef.current?.clientHeight || 600;

    const clampedX = Math.max(160, Math.min(containerW - 160, centerX));
    const topY = screenTopLeft.y - 46;
    const clampedY = topY < 12 ? Math.min(containerH - 50, screenBottom.y + 12) : topY;

    floatingBarPos = {
      x: clampedX,
      y: clampedY
    };
  }

  const handleSetStickyTint = (tintKey) => {
    if (!activeSingleEl || activeSingleEl.type !== 'stickyNote') return;
    const palette = PASTEL_PALETTE[tintKey];
    if (!palette) return;
    const nextBg = isDark ? palette.darkBg : palette.bg;
    const nextBorder = isDark ? palette.darkBorder : palette.border;
    const updated = elements.map(el => {
      if (el.id === activeSingleEl.id) {
        return {
          ...el,
          tint: tintKey,
          fillColor: nextBg,
          strokeColor: nextBorder
        };
      }
      return el;
    });
    onChangeElements(updated);
    onRecordHistory(updated);
  };

  const handleSetCalloutTag = (tagId, defaultTint = null) => {
    if (!activeSingleEl || activeSingleEl.type !== 'stickyNote') return;
    const updated = elements.map(el => {
      if (el.id === activeSingleEl.id) {
        const clone = { ...el, calloutTag: tagId };
        if (defaultTint && PASTEL_PALETTE[defaultTint]) {
          clone.tint = defaultTint;
          clone.fillColor = isDark ? PASTEL_PALETTE[defaultTint].darkBg : PASTEL_PALETTE[defaultTint].bg;
          clone.strokeColor = isDark ? PASTEL_PALETTE[defaultTint].darkBorder : PASTEL_PALETTE[defaultTint].border;
        }
        return clone;
      }
      return el;
    });
    onChangeElements(updated);
    onRecordHistory(updated);
  };

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

      {/* Floating Contextual Inspector for Sticky Notes (Pastel Tints & Callout Badges) */}
      {!isReadingMode && floatingBarPos && activeSingleEl?.type === 'stickyNote' && !textEdit && (
        <div
          className="canvas-floating-inspector sticky-inspector"
          style={{
            left: `${floatingBarPos.x}px`,
            top: `${floatingBarPos.y}px`
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Pastel Color Swatches */}
          <div className="floating-swatches-row" title="Pastel / Chalk Tints">
            {Object.keys(PASTEL_PALETTE).map(key => {
              const pal = PASTEL_PALETTE[key];
              const isSelected = (activeSingleEl.tint === key) || (activeSingleEl.fillColor === (isDark ? pal.darkBg : pal.bg));
              return (
                <button
                  key={key}
                  className={`pastel-swatch-btn ${isSelected ? 'active' : ''}`}
                  style={{ backgroundColor: isDark ? pal.darkBg : pal.bg, borderColor: pal.border }}
                  onClick={() => handleSetStickyTint(key)}
                  title={pal.name}
                  aria-label={pal.name}
                />
              );
            })}
          </div>

          <div className="floating-bar-divider" />

          {/* Quick Callout Badges */}
          <div className="floating-badges-row">
            {CALLOUT_PRESETS.map(badge => (
              <button
                key={badge.id}
                className={`callout-pill-btn ${activeSingleEl.calloutTag === badge.id ? 'active' : ''}`}
                onClick={() => handleSetCalloutTag(badge.id, badge.tint)}
                title={`Set Callout: ${badge.label}`}
              >
                {badge.label}
              </button>
            ))}
            {activeSingleEl.calloutTag && (
              <button
                className="callout-pill-clear-btn"
                onClick={() => handleSetCalloutTag(null)}
                title="Remove Callout Tag"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {!isReadingMode && textEdit && (
        <textarea
          id="text-input"
          ref={textareaRef}
          className={
            textEdit.element?.type === 'stickyNote'
              ? 'sticky-note-input'
              : (['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element?.type) ? 'arch-label-input' : '')
          }
          value={textEdit.text}
          autoFocus
          placeholder={
            textEdit.element?.type === 'stickyNote'
              ? "Write a note..."
              : (['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element?.type) ? "Component Label..." : "Type text here...")
          }
          style={{
            display: 'block',
            left: `${textEditorPos.x}px`,
            top: `${textEditorPos.y}px`,
            width: textEdit.element?.type === 'stickyNote'
              ? `${Math.max(80, (textEdit.element.width - 28) * zoom)}px`
              : (['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element?.type)
                  ? `${Math.max(80, (textEdit.element.width - 24) * zoom)}px`
                  : (textEdit.element?.hasCustomWidth && textEdit.element.width > 20
                      ? `${textEdit.element.width * zoom}px`
                      : undefined)),
            height: textEdit.element?.type === 'stickyNote'
              ? `${Math.max(50, (textEdit.element.height - (textEdit.element.calloutTag ? 46 : 28)) * zoom)}px`
              : (['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element?.type)
                  ? `${Math.max(30, 32 * zoom)}px`
                  : undefined),
            fontSize: `${(['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element?.type) ? Math.max(12, Math.min(18, Math.round((textEdit.element.height || 80) * 0.2))) : textEdit.fontSize) * zoom}px`,
            fontFamily: ['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element?.type)
              ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              : textEdit.fontFamily,
            fontWeight: ['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element?.type)
              ? 'bold'
              : (textEdit.bold ? 'bold' : 'normal'),
            fontStyle: textEdit.italic ? 'italic' : 'normal',
            textDecoration: textEdit.underline ? 'underline' : 'none',
            textAlign: ['cylinder', 'cloud', 'queue'].includes(textEdit.element?.type) ? 'center' : 'left',
            color: textEdit.element?.type === 'stickyNote'
              ? (resolvePastelTint(textEdit.element.tint || textEdit.element.fillColor, isDark).textColor)
              : textEditorStroke
          }}
          onChange={(e) => {
            const nextVal = e.target.value;
            setTextEdit(prev => {
              if (!prev) return null;
              const next = { ...prev, text: nextVal };
              if (prev.element && prev.element.type === 'stickyNote' && textareaRef.current) {
                const ta = textareaRef.current;
                const pad = prev.element.calloutTag ? 46 : 28;
                const contentH = Math.ceil(ta.scrollHeight / zoom);
                if (contentH + pad > (prev.element.height || 160)) {
                  prev.element.height = contentH + pad;
                }
              }
              return next;
            });
          }}
          onBlur={commitTextEditor}
          onKeyDown={(e) => {
            e.stopPropagation();
            if ((e.ctrlKey || e.metaKey)) {
              const k = e.key.toLowerCase();
              if (k === 'b') { setTextEdit(prev => ({ ...prev, bold: !prev.bold })); e.preventDefault(); return; }
              if (k === 'i') { setTextEdit(prev => ({ ...prev, italic: !prev.italic })); e.preventDefault(); return; }
              if (k === 'u') { setTextEdit(prev => ({ ...prev, underline: !prev.underline })); e.preventDefault(); return; }
              if (e.key === 'Enter') { commitTextEditor(); e.preventDefault(); return; }
            }
            if (e.key === 'Enter' && ['cylinder', 'queue', 'cloud', 'cache'].includes(textEdit.element?.type)) {
              commitTextEditor();
              e.preventDefault();
              return;
            }
            if (e.key === 'Escape') { cancelTextEditor(); e.preventDefault(); }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
