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

export const PASTEL_PALETTE = {
  yellow: {
    id: 'yellow',
    name: 'Yellow (Note)',
    bg: '#FEF08A',
    border: '#EAB308',
    text: '#1C1917',
    tagBg: '#FDE047',
    tagText: '#854D0E',
    darkBg: '#36301A',
    darkBorder: '#786624',
    darkText: '#F5F5F3',
    darkTagBg: '#4D431E',
    darkTagText: '#FEF08A'
  },
  green: {
    id: 'green',
    name: 'Green (Trade-off)',
    bg: '#DCFCE7',
    border: '#22C55E',
    text: '#14532D',
    tagBg: '#BBF7D0',
    tagText: '#14532D',
    darkBg: '#1A3324',
    darkBorder: '#2E7D4E',
    darkText: '#F5F5F3',
    darkTagBg: '#234933',
    darkTagText: '#86EFAC'
  },
  rose: {
    id: 'rose',
    name: 'Coral (Bottleneck)',
    bg: '#FEE2E2',
    border: '#EF4444',
    text: '#7F1D1D',
    tagBg: '#FECACA',
    tagText: '#991B1B',
    darkBg: '#381F22',
    darkBorder: '#8C373C',
    darkText: '#F5F5F3',
    darkTagBg: '#54282D',
    darkTagText: '#FCA5A5'
  },
  blue: {
    id: 'blue',
    name: 'Sky (Latency)',
    bg: '#E0F2FE',
    border: '#38BDF8',
    text: '#0C4A6E',
    tagBg: '#BAE6FD',
    tagText: '#0369A1',
    darkBg: '#1B2E3D',
    darkBorder: '#2D6F99',
    darkText: '#F5F5F3',
    darkTagBg: '#234358',
    darkTagText: '#7DD3FC'
  },
  orange: {
    id: 'orange',
    name: 'Peach (Warning)',
    bg: '#FFEDD5',
    border: '#F97316',
    text: '#7C2D12',
    tagBg: '#FED7AA',
    tagText: '#9A3412',
    darkBg: '#3D2A1C',
    darkBorder: '#8F542A',
    darkText: '#F5F5F3',
    darkTagBg: '#563823',
    darkTagText: '#FDBA74'
  },
  purple: {
    id: 'purple',
    name: 'Lavender (Decision)',
    bg: '#F3E8FF',
    border: '#A855F7',
    text: '#581C87',
    tagBg: '#E9D5FF',
    tagText: '#6B21A8',
    darkBg: '#301E3E',
    darkBorder: '#733C94',
    darkText: '#F5F5F3',
    darkTagBg: '#442759',
    darkTagText: '#D8B4FE'
  }
};

export function resolvePastelTint(tintOrColor, isDark) {
  if (tintOrColor && PASTEL_PALETTE[tintOrColor]) {
    const p = PASTEL_PALETTE[tintOrColor];
    return {
      bg: isDark ? p.darkBg : p.bg,
      border: isDark ? p.darkBorder : p.border,
      textColor: isDark ? p.darkText : p.text,
      tagBg: isDark ? p.darkTagBg : p.tagBg,
      tagText: isDark ? p.darkTagText : p.tagText
    };
  }

  const hex = (tintOrColor || '').toLowerCase();
  for (const key of Object.keys(PASTEL_PALETTE)) {
    const p = PASTEL_PALETTE[key];
    if (hex === p.bg.toLowerCase() || hex === p.darkBg.toLowerCase()) {
      return {
        bg: isDark ? p.darkBg : p.bg,
        border: isDark ? p.darkBorder : p.border,
        textColor: isDark ? p.darkText : p.text,
        tagBg: isDark ? p.darkTagBg : p.tagBg,
        tagText: isDark ? p.darkTagText : p.tagText
      };
    }
  }

  const def = PASTEL_PALETTE.yellow;
  const bg = tintOrColor && tintOrColor !== 'transparent' ? tintOrColor : (isDark ? def.darkBg : def.bg);
  return {
    bg: bg,
    border: isDark ? def.darkBorder : def.border,
    textColor: isDark ? def.darkText : def.text,
    tagBg: isDark ? def.darkTagBg : def.tagBg,
    tagText: isDark ? def.darkTagText : def.tagText
  };
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
  } else if (el.type === 'highlighter') {
    if (el.points && el.points.length > 0) {
      ctx.save();
      ctx.globalAlpha = el.opacity !== undefined ? el.opacity : (isDark ? 0.45 : 0.38);
      let hlColor = el.strokeColor || '#ffd43b';
      if (hlColor === '#252525' || hlColor === '#1e1e1e' || hlColor === '#000000') {
        hlColor = '#ffd43b';
      }
      ctx.strokeStyle = hlColor;
      ctx.fillStyle = hlColor;
      ctx.lineWidth = el.strokeWidth || 22;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.points.length === 1) {
        ctx.beginPath();
        ctx.arc(el.points[0].x, el.points[0].y, (el.strokeWidth || 22) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let j = 1; j < el.points.length; j++) {
          ctx.lineTo(el.points[j].x, el.points[j].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (el.type === 'stickyNote') {
    const b = getBounds(el);
    const bw = Math.max(50, b.width);
    const bh = Math.max(50, b.height);
    const pad = 14;
    const fold = 18;

    const tintInfo = resolvePastelTint(el.tint || el.fillColor, isDark);
    const bg = tintInfo.bg;
    const border = tintInfo.border;
    const textColor = tintInfo.textColor;

    ctx.save();
    // Subtle drop shadow
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Sticky note body with folded top-right corner
    ctx.beginPath();
    ctx.moveTo(b.x + 8, b.y);
    ctx.lineTo(b.x + bw - fold, b.y);
    ctx.lineTo(b.x + bw, b.y + fold);
    ctx.lineTo(b.x + bw, b.y + bh - 8);
    ctx.arcTo(b.x + bw, b.y + bh, b.x + bw - 8, b.y + bh, 8);
    ctx.lineTo(b.x + 8, b.y + bh);
    ctx.arcTo(b.x, b.y + bh, b.x, b.y + bh - 8, 8);
    ctx.lineTo(b.x, b.y + 8);
    ctx.arcTo(b.x, b.y, b.x + 8, b.y, 8);
    ctx.closePath();

    ctx.fillStyle = bg;
    ctx.fill();

    // Reset shadow for crisp borders
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Folded corner
    ctx.beginPath();
    ctx.moveTo(b.x + bw - fold, b.y);
    ctx.lineTo(b.x + bw - fold, b.y + fold);
    ctx.lineTo(b.x + bw, b.y + fold);
    ctx.closePath();
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    ctx.fill();
    ctx.stroke();

    let textTopOffset = pad;

    // Callout Tag Badge (e.g., BOTTLENECK, TRADE-OFF, LATENCY, NOTE, DECISION)
    if (el.calloutTag) {
      const tagText = el.calloutTag.toUpperCase();
      const badgeX = b.x + pad;
      const badgeY = b.y + pad - 2;
      ctx.save();
      ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const tagMetrics = ctx.measureText(tagText);
      const tagW = Math.max(50, tagMetrics.width + 16);
      const tagH = 19;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, tagW, tagH, 4);
      } else {
        drawRoundRect(ctx, badgeX, badgeY, tagW, tagH, 4);
      }
      ctx.fillStyle = tintInfo.tagBg;
      ctx.fill();
      ctx.strokeStyle = tintInfo.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = tintInfo.tagText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, badgeX + tagW / 2, badgeY + tagH / 2);
      ctx.restore();

      textTopOffset += 26;
    }

    // Render note text if present
    if (el.text) {
      const maxWidth = bw - pad * 2;
      let fSize = el.fontSize || 20;
      const fFamily = el.fontFamily || "'Patrick Hand', cursive";
      const fStyle = (el.italic ? 'italic ' : '') + (el.bold ? 'bold ' : 'normal ');

      ctx.save();
      // Clip to sticky note boundary so text never spills outside the card
      ctx.beginPath();
      ctx.rect(b.x + 4, b.y + 4, bw - 8, bh - 8);
      ctx.clip();

      ctx.font = fStyle + fSize + "px " + fFamily;
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'top';

      let lines = getWrappedTextLines(el, maxWidth);
      let lineHeight = fSize * 1.35;
      const availableHeight = bh - textTopOffset - pad;
      let totalTextHeight = lines.length * lineHeight;

      // Smart dynamic scaling: if text exceeds note height, scale font down to fit (down to 12px)
      if (totalTextHeight > availableHeight && fSize > 13) {
        const scale = Math.max(0.65, availableHeight / totalTextHeight);
        fSize = Math.max(12, Math.floor(fSize * scale));
        lineHeight = fSize * 1.35;
        ctx.font = fStyle + fSize + "px " + fFamily;
        lines = getWrappedTextLines({ ...el, fontSize: fSize }, maxWidth);
      }

      for (let l = 0; l < lines.length; l++) {
        const lineY = b.y + textTopOffset + l * lineHeight;
        if (lineY + lineHeight > b.y + bh) break;
        ctx.fillText(lines[l], b.x + pad, lineY);
      }

      ctx.restore();
    }

    ctx.restore();
  } else if (el.type === 'cylinder') {
    // Database (Simple, clean 3D Cylinder)
    const b = getBounds(el);
    const bw = Math.max(30, b.width);
    const bh = Math.max(30, b.height);
    const topH = Math.min(24, Math.max(10, bh * 0.22));
    const cx = b.x + bw / 2;
    const topY = b.y + topH / 2;
    const botY = b.y + bh - topH / 2;

    if (fillColor !== 'transparent') {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, topY, bw / 2, topH / 2, 0, 0, Math.PI * 2);
      ctx.rect(b.x, topY, bw, bh - topH);
      ctx.ellipse(cx, botY, bw / 2, topH / 2, 0, 0, Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.restore();
    }

    if (rc) {
      // Top ellipse
      rc.ellipse(cx, topY, bw, topH, opts);
      // Sides
      rc.line(b.x, topY, b.x, botY, opts);
      rc.line(b.x + bw, topY, b.x + bw, botY, opts);
      // Bottom arc
      rc.arc(cx, botY, bw, topH, 0, Math.PI, false, opts);
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, topY, bw / 2, topH / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(b.x, topY);
      ctx.lineTo(b.x, botY);
      ctx.ellipse(cx, botY, bw / 2, topH / 2, 0, Math.PI, 0, true);
      ctx.lineTo(b.x + bw, topY);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.stroke();
    }

    // Centered database text label (only when text is set)
    if (el.text && el.text.trim()) {
      ctx.save();
      const fSize = Math.max(12, Math.min(18, Math.round(bh * 0.18)));
      ctx.font = "bold " + fSize + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = strokeColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelY = topY + (bh - topH) * 0.5;
      ctx.fillText(el.text.trim(), cx, labelY);
      ctx.restore();
    }
  } else if (el.type === 'queue') {
    // Message Queue / Broker (Kafka / RabbitMQ horizontal pipe)
    const b = getBounds(el);
    const bw = Math.max(40, b.width);
    const bh = Math.max(24, b.height);
    const capW = Math.min(24, Math.max(10, bw * 0.15));
    const cy = b.y + bh / 2;

    if (fillColor !== 'transparent') {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(b.x + capW / 2, cy, capW / 2, bh / 2, 0, 0, Math.PI * 2);
      ctx.rect(b.x + capW / 2, b.y, bw - capW, bh);
      ctx.ellipse(b.x + bw - capW / 2, cy, capW / 2, bh / 2, 0, -Math.PI / 2, Math.PI / 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.restore();
    }

    if (rc) {
      // Left ellipse entrance
      rc.ellipse(b.x + capW / 2, cy, capW, bh, opts);
      // Top and bottom borders
      rc.line(b.x + capW / 2, b.y, b.x + bw - capW / 2, b.y, opts);
      rc.line(b.x + capW / 2, b.y + bh, b.x + bw - capW / 2, b.y + bh, opts);
      // Right cap arc (half ellipse)
      rc.arc(b.x + bw - capW / 2, cy, capW, bh, -Math.PI / 2, Math.PI / 2, false, opts);

      // Vertical partition slots representing message packets in transit
      const slots = [18, 34, 50];
      for (const slot of slots) {
        const px = b.x + bw - capW / 2 - slot;
        if (px > b.x + capW + 36) {
          rc.line(px, b.y + 4, px, b.y + bh - 4, { ...opts, strokeWidth: Math.max(1, (el.strokeWidth || 2) * 0.7) });
        }
      }
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.beginPath();
      ctx.ellipse(b.x + capW / 2, cy, capW / 2, bh / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(b.x + capW / 2, b.y);
      ctx.lineTo(b.x + bw - capW / 2, b.y);
      ctx.ellipse(b.x + bw - capW / 2, cy, capW / 2, bh / 2, 0, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(b.x + capW / 2, b.y + bh);
      ctx.stroke();

      const slots = [18, 34, 50];
      for (const slot of slots) {
        const px = b.x + bw - capW / 2 - slot;
        if (px > b.x + capW + 36) {
          ctx.beginPath();
          ctx.moveTo(px, b.y + 4);
          ctx.lineTo(px, b.y + bh - 4);
          ctx.stroke();
        }
      }
    }

    // Queue text label (only when text is set)
    if (el.text && el.text.trim()) {
      ctx.save();
      const fSize = Math.max(12, Math.min(18, Math.round(bh * 0.26)));
      ctx.font = "bold " + fSize + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = strokeColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textX = b.x + (bw - 50) / 2 + 10;
      ctx.fillText(el.text.trim(), textX, cy);
      ctx.restore();
    }
  } else if (el.type === 'cloud') {
    // Cloud / CDN Node
    const b = getBounds(el);
    const bw = Math.max(40, b.width);
    const bh = Math.max(30, b.height);
    const x = b.x, y = b.y;

    const p0x = x + 0.18 * bw, p0y = y + 0.78 * bh;
    const p1x = x + 0.82 * bw, p1y = y + 0.78 * bh;
    const cloudPath =
      `M ${p0x} ${p0y} ` +
      `L ${p1x} ${p1y} ` +
      `A ${0.16 * bw} ${0.18 * bh} 0 0 0 ${x + 0.96 * bw} ${y + 0.58 * bh} ` +
      `A ${0.16 * bw} ${0.20 * bh} 0 0 0 ${x + 0.82 * bw} ${y + 0.30 * bh} ` +
      `A ${0.22 * bw} ${0.24 * bh} 0 0 0 ${x + 0.48 * bw} ${y + 0.16 * bh} ` +
      `A ${0.20 * bw} ${0.22 * bh} 0 0 0 ${x + 0.18 * bw} ${y + 0.32 * bh} ` +
      `A ${0.16 * bw} ${0.18 * bh} 0 0 0 ${x + 0.04 * bw} ${y + 0.60 * bh} ` +
      `A ${0.15 * bw} ${0.16 * bh} 0 0 0 ${p0x} ${p0y} Z`;

    if (rc) {
      rc.path(cloudPath, opts);
    } else if (typeof Path2D !== 'undefined') {
      ctx.beginPath();
      const p = new Path2D(cloudPath);
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill(p);
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.stroke(p);
    } else {
      ctx.beginPath();
      const cx = b.x + bw / 2;
      const cy = b.y + bh * 0.55;
      ctx.ellipse(cx, cy, (bw / 2) * 0.85, (bh / 2) * 0.65, 0, 0, Math.PI * 2);
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.stroke();
    }

    // Center Cloud/CDN label (only when text is set)
    if (el.text && el.text.trim()) {
      ctx.save();
      const fSize = Math.max(12, Math.min(18, Math.round(bh * 0.18)));
      ctx.font = "bold " + fSize + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = strokeColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.text.trim(), b.x + bw / 2, b.y + bh * 0.52);
      ctx.restore();
    }
  } else if (el.type === 'cache') {
    // In-Memory Cache (Redis / Memcached)
    const b = getBounds(el);
    const bw = Math.max(40, b.width);
    const bh = Math.max(30, b.height);
    const r = 8;
    const headerH = Math.min(26, Math.max(18, bh * 0.32));

    if (rc) {
      const svgPath = getRoundRectPath(b.x, b.y, bw, bh, r);
      rc.path(svgPath, opts);
      // Header divider line separating lightning symbol & title from memory bank
      rc.line(b.x, b.y + headerH, b.x + bw, b.y + headerH, { ...opts, strokeWidth: Math.max(1, (el.strokeWidth || 2) * 0.8) });

      // Memory slot tiers (2 horizontal memory bars)
      const slotH = (bh - headerH - 14) / 2;
      if (slotH > 5) {
        const s1Y = b.y + headerH + 5;
        const s2Y = s1Y + slotH + 4;
        rc.rectangle(b.x + 8, s1Y, bw - 16, slotH, { ...opts, strokeWidth: 1 });
        rc.rectangle(b.x + 8, s2Y, bw - 16, slotH, { ...opts, strokeWidth: 1 });
        // Memory cell dividers
        const cellW = (bw - 16) / 4;
        for (let c = 1; c < 4; c++) {
          rc.line(b.x + 8 + c * cellW, s1Y, b.x + 8 + c * cellW, s1Y + slotH, { ...opts, strokeWidth: 1 });
          rc.line(b.x + 8 + c * cellW, s2Y, b.x + 8 + c * cellW, s2Y + slotH, { ...opts, strokeWidth: 1 });
        }
      }
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
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.stroke();

      // Divider line
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + headerH);
      ctx.lineTo(b.x + bw, b.y + headerH);
      ctx.stroke();

      // Memory slots
      const slotH = (bh - headerH - 14) / 2;
      if (slotH > 5) {
        const s1Y = b.y + headerH + 5;
        const s2Y = s1Y + slotH + 4;
        ctx.strokeRect(b.x + 8, s1Y, bw - 16, slotH);
        ctx.strokeRect(b.x + 8, s2Y, bw - 16, slotH);
      }
    }

    // Top Header: Flash icon + Label (only when text is set)
    if (el.text && el.text.trim()) {
      ctx.save();
      const fSize = Math.max(11, Math.min(15, Math.round(headerH * 0.62)));
      ctx.font = "bold " + fSize + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = strokeColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText("⚡ " + el.text.trim(), b.x + 10, b.y + headerH / 2);
      ctx.restore();
    }
  } else if (el.type === 'text') {
    const fSize = el.fontSize || 24;
    const fFamily = el.fontFamily || "'Patrick Hand', cursive";
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

export function renderHoveredConnectionPoints(ctx, points, nearestPoint, isDark) {
  if (!points || points.length === 0) return;
  const accentColor = isDark ? '#7AA7FF' : '#3478F6';
  ctx.save();
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const isNearest = nearestPoint && nearestPoint.id === pt.id && nearestPoint.elementId === pt.elementId;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, isNearest ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = isNearest
      ? (isDark ? 'rgba(122,167,255,0.25)' : 'rgba(52,120,246,0.18)')
      : (isDark ? 'rgba(122,167,255,0.12)' : 'rgba(52,120,246,0.08)');
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, isNearest ? 6 : 4, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = isNearest ? 2 : 1.5;
    ctx.stroke();
    if (isNearest) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
    }
  }
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

