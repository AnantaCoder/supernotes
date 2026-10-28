import rough from 'roughjs';
import { getBounds, getHandles, getWrappedTextLines } from './elements.js';

export function getAdaptiveStroke(color, isDark) {
  if (isDark && (color === '#1e1e1e' || color === '#000000' || color === '#252525')) {
    return '#f2f2f0';
  }
  if (!isDark && (color === '#f4f4f5' || color === '#f2f2f0' || color === '#ffffff')) {
    return '#252525';
  }
  return color || (isDark ? '#f2f2f0' : '#252525');
}

export function getAdaptiveFill(color, isDark) {
  if (!color || color === 'transparent') return 'transparent';
  return color;
}

export function getRoughOptions(el, isDark) {
  const strokeColor = getAdaptiveStroke(el.strokeColor, isDark);
  const fillColor = getAdaptiveFill(el.fillColor, isDark);
  const isFilled = fillColor && fillColor !== 'transparent';

  const opts = {
    stroke: strokeColor,
    strokeWidth: el.strokeWidth || 2,
    roughness: el.roughness !== undefined ? el.roughness : 1.5,
    seed: el.seed || 1,
    bowing: 1
  };

  if (isFilled) {
    opts.fill = fillColor;
    opts.fillStyle = 'hachure';
    opts.fillWeight = (el.strokeWidth || 2) / 2;
    opts.hachureAngle = 60;
    opts.hachureGap = 4;
  }

  return opts;
}

export function getRoundRectPath(x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  const x2 = x + w;
  const y2 = y + h;
  return "M " + (x + r) + " " + y +
         " L " + (x2 - r) + " " + y +
         " A " + r + " " + r + " 0 0 1 " + x2 + " " + (y + r) +
         " L " + x2 + " " + (y2 - r) +
         " A " + r + " " + r + " 0 0 1 " + (x2 - r) + " " + y2 +
         " L " + (x + r) + " " + y2 +
         " A " + r + " " + r + " 0 0 1 " + x + " " + (y2 - r) +
         " L " + x + " " + (y + r) +
         " A " + r + " " + r + " 0 0 1 " + (x + r) + " " + y + " Z";
}

export function drawRoundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function renderElement(ctx, rc, el, isDark) {
  ctx.save();
  ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;

  const opts = getRoughOptions(el, isDark);
  const strokeColor = getAdaptiveStroke(el.strokeColor, isDark);
  const fillColor = getAdaptiveFill(el.fillColor, isDark);

  if (el.type === 'rectangle' || el.type === 'roundRect') {
    const b = getBounds(el);
    const bw = Math.max(1, b.width);
    const bh = Math.max(1, b.height);
    const isRound = el.type === 'roundRect';
    const r = isRound ? Math.max(6, Math.min(22, Math.min(bw, bh) / 4)) : 0;

    if (isRound) {
      const svgPath = getRoundRectPath(b.x, b.y, bw, bh, r);
      if (rc) {
        rc.path(svgPath, opts);
      } else {
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(b.x, b.y, bw, bh, r);
        } else {
          drawRoundRect(ctx, b.x, b.y, bw, bh, r);
        }
        if (fillColor !== 'transparent') {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.stroke();
      }
    } else {
      if (rc) {
        rc.rectangle(b.x, b.y, bw, bh, opts);
      } else {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = el.strokeWidth;
        if (fillColor !== 'transparent') {
          ctx.fillStyle = fillColor;
          ctx.fillRect(b.x, b.y, bw, bh);
        }
        ctx.strokeRect(b.x, b.y, bw, bh);
      }
    }
  } else if (el.type === 'ellipse') {
    const b = getBounds(el);
    const bw = Math.max(1, b.width);
    const bh = Math.max(1, b.height);
    const cx = b.x + bw / 2;
    const cy = b.y + bh / 2;
    if (rc) {
      rc.ellipse(cx, cy, bw, bh, opts);
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(0.1, bw / 2), Math.max(0.1, bh / 2), 0, 0, Math.PI * 2);
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.stroke();
    }
  } else if (el.type === 'diamond') {
    const b = getBounds(el);
    const bw = Math.max(1, b.width);
    const bh = Math.max(1, b.height);
    const cx = b.x + bw / 2;
    const cy = b.y + bh / 2;
    const points = [
      [cx, b.y],
      [b.x + bw, cy],
      [cx, b.y + bh],
      [b.x, cy]
    ];
    if (rc) {
      rc.polygon(points, opts);
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let p = 1; p < points.length; p++) {
        ctx.lineTo(points[p][0], points[p][1]);
      }
      ctx.closePath();
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.stroke();
    }
  } else if (el.type === 'line' || el.type === 'arrow') {
    if (el.points && el.points.length >= 2) {
      const p1 = el.points[0];
      const p2 = el.points[el.points.length - 1];
      const isBent = !!el.controlPoint;
      const cp = el.controlPoint;

      if (isBent) {
        if (rc) {
          rc.path("M " + p1.x + " " + p1.y + " Q " + cp.x + " " + cp.y + " " + p2.x + " " + p2.y, opts);
        } else {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = el.strokeWidth;
          ctx.stroke();
        }
      } else {
        if (rc) {
          rc.line(p1.x, p1.y, p2.x, p2.y, opts);
        } else {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = el.strokeWidth;
          ctx.stroke();
        }
      }

      if (el.type === 'arrow') {
        const angle = isBent ? Math.atan2(p2.y - cp.y, p2.x - cp.x) : Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headLen = Math.max(12, (el.strokeWidth || 2) * 4);
        const a1x = p2.x - headLen * Math.cos(angle - Math.PI / 6);
        const a1y = p2.y - headLen * Math.sin(angle - Math.PI / 6);
        const a2x = p2.x - headLen * Math.cos(angle + Math.PI / 6);
        const a2y = p2.y - headLen * Math.sin(angle + Math.PI / 6);

        if (rc) {
          rc.line(p2.x, p2.y, a1x, a1y, opts);
          rc.line(p2.x, p2.y, a2x, a2y, opts);
        } else {
          ctx.beginPath();
          ctx.moveTo(a1x, a1y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(a2x, a2y);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = el.strokeWidth;
          ctx.stroke();
        }
      }
    }
  } else if (el.type === 'freehand') {
    if (el.points && el.points.length > 0) {
      if (el.points.length === 1) {
        ctx.beginPath();
        ctx.arc(el.points[0].x, el.points[0].y, Math.max(1, (el.strokeWidth || 2) / 2), 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
      } else if (rc && el.points.length > 2) {
        const pts = el.points.map(pt => [pt.x, pt.y]);
        rc.curve(pts, opts);
      } else {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let j = 1; j < el.points.length; j++) {
          ctx.lineTo(el.points[j].x, el.points[j].y);
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }
  } else if (el.type === 'text') {
    const fSize = el.fontSize || 24;
    const fFamily = el.fontFamily || "'Caveat', cursive";
    const b = getBounds(el);

    if (fillColor && fillColor !== 'transparent') {
      const bw = Math.max(1, b.width);
      const bh = Math.max(1, b.height);
      if (rc) {
        rc.rectangle(b.x, b.y, bw, bh, opts);
      } else {
        ctx.fillStyle = fillColor;
        ctx.fillRect(b.x, b.y, bw, bh);
        if (el.strokeWidth) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = el.strokeWidth;
          ctx.strokeRect(b.x, b.y, bw, bh);
        }
      }
    }

    const fStyle = (el.italic ? 'italic ' : '') + (el.bold ? 'bold ' : 'normal ');
    ctx.font = fStyle + fSize + "px " + fFamily;
    ctx.fillStyle = strokeColor;
    ctx.textBaseline = 'top';
    const lines = getWrappedTextLines(el);
    const lineHeight = fSize * 1.3;
    for (let l = 0; l < lines.length; l++) {
      const lineY = el.y + 6 + l * lineHeight;
      ctx.fillText(lines[l], el.x + 8, lineY);
      if (el.underline && lines[l]) {
        const metrics = ctx.measureText(lines[l]);
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(1.5, fSize / 15);
        const underlineY = lineY + fSize * 1.08;
        ctx.moveTo(el.x + 8, underlineY);
        ctx.lineTo(el.x + 8 + metrics.width, underlineY);
        ctx.stroke();
        ctx.restore();
      }
    }
  } else if (el.type === 'image') {
    if (el._imageObj && el._imageObj.complete) {
      ctx.drawImage(el._imageObj, el.x, el.y, el.width, el.height);
    } else if (el.dataUrl) {
      const img = new Image();
      img.src = el.dataUrl;
      el._imageObj = img;
    }
  }

  ctx.restore();
}

export function renderSelection(ctx, selected, isDark) {
  if (!selected || selected.length === 0) return;

  ctx.save();
  // Apple-inspired Accent tokens
  const accentColor = isDark ? '#7AA7FF' : '#3478F6';
  const handleBg = isDark ? '#202022' : '#FFFFFF';

  for (let i = 0; i < selected.length; i++) {
    const el = selected[i];
    const b = getBounds(el);
    const pad = 6;

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2);
    ctx.setLineDash([]);

    // Draw handles
    const handles = getHandles(el);
    ctx.fillStyle = handleBg;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    const handleRadius = 4;

    for (let h = 0; h < handles.length; h++) {
      const handle = handles[h];
      ctx.beginPath();
      if (handle.position === 'bend') {
        ctx.arc(handle.x, handle.y, handleRadius + 1.5, 0, Math.PI * 2);
      } else {
        ctx.rect(handle.x - handleRadius, handle.y - handleRadius, handleRadius * 2, handleRadius * 2);
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function renderMarquee(ctx, box, isDark) {
  ctx.save();
  const x = Math.min(box.startX, box.currentX);
  const y = Math.min(box.startY, box.currentY);
  const w = Math.abs(box.currentX - box.startX);
  const h = Math.abs(box.currentY - box.startY);

  const accentColor = isDark ? '#7AA7FF' : '#3478F6';
  ctx.fillStyle = isDark ? 'rgba(122, 167, 255, 0.12)' : 'rgba(52, 120, 246, 0.08)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export function drawGrid(ctx, viewWidth, viewHeight, zoom, scrollX, scrollY, isDark, showGrid = false) {
  if (!showGrid) return;
  const gridSize = 24;
  const startX = Math.floor((-scrollX / zoom) / gridSize) * gridSize;
  const startY = Math.floor((-scrollY / zoom) / gridSize) * gridSize;
  const endX = startX + (viewWidth / zoom) + gridSize * 2;
  const endY = startY + (viewHeight / zoom) + gridSize * 2;

  // Tiny, low-contrast dots that do not interfere with handwriting
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.10)';
  for (let x = startX; x < endX; x += gridSize) {
    for (let y = startY; y < endY; y += gridSize) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

