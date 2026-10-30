import { generateId, distance, distanceToLine, pointInEllipse, pointInDiamond, deepClone } from './math.js';

let measurementCanvas = null;
let measurementCtx = null;
function getMeasurementContext() {
  if (typeof document === 'undefined') return null;
  if (!measurementCtx) {
    measurementCanvas = document.createElement('canvas');
    measurementCtx = measurementCanvas ? measurementCanvas.getContext('2d') : null;
  }
  return measurementCtx;
}

export function createElement(type, props = {}, defaultState = {}) {
  const defaults = {
    id: generateId(),
    type: type,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    points: [],
    text: '',
    strokeColor: defaultState.strokeColor || '#252525',
    fillColor: defaultState.noFill === false ? (defaultState.fillColor || '#a5d8ff') : 'transparent',
    strokeWidth: defaultState.strokeWidth || 2,
    fontSize: defaultState.fontSize || 24,
    fontFamily: defaultState.fontFamily || "'Patrick Hand', cursive",
    bold: props.bold !== undefined ? !!props.bold : !!defaultState.isBold,
    italic: props.italic !== undefined ? !!props.italic : !!defaultState.isItalic,
    underline: props.underline !== undefined ? !!props.underline : !!defaultState.isUnderline,
    opacity: 1,
    roughness: defaultState.roughness !== undefined ? defaultState.roughness : 1.5,
    seed: Math.floor(Math.random() * 2147483647),
    cornerRadius: 16
  };
  return Object.assign(defaults, props);
}

export function getWrappedTextLines(el, explicitMaxWidth = null) {
  const rawText = el.text || '';
  const lines = rawText.split('\n');

  // If no explicit max width is given and this is an auto-width text box,
  // do NOT wrap lines! Text should only break where user explicitly pressed Enter.
  if (el.type === 'text' && !el.hasCustomWidth && explicitMaxWidth === null) {
    return lines;
  }

  const widthVal = explicitMaxWidth !== null ? explicitMaxWidth : (el.width || 0);
  if (!widthVal || widthVal <= 0) {
    return lines;
  }

  const ctx = getMeasurementContext();
  const fSize = el.fontSize || 24;
  const fFamily = el.fontFamily || "'Patrick Hand', cursive";
  const fStyle = (el.italic ? 'italic ' : '') + (el.bold ? 'bold ' : 'normal ');

  if (ctx) {
    ctx.font = fStyle + fSize + 'px ' + fFamily;
  }

  const maxTextWidth = explicitMaxWidth !== null ? Math.max(30, explicitMaxWidth) : Math.max(30, el.width - 16);
  const wrapped = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') {
      wrapped.push('');
      continue;
    }

    const words = line.split(' ');
    let currentLine = '';

    for (let w = 0; w < words.length; w++) {
      const word = words[w];

      // If a single word is wider than maxTextWidth, break it by character so it never overflows
      const wordWidth = ctx ? ctx.measureText(word).width : word.length * (fSize * 0.55);
      if (wordWidth > maxTextWidth) {
        if (currentLine) {
          wrapped.push(currentLine);
          currentLine = '';
        }
        let chunk = '';
        for (let char of word) {
          const testChunk = chunk + char;
          const chunkWidth = ctx ? ctx.measureText(testChunk).width : testChunk.length * (fSize * 0.55);
          if (chunkWidth > maxTextWidth && chunk) {
            wrapped.push(chunk);
            chunk = char;
          } else {
            chunk = testChunk;
          }
        }
        currentLine = chunk;
        continue;
      }

      const testLine = currentLine ? (currentLine + ' ' + word) : word;
      const testWidth = ctx ? ctx.measureText(testLine).width : testLine.length * (fSize * 0.55);

      if (testWidth > maxTextWidth && currentLine) {
        wrapped.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      wrapped.push(currentLine);
    }
  }

  return wrapped;
}

export function measureText(el) {
  const ctx = getMeasurementContext();
  const fSize = el.fontSize || 24;
  const fFamily = el.fontFamily || "'Patrick Hand', cursive";
  const fStyle = (el.italic ? 'italic ' : '') + (el.bold ? 'bold ' : 'normal ');

  if (ctx) {
    ctx.font = fStyle + fSize + 'px ' + fFamily;
  }

  const lines = getWrappedTextLines(el);
  let maxW = 0;
  for (let i = 0; i < lines.length; i++) {
    const w = ctx ? ctx.measureText(lines[i]).width : lines[i].length * (fSize * 0.55);
    if (w > maxW) maxW = w;
  }
  const naturalWidth = Math.max(30, Math.ceil(maxW + 20));
  const boxWidth = (el.hasCustomWidth && el.width && el.width > 20) ? Math.max(el.width, 30) : naturalWidth;
  const boxHeight = Math.max(28, Math.ceil(lines.length * fSize * 1.3 + 12));

  return {
    width: boxWidth,
    height: boxHeight,
    lines: lines
  };
}

export function getBounds(el) {
  if (el.type === 'line' || el.type === 'arrow' || el.type === 'freehand' || el.type === 'highlighter') {
    if (!el.points || el.points.length === 0) {
      return { x: el.x, y: el.y, width: 0, height: 0, x2: el.x, y2: el.y };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < el.points.length; i++) {
      const pt = el.points[i];
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
    if (el.controlPoint) {
      if (el.controlPoint.x < minX) minX = el.controlPoint.x;
      if (el.controlPoint.y < minY) minY = el.controlPoint.y;
      if (el.controlPoint.x > maxX) maxX = el.controlPoint.x;
      if (el.controlPoint.y > maxY) maxY = el.controlPoint.y;
    }
    if ((el.type === 'line' || el.type === 'arrow') && el.text && el.text.trim() && el.points.length >= 2) {
      const mid = getArrowMidpoint(el);
      const fSize = el.fontSize || 16;
      const hw = Math.max(30, (el.text.length * fSize * 0.4) + 16);
      const hh = Math.max(16, fSize * 0.8 + 10);
      if (mid.x - hw < minX) minX = mid.x - hw;
      if (mid.y - hh < minY) minY = mid.y - hh;
      if (mid.x + hw > maxX) maxX = mid.x + hw;
      if (mid.y + hh > maxY) maxY = mid.y + hh;
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
      x2: maxX,
      y2: maxY
    };
  }

  if (el.type === 'text') {
    const d = measureText(el);
    return {
      x: el.x,
      y: el.y,
      width: d.width,
      height: d.height,
      x2: el.x + d.width,
      y2: el.y + d.height
    };
  }

  const x = Math.min(el.x, el.x + (el.width || 0));
  const y = Math.min(el.y, el.y + (el.height || 0));
  const w = Math.abs(el.width || 0);
  const h = Math.abs(el.height || 0);
  return { x: x, y: y, width: w, height: h, x2: x + w, y2: y + h };
}

export function getConnectionPoints(el) {
  const CONNECTABLE = [
    'rectangle', 'roundRect', 'ellipse', 'diamond', 'stickyNote',
    'cylinder', 'queue', 'cloud', 'cache'
  ];
  if (!CONNECTABLE.includes(el.type)) return [];
  const b = getBounds(el);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  return [
    { id: 'top',    x: cx,           y: b.y,            elementId: el.id },
    { id: 'right',  x: b.x + b.width, y: cy,            elementId: el.id },
    { id: 'bottom', x: cx,           y: b.y + b.height, elementId: el.id },
    { id: 'left',   x: b.x,         y: cy,             elementId: el.id },
  ];
}

export function hitTest(el, px, py, threshold = 10) {
  const b = getBounds(el);

  if (
    el.type === 'rectangle' || el.type === 'roundRect' || el.type === 'image' || el.type === 'stickyNote' ||
    el.type === 'cylinder' || el.type === 'queue' || el.type === 'cloud' || el.type === 'cache'
  ) {
    if (
      el.fillColor !== 'transparent' || el.type === 'image' || el.type === 'stickyNote' ||
      el.type === 'cylinder' || el.type === 'queue' || el.type === 'cloud' || el.type === 'cache'
    ) {
      return px >= b.x - threshold && px <= b.x2 + threshold && py >= b.y - threshold && py <= b.y2 + threshold;
    }
    return distanceToLine(px, py, b.x, b.y, b.x2, b.y) < threshold ||
           distanceToLine(px, py, b.x2, b.y, b.x2, b.y2) < threshold ||
           distanceToLine(px, py, b.x2, b.y2, b.x, b.y2) < threshold ||
           distanceToLine(px, py, b.x, b.y2, b.x, b.y) < threshold;
  }

  if (el.type === 'ellipse') {
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const rx = b.width / 2, ry = b.height / 2;
    if (el.fillColor !== 'transparent') {
      return pointInEllipse(px, py, cx, cy, rx + threshold, ry + threshold);
    }
    return pointInEllipse(px, py, cx, cy, rx + threshold, ry + threshold) &&
           !pointInEllipse(px, py, cx, cy, Math.max(rx - threshold, 0), Math.max(ry - threshold, 0));
  }

  if (el.type === 'diamond') {
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const hw = b.width / 2, hh = b.height / 2;
    if (el.fillColor !== 'transparent') {
      return pointInDiamond(px, py, cx, cy, hw + threshold, hh + threshold);
    }
    const top = { x: cx, y: b.y }, right = { x: b.x2, y: cy }, bot = { x: cx, y: b.y2 }, left = { x: b.x, y: cy };
    return distanceToLine(px, py, top.x, top.y, right.x, right.y) < threshold ||
           distanceToLine(px, py, right.x, right.y, bot.x, bot.y) < threshold ||
           distanceToLine(px, py, bot.x, bot.y, left.x, left.y) < threshold ||
           distanceToLine(px, py, left.x, left.y, top.x, top.y) < threshold;
  }

  if (el.type === 'line' || el.type === 'arrow') {
    if (!el.points || el.points.length < 2) return false;
    const p1 = el.points[0];
    const p2 = el.points[el.points.length - 1];

    // Check hit on middle label if present
    if (el.text && el.text.trim()) {
      const mid = getArrowMidpoint(el);
      const fSize = el.fontSize || 16;
      const halfW = Math.max(30, (el.text.length * fSize * 0.4) + 16);
      const halfH = Math.max(16, fSize * 0.8 + 10);
      if (Math.abs(px - mid.x) <= halfW && Math.abs(py - mid.y) <= halfH) {
        return true;
      }
    }

    if (el.controlPoint) {
      const cp = el.controlPoint;
      let prevX = p1.x, prevY = p1.y;
      for (let step = 1; step <= 12; step++) {
        const t = step / 12;
        const inv = 1 - t;
        const curX = inv * inv * p1.x + 2 * inv * t * cp.x + t * t * p2.x;
        const curY = inv * inv * p1.y + 2 * inv * t * cp.y + t * t * p2.y;
        if (distanceToLine(px, py, prevX, prevY, curX, curY) < threshold) {
          return true;
        }
        prevX = curX;
        prevY = curY;
      }
      return false;
    }

    for (let i = 0; i < el.points.length - 1; i++) {
      if (distanceToLine(px, py, el.points[i].x, el.points[i].y, el.points[i+1].x, el.points[i+1].y) < threshold) {
        return true;
      }
    }
    return false;
  }

  if (el.type === 'freehand' || el.type === 'highlighter') {
    if (!el.points || el.points.length === 0) return false;
    const thresh = Math.max(threshold, (el.strokeWidth || 20) / 2);
    if (el.points.length === 1) {
      return distance(px, py, el.points[0].x, el.points[0].y) < thresh;
    }
    for (let j = 0; j < el.points.length - 1; j++) {
      if (distanceToLine(px, py, el.points[j].x, el.points[j].y, el.points[j+1].x, el.points[j+1].y) < thresh) {
        return true;
      }
    }
    return false;
  }

  if (el.type === 'text') {
    return px >= b.x - 4 && px <= b.x2 + 4 && py >= b.y - 4 && py <= b.y2 + 4;
  }

  return false;
}

export function getArrowMidpoint(el) {
  if (!el.points || el.points.length < 2) return { x: el.x || 0, y: el.y || 0 };
  const p1 = el.points[0];
  const p2 = el.points[el.points.length - 1];
  if (el.controlPoint) {
    return {
      x: (p1.x + 2 * el.controlPoint.x + p2.x) / 4,
      y: (p1.y + 2 * el.controlPoint.y + p2.y) / 4
    };
  }
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
}

export function getHandles(el) {
  if (el.type === 'line' || el.type === 'arrow') {
    if (!el.points || el.points.length < 2) return [];
    const p1 = el.points[0];
    const p2 = el.points[el.points.length - 1];
    const mid = getArrowMidpoint(el);
    return [
      { x: p1.x, y: p1.y, position: 'start', cursor: 'crosshair' },
      { x: mid.x, y: mid.y, position: 'bend', cursor: 'pointer' },
      { x: p2.x, y: p2.y, position: 'end', cursor: 'crosshair' },
    ];
  }

  if (el.type === 'freehand' || el.type === 'highlighter') {
    return [];
  }

  const b = getBounds(el);
  return [
    { x: b.x, y: b.y, position: 'nw', cursor: 'nwse-resize' },
    { x: b.x + b.width / 2, y: b.y, position: 'n', cursor: 'ns-resize' },
    { x: b.x2, y: b.y, position: 'ne', cursor: 'nesw-resize' },
    { x: b.x2, y: b.y + b.height / 2, position: 'e', cursor: 'ew-resize' },
    { x: b.x2, y: b.y2, position: 'se', cursor: 'nwse-resize' },
    { x: b.x + b.width / 2, y: b.y2, position: 's', cursor: 'ns-resize' },
    { x: b.x, y: b.y2, position: 'sw', cursor: 'nesw-resize' },
    { x: b.x, y: b.y + b.height / 2, position: 'w', cursor: 'ew-resize' },
  ];
}

export function hitTestHandle(el, px, py, handleSize = 8) {
  const handles = getHandles(el);
  for (let i = 0; i < handles.length; i++) {
    if (Math.abs(px - handles[i].x) <= handleSize && Math.abs(py - handles[i].y) <= handleSize) {
      return handles[i];
    }
  }
  return null;
}

export function move(el, dx, dy) {
  el.x += dx;
  el.y += dy;
  if (el.points && el.points.length > 0) {
    for (let i = 0; i < el.points.length; i++) {
      el.points[i].x += dx;
      el.points[i].y += dy;
    }
  }
  if (el.controlPoint) {
    el.controlPoint.x += dx;
    el.controlPoint.y += dy;
  }
}

export function resize(el, handlePos, mouseX, mouseY, ob, origFontSize, origWidth, origHeight) {
  if (handlePos === 'bend' && el.points && el.points.length >= 2) {
    const p1 = el.points[0];
    const p2 = el.points[el.points.length - 1];
    // Map mouse position so the curve peak passes precisely through (mouseX, mouseY)
    el.controlPoint = {
      x: 2 * mouseX - (p1.x + p2.x) / 2,
      y: 2 * mouseY - (p1.y + p2.y) / 2
    };
    return;
  }
  if (handlePos === 'start' && el.points && el.points.length > 0) {
    el.points[0].x = mouseX;
    el.points[0].y = mouseY;
    return;
  }
  if (handlePos === 'end' && el.points && el.points.length > 0) {
    el.points[el.points.length - 1].x = mouseX;
    el.points[el.points.length - 1].y = mouseY;
    return;
  }

  if (el.type === 'text') {
    el.hasCustomWidth = true;
    const baseFontSize = origFontSize || el.fontSize || 24;
    const baseWidth = origWidth || ob.width || 100;
    const baseHeight = origHeight || ob.height || 40;

    if (handlePos === 'e') {
      el.width = Math.max(40, mouseX - ob.x);
      const tb = measureText(el);
      el.height = tb.height;
      return;
    }
    if (handlePos === 'w') {
      const newW = Math.max(40, ob.x + ob.width - mouseX);
      el.x = ob.x + ob.width - newW;
      el.width = newW;
      const tb = measureText(el);
      el.height = tb.height;
      return;
    }
    if (handlePos === 's') {
      el.height = Math.max(24, mouseY - ob.y);
      return;
    }
    if (handlePos === 'n') {
      const newH = Math.max(24, ob.y + ob.height - mouseY);
      el.y = ob.y + ob.height - newH;
      el.height = newH;
      return;
    }

    let scale = 1;
    if (handlePos === 'se') {
      const scaleX = (mouseX - ob.x) / baseWidth;
      const scaleY = (mouseY - ob.y) / baseHeight;
      scale = Math.max(0.3, (scaleX + scaleY) / 2);
    } else if (handlePos === 'sw') {
      const scaleX = (ob.x + ob.width - mouseX) / baseWidth;
      const scaleY = (mouseY - ob.y) / baseHeight;
      scale = Math.max(0.3, (scaleX + scaleY) / 2);
    } else if (handlePos === 'ne') {
      const scaleX = (mouseX - ob.x) / baseWidth;
      const scaleY = (ob.y + ob.height - mouseY) / baseHeight;
      scale = Math.max(0.3, (scaleX + scaleY) / 2);
    } else if (handlePos === 'nw') {
      const scaleX = (ob.x + ob.width - mouseX) / baseWidth;
      const scaleY = (ob.y + ob.height - mouseY) / baseHeight;
      scale = Math.max(0.3, (scaleX + scaleY) / 2);
    }

    const newFontSize = Math.max(10, Math.min(120, Math.round(baseFontSize * scale)));
    el.fontSize = newFontSize;
    const newBoxWidth = Math.max(40, Math.round(baseWidth * scale));
    el.width = newBoxWidth;

    if (handlePos === 'sw' || handlePos === 'nw') {
      el.x = ob.x + ob.width - newBoxWidth;
    }
    const tb = measureText(el);
    el.height = tb.height;
    if (handlePos === 'ne' || handlePos === 'nw') {
      el.y = ob.y + ob.height - tb.height;
    }
    return;
  }

  // Default shape resize:
  switch (handlePos) {
    case 'nw':
      el.x = mouseX;
      el.y = mouseY;
      el.width = ob.x + ob.width - mouseX;
      el.height = ob.y + ob.height - mouseY;
      break;
    case 'n':
      el.y = mouseY;
      el.height = ob.y + ob.height - mouseY;
      break;
    case 'ne':
      el.y = mouseY;
      el.width = mouseX - ob.x;
      el.height = ob.y + ob.height - mouseY;
      break;
    case 'e':
      el.width = mouseX - ob.x;
      break;
    case 'se':
      el.width = mouseX - ob.x;
      el.height = mouseY - ob.y;
      break;
    case 's':
      el.height = mouseY - ob.y;
      break;
    case 'sw':
      el.x = mouseX;
      el.width = ob.x + ob.width - mouseX;
      el.height = mouseY - ob.y;
      break;
    case 'w':
      el.x = mouseX;
      el.width = ob.x + ob.width - mouseX;
      break;
  }
}

export function normalizeElement(el) {
  if (el.width !== undefined && el.width < 0) {
    el.x += el.width;
    el.width = -el.width;
  }
  if (el.height !== undefined && el.height < 0) {
    el.y += el.height;
    el.height = -el.height;
  }
}

export function duplicate(el) {
  const c = deepClone(el);
  c.id = generateId();
  c.seed = Math.floor(Math.random() * 2147483647);
  move(c, 20, 20);
  return c;
}

export function getSelectionBounds(elements) {
  if (!elements || elements.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < elements.length; i++) {
    const b = getBounds(elements[i]);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x2 > maxX) maxX = b.x2;
    if (b.y2 > maxY) maxY = b.y2;
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

