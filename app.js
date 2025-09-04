// Helpers
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function round(value, precision = 0) { const p = Math.pow(10, precision); return Math.round(value * p) / p; }

// RGB <-> HSL (used as HLS layout: H, L, S)
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1/3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1/3);
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// RGB <-> CMYK
function rgbToCmyk(r, g, b) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rr - k) / (1 - k);
  const m = (1 - gg - k) / (1 - k);
  const y = (1 - bb - k) / (1 - k);
  return { c: c * 100, m: m * 100, y: y * 100, k: k * 100 };
}
function cmykToRgb(c, m, y, k) {
  c /= 100; m /= 100; y /= 100; k /= 100;
  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

// HEX helpers
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase(); }
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

// Elements
const els = {
  preview: document.getElementById('preview'),
  warning: document.getElementById('warning'),
  hex: document.getElementById('hexInput'),
  picker: document.getElementById('nativePicker'),
  r: document.getElementById('r'), g: document.getElementById('g'), b: document.getElementById('b'),
  rRange: document.getElementById('rRange'), gRange: document.getElementById('gRange'), bRange: document.getElementById('bRange'),
  h: document.getElementById('h'), l: document.getElementById('l'), s: document.getElementById('s'),
  hRange: document.getElementById('hRange'), lRange: document.getElementById('lRange'), sRange: document.getElementById('sRange'),
  c: document.getElementById('c'), m: document.getElementById('m'), y: document.getElementById('y'), k: document.getElementById('k'),
  cRange: document.getElementById('cRange'), mRange: document.getElementById('mRange'), yRange: document.getElementById('yRange'), kRange: document.getElementById('kRange'),
  swatches: document.getElementById('swatches'),
};

let isSyncing = false;

function setPreview(r, g, b) {
  els.preview.style.background = `rgb(${r}, ${g}, ${b})`;
}

function showWarning(show) {
  els.warning.classList.toggle('visible', !!show);
}

function updateAllFromRGB(r, g, b, { fromUser = false } = {}) {
  if (isSyncing) return; isSyncing = true;
  let clipped = false;
  const rr = clamp(Math.round(r), 0, 255); if (rr !== r) clipped = true;
  const gg = clamp(Math.round(g), 0, 255); if (gg !== g) clipped = true;
  const bb = clamp(Math.round(b), 0, 255); if (bb !== b) clipped = true;

  // RGB -> HSL
  const { h, s, l } = rgbToHsl(rr, gg, bb);
  // RGB -> CMYK
  const { c, m, y, k } = rgbToCmyk(rr, gg, bb);

  // Apply UI
  [els.r.value, els.g.value, els.b.value] = [rr, gg, bb];
  [els.rRange.value, els.gRange.value, els.bRange.value] = [rr, gg, bb];
  const hh = round(h, 1), ss = round(s, 1), ll = round(l, 1);
  [els.h.value, els.l.value, els.s.value] = [hh, ll, ss];
  [els.hRange.value, els.lRange.value, els.sRange.value] = [hh, ll, ss];
  const cc = round(c, 1), mm = round(m, 1), yy = round(y, 1), kk = round(k, 1);
  [els.c.value, els.m.value, els.y.value, els.k.value] = [cc, mm, yy, kk];
  [els.cRange.value, els.mRange.value, els.yRange.value, els.kRange.value] = [cc, mm, yy, kk];
  const hex = rgbToHex(rr, gg, bb);
  els.hex.value = hex; els.picker.value = hex;
  setPreview(rr, gg, bb);
  showWarning(clipped);
  isSyncing = false;
}

function updateAllFromHLS(h, l, s) {
  if (isSyncing) return; isSyncing = true;
  let clipped = false;
  const hh = clamp(h, 0, 360); if (hh !== h) clipped = true;
  const ll = clamp(l, 0, 100); if (ll !== l) clipped = true;
  const ss = clamp(s, 0, 100); if (ss !== s) clipped = true;
  const { r, g, b } = hslToRgb(hh, ss, ll);
  isSyncing = false;
  updateAllFromRGB(r, g, b, { fromUser: true });
  // Keep user's HLS as source of truth to avoid jumping
  [els.h.value, els.l.value, els.s.value] = [round(hh, 1), round(ll, 1), round(ss, 1)];
  [els.hRange.value, els.lRange.value, els.sRange.value] = [round(hh, 1), round(ll, 1), round(ss, 1)];
  showWarning(clipped);
}

function updateAllFromCMYK(c, m, y, k) {
  if (isSyncing) return; isSyncing = true;
  let clipped = false;
  const cc = clamp(c, 0, 100); if (cc !== c) clipped = true;
  const mm = clamp(m, 0, 100); if (mm !== m) clipped = true;
  const yy = clamp(y, 0, 100); if (yy !== y) clipped = true;
  const kk = clamp(k, 0, 100); if (kk !== k) clipped = true;
  const { r, g, b } = cmykToRgb(cc, mm, yy, kk);
  isSyncing = false;
  updateAllFromRGB(r, g, b, { fromUser: true });
  // Keep user's CMYK as source of truth to avoid jumping
  const ccr = round(cc, 1), mmr = round(mm, 1), yyr = round(yy, 1), kkr = round(kk, 1);
  [els.c.value, els.m.value, els.y.value, els.k.value] = [ccr, mmr, yyr, kkr];
  [els.cRange.value, els.mRange.value, els.yRange.value, els.kRange.value] = [ccr, mmr, yyr, kkr];
  showWarning(clipped);
}

function updateAllFromHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return; // ignore invalid
  updateAllFromRGB(rgb.r, rgb.g, rgb.b, { fromUser: true });
}

function buildSwatches() {
  const colors = [
    '#000000','#808080','#c0c0c0','#ffffff','#ff0000','#ff7f00','#ffff00','#00ff00','#00ffff','#0000ff',
    '#8b00ff','#ff1493','#20b2aa','#ffa500','#a52a2a','#deb887','#2e8b57','#6b8e23','#708090','#4aa3ff'
  ];
  els.swatches.innerHTML = '';
  colors.forEach(hex => {
    const d = document.createElement('div');
    d.className = 'swatch';
    d.style.background = hex;
    d.title = hex;
    d.addEventListener('click', () => updateAllFromHex(hex));
    els.swatches.appendChild(d);
  });
}

function attachEvents() {
  // RGB number inputs and ranges
  [['r','rRange'],['g','gRange'],['b','bRange']].forEach(([n, r]) => {
    els[n].addEventListener('input', () => updateAllFromRGB(+els.r.value, +els.g.value, +els.b.value, { fromUser: true }));
    els[r].addEventListener('input', () => { els[n].value = els[r].value; updateAllFromRGB(+els.r.value, +els.g.value, +els.b.value, { fromUser: true }); });
  });
  // HLS inputs and ranges (note: UI order H, L, S)
  [['h','hRange'],['l','lRange'],['s','sRange']].forEach(([n, r]) => {
    const handler = () => updateAllFromHLS(+els.h.value, +els.l.value, +els.s.value);
    els[n].addEventListener('input', handler);
    els[r].addEventListener('input', () => { els[n].value = els[r].value; handler(); });
  });
  // CMYK inputs and ranges
  [['c','cRange'],['m','mRange'],['y','yRange'],['k','kRange']].forEach(([n, r]) => {
    const handler = () => updateAllFromCMYK(+els.c.value, +els.m.value, +els.y.value, +els.k.value);
    els[n].addEventListener('input', handler);
    els[r].addEventListener('input', () => { els[n].value = els[r].value; handler(); });
  });

  // HEX input
  els.hex.addEventListener('input', () => updateAllFromHex(els.hex.value));
  // Native color picker
  els.picker.addEventListener('input', () => updateAllFromHex(els.picker.value));
}

// Init
buildSwatches();
attachEvents();
updateAllFromHex('#4aa3ff');
