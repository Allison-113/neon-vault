// Aetherframe suit sheet + hound sheet: source rectangles and portrait drawing.
// Sheets are used as supplied — SPEC: "Runtime canvas source rectangles display existing
// images without creating edited bitmap assets." Every rectangle below was measured directly
// against the shipped exo/assets/*.jpg pixel grid (not guessed), then rounded to a small
// conservative pad so a crop never bleeds into a neighboring frame or a text label.

const SHEET_SRC = new URL('./assets/aetherframe.jpg', import.meta.url).href;
const HOUND_SRC = new URL('./assets/hounds.jpg', import.meta.url).href;

function loadImage(src, onSettled) {
  const img = new Image();
  const state = { img, ready: false, failed: false };
  img.onload = () => { state.ready = true; onSettled(); };
  img.onerror = () => { state.failed = true; onSettled(); };
  img.src = src;
  return state;
}

// Canvases that asked for a portrait while the sheet was still loading, keyed by canvas so a
// second selection before the sheet settles simply overwrites which id that canvas redraws with.
const pendingPortraits = new Map();
function redrawPendingPortraits() {
  for (const [canvas, id] of pendingPortraits) { pendingPortraits.delete(canvas); drawSuitPortrait(canvas, id); }
}

const sheet = loadImage(SHEET_SRC, redrawPendingPortraits);
const houndSheet = loadImage(HOUND_SRC, () => {});

export function suitSheetState() { return sheet; }
export function houndSheetState() { return houndSheet; }

// aetherframe.jpg is a 6-column x 2-row grid of suit cards. Each card carries a portrait, a
// color-swatch column (not used here), and four labeled sprite rows (DOWN/UP/LEFT/RIGHT), each
// with 4 walk-cycle frames. The two card rows were laid out at a slightly different vertical
// pitch on the source sheet, so row 1 and row 2 keep independently measured Y bands rather than
// one shared formula; the six columns share the same X positions across both rows.
const COLS_X = [57, 266, 474, 684, 897, 1109]; // left edge of each column's first frame
const CARD_LEFT = [12, 224, 434, 645, 857, 1067]; // left edge of each column's card box
const FRAME_OFFSETS = [0, 40, 79, 119]; // 2nd/3rd/4th frame offset from a row's first frame
const FRAME_W = 27;
const ROW_Y = [
  { down: 249, up: 290, left: 330, right: 370, h: 35 }, // row 1: infernex..kraken
  { down: 647, up: 683, left: 720, right: 752, h: 31 }, // row 2: seraph..malice
];
const PORTRAIT_Y = [[134, 244], [546, 642]]; // [top,bottom] per card row, excludes the swatch column
// Widened to the full safe interior before the swatch column (~167): a tight box sized to a
// typical humanoid silhouette clipped Kraken's and Malice's wider arms/tentacles. A uniformly
// wider box only adds harmless dark background around narrower suits.
const PORTRAIT_X = [20, 163]; // relative to each column's card-left edge

export const SUITS = [
  { id: 'infernex', name: 'Infernex', role: 'Combat', color: '#e0453f' },
  { id: 'halcyon', name: 'Halcyon', role: 'Support', color: '#9fd6ea' },
  { id: 'necro', name: 'Necro', role: 'Recon', color: '#9a6fd0' },
  { id: 'volt', name: 'Volt', role: 'Assault', color: '#f0c93e' },
  { id: 'aquilo', name: 'Aquilo', role: 'Sniper', color: '#8fae6b' },
  { id: 'kraken', name: 'Kraken', role: 'Heavy', color: '#4f79c9' },
  { id: 'seraph', name: 'Seraph', role: 'Defense', color: '#e8cf8a' },
  { id: 'oni', name: 'Oni', role: 'Berserker', color: '#e8557f' },
  { id: 'umbra', name: 'Umbra', role: 'Infiltration', color: '#8b8f96' },
  { id: 'pyre', name: 'Pyre', role: 'Area Denial', color: '#e8792f' },
  { id: 'glacia', name: 'Glacia', role: 'Control', color: '#6fd0e6' },
  { id: 'malice', name: 'Malice', role: 'Experimental', color: '#a562d6' },
];

function suitIndex(id) { const i = SUITS.findIndex((s) => s.id === id); return i < 0 ? 0 : i; }

/** Source rect for one suit's facing row ('down'|'up'|'left'|'right'), frame 0-3. This is a
 *  side-view game (SPEC explicitly permits using just the left/right rows for the field sprite),
 *  so render.mjs only ever requests 'right' and flips it for the left-facing case, the same way
 *  it already flips the procedural player art via ctx.scale(facing,1). */
export function suitFrameRect(id, facing, frame) {
  const idx = suitIndex(id);
  const rowBlock = idx < 6 ? 0 : 1;
  const col = idx % 6;
  const row = ROW_Y[rowBlock];
  const y0 = row[facing] ?? row.right;
  const x0 = COLS_X[col] + FRAME_OFFSETS[Math.max(0, Math.min(3, frame | 0))];
  return { x: x0, y: y0, w: FRAME_W, h: row.h };
}

export function suitPortraitRect(id) {
  const idx = suitIndex(id);
  const rowBlock = idx < 6 ? 0 : 1;
  const col = idx % 6;
  const [y0, y1] = PORTRAIT_Y[rowBlock];
  return { x: CARD_LEFT[col] + PORTRAIT_X[0], y: y0, w: PORTRAIT_X[1] - PORTRAIT_X[0], h: y1 - y0 };
}

// hounds.jpg is a 5-column x 2-row grid; only HOUND-01 "Ember" (top-left) is used per SPEC.
const HOUND_FRAME_X = [76, 140, 202]; // idle/walk: three real body samples
// Attack row has only two real body samples — the sheet's third slot there is muzzle-flash
// spilling past the second body, not a distinct third pose, so it is never offered as a frame.
const ATTACK_FRAME_X = [79, 141];
// The measured first walk body actually spans roughly x76..125 (49px) — 34 clipped its rear
// legs and made render.mjs's d.w/r.w scale-to-hitbox inflate height disproportionately.
const HOUND_FRAME_W = 50;
const HOUND_ROWS = { idle: { y: 257, h: 33 }, walk: { y: 295, h: 34 }, attack: { y: 330, h: 40 } };

/** Source rect for Ember's 'idle'|'walk' (frame 0-2) or 'attack' (frame 0-1) row. */
export function houndFrameRect(pose, frame) {
  const row = HOUND_ROWS[pose] || HOUND_ROWS.walk;
  const xs = pose === 'attack' ? ATTACK_FRAME_X : HOUND_FRAME_X;
  const x = xs[Math.max(0, Math.min(xs.length - 1, frame | 0))];
  return { x, y: row.y, w: HOUND_FRAME_W, h: row.h };
}

function fallback(ctx, w, h, color, label) {
  ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = color; ctx.font = `${Math.max(8, Math.floor(h * 0.28))}px monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/** Draws suit `id`'s full portrait into `canvas` (SPEC: 160x160 backing, caller may CSS-scale).
 *  Preserves the source's aspect ratio (letterboxed, centered) rather than stretching it to fill
 *  a square. Falls back to a legible labeled swatch if the sheet failed or hasn't loaded yet; if
 *  it's still loading, this canvas is registered to redraw with this exact id — event-driven off
 *  the image's own load/error, not a fixed timer — once the sheet actually settles, however long
 *  that takes. Every canvas that asked gets its own redraw, not just the first. */
export function drawSuitPortrait(canvas, id) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const suit = SUITS[suitIndex(id)];
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  if (sheet.failed) { fallback(ctx, w, h, suit.color, suit.name.slice(0, 3).toUpperCase()); return; }
  if (!sheet.ready) {
    fallback(ctx, w, h, suit.color, '···');
    pendingPortraits.set(canvas, id);
    return;
  }
  try {
    const r = suitPortraitRect(id);
    ctx.fillStyle = '#0c1620'; ctx.fillRect(0, 0, w, h);
    const scale = Math.min(w / r.w, h / r.h);
    const dw = r.w * scale, dh = r.h * scale;
    ctx.drawImage(sheet.img, r.x, r.y, r.w, r.h, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } catch {
    fallback(ctx, w, h, suit.color, suit.name.slice(0, 3).toUpperCase());
  }
}
