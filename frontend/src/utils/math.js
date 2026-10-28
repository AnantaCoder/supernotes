export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'el-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function distanceToLine(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(px, py, x1, y1);

  var t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  var projX = x1 + t * dx;
  var projY = y1 + t * dy;
  return distance(px, py, projX, projY);
}

export function pointInEllipse(px, py, cx, cy, rx, ry) {
  if (rx <= 0 || ry <= 0) return false;
  var normX = (px - cx) / rx;
  var normY = (py - cy) / ry;
  return (normX * normX + normY * normY) <= 1;
}

export function pointInDiamond(px, py, cx, cy, hw, hh) {
  if (hw <= 0 || hh <= 0) return false;
  return (Math.abs(px - cx) / hw + Math.abs(py - cy) / hh) <= 1;
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

