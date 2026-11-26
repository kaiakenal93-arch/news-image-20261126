// news-image-20261126 — "Sum up 26 November's world news in one image"
// Written from scratch in this session. No network, no Date, no randomness:
// every pixel is computed from fixed data, so two runs write identical bytes.
// Node 22, standard library only (node:fs, node:zlib, node:crypto).
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// CRC-32 (PNG chunk checksums)
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  view.setUint32(8 + data.length, crc);
  return out;
}

// ---------------------------------------------------------------------------
// Canvas: 1024 x 1024 RGB
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 231];
const INK: RGB = [20, 32, 46];
const NAVY: RGB = [15, 27, 45];
const RED: RGB = [193, 39, 45];
const GOLD: RGB = [217, 164, 65];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [110, 118, 128];
const GREEN: RGB = [30, 122, 76];
const BLUE: RGB = [46, 90, 136];
const OCHRE: RGB = [138, 90, 0];
const PURPLE: RGB = [122, 62, 140];
const RUST: RGB = [176, 58, 46];
const BOXBG: RGB = [255, 243, 208];

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPixel(xx, yy, c);
  }
}

function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  rect(x, y, w, t, c);
}

function vline(x: number, y: number, h: number, c: RGB, t = 1): void {
  rect(x, y, t, h, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB, thick = 1): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const half = Math.floor(thick / 2);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (dx * i) / steps);
    const y = Math.round(y0 + (dy * i) / steps);
    rect(x - half, y - half, thick, thick, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    rect(cx - dx, cy + dy, dx * 2 + 1, 1, c);
  }
}

function circleOutline(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    setPixel(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    if (t < 0) continue;
    const dx = Math.floor(rx * Math.sqrt(t));
    rect(cx - dx, cy + dy, dx * 2 + 1, 1, c);
  }
}

function ellipseOutline(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    setPixel(Math.round(cx + rx * Math.cos(rad)), Math.round(cy + ry * Math.sin(rad)), c);
  }
}

function fillPoly(points: [number, number][], c: RGB): void {
  let minY = H;
  let maxY = 0;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(Math.round(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      rect(xs[k], y, xs[k + 1] - xs[k] + 1, 1, c);
    }
  }
}

function roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
  rect(x + r, y, w - 2 * r, h, c);
  rect(x, y + r, w, h - 2 * r, c);
  fillCircle(x + r, y + r, r, c);
  fillCircle(x + w - r - 1, y + r, r, c);
  fillCircle(x + r, y + h - r - 1, r, c);
  fillCircle(x + w - r - 1, y + h - r - 1, r, c);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font (all caps, ASCII). Each glyph: 7 rows of 5 bits.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "\u2022": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
};

const warnings: string[] = [];

function charWidth(scale: number): number {
  return 6 * scale;
}

function textWidth(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * charWidth(scale) - scale;
}

function drawChar(x: number, y: number, ch: string, scale: number, c: RGB): void {
  const glyph = FONT[ch] ?? FONT["?"];
  for (let r = 0; r < 7; r++) {
    const row = glyph[r];
    for (let col = 0; col < 5; col++) {
      if (row[col] === "1") rect(x + col * scale, y + r * scale, scale, scale, c);
    }
  }
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): number {
  let cx = x;
  for (const ch of s) {
    drawChar(cx, y, ch, scale, c);
    cx += charWidth(scale);
  }
  return cx - x - scale;
}

function drawTextCenter(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

function wrapText(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxW) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      if (textWidth(word, scale) > maxW) {
        // Hard-split a word that alone exceeds the width (should not happen).
        warnings.push(`HARD SPLIT: "${word}"`);
        let part = "";
        for (const ch of word) {
          if (textWidth(part + ch, scale) > maxW) {
            lines.push(part);
            part = ch;
          } else {
            part += ch;
          }
        }
        cur = part;
      } else {
        cur = word;
      }
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// Draw wrapped text in a box; returns false when it did not fit (truncated).
function textBox(
  x: number,
  y: number,
  w: number,
  s: string,
  scale: number,
  lineH: number,
  maxLines: number,
  c: RGB,
  label: string,
): boolean {
  const lines = wrapText(s, w, scale);
  const shown = lines.slice(0, maxLines);
  for (let i = 0; i < shown.length; i++) drawText(x, y + i * lineH, shown[i], scale, c);
  if (lines.length > maxLines) {
    warnings.push(`TRUNCATED [${label}]: "${s}" -> ${lines.length} lines, max ${maxLines}`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Scenes (flat vector illustrations, all coordinates fixed)
// ---------------------------------------------------------------------------
function drawStars(x: number, y: number, w: number, h: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const sx = x + ((i * 97 + 13) % w);
    const sy = y + ((i * 53 + 7) % h);
    const s = i % 5 === 0 ? 2 : 1;
    rect(sx, sy, s, s, i % 3 === 0 ? GOLD : WHITE);
  }
}

function drawSatellite(cx: number, cy: number, s: number, body: RGB, panel: RGB): void {
  // body
  rect(cx - 7 * s, cy - 4 * s, 14 * s, 8 * s, body);
  // solar panels
  rect(cx - 20 * s, cy - 3 * s, 12 * s, 6 * s, panel);
  rect(cx + 8 * s, cy - 3 * s, 12 * s, 6 * s, panel);
  line(cx - 20 * s, cy, cx + 20 * s, cy, GOLD, 1);
  // dish
  line(cx + 2 * s, cy - 4 * s, cx + 6 * s, cy - 9 * s, WHITE, 2);
  fillCircle(cx + 6 * s, cy - 9 * s, 2 * s, GOLD);
}

function drawSpaceScene(x: number, y: number, w: number, h: number): void {
  const sky: RGB = [14, 30, 51];
  rect(x, y, w, h, sky);
  drawStars(x, y, w, h, 42);
  // Earth: flat band at the bottom of the scene (never drawn past the scene)
  rect(x, y + h - 24, w, 24, [46, 111, 176]);
  rect(x, y + h - 24, w, 3, [120, 180, 220]);
  fillEllipse(x + Math.floor(w * 0.28), y + h - 12, 46, 8, [88, 160, 120]);
  fillEllipse(x + Math.floor(w * 0.72), y + h - 10, 34, 7, [88, 160, 120]);
  // orbit ellipse
  ellipseOutline(x + Math.floor(w * 0.5), y + Math.floor(h * 0.42), 138, 34, GOLD);
  ellipseOutline(x + Math.floor(w * 0.5), y + Math.floor(h * 0.42), 138, 34, [120, 130, 145]);
  // satellites on the orbit
  drawSatellite(x + 62, y + 26, 1, WHITE, [150, 170, 200]);
  drawSatellite(x + 252, y + 44, 1, WHITE, [150, 170, 200]);
  drawSatellite(x + 168, y + 14, 1, GOLD, [220, 190, 110]);
  // small dots of a swarm
  for (let i = 0; i < 9; i++) {
    const sx = x + 24 + ((i * 31) % (w - 48));
    const sy = y + 58 + ((i * 17) % 26);
    rect(sx, sy, 2, 2, WHITE);
  }
}

function drawFlame(x: number, y: number, w: number, h: number, c: RGB): void {
  fillPoly(
    [
      [x, y + h],
      [x + Math.floor(w * 0.18), y + Math.floor(h * 0.45)],
      [x + Math.floor(w * 0.38), y + Math.floor(h * 0.62)],
      [x + Math.floor(w * 0.5), y],
      [x + Math.floor(w * 0.62), y + Math.floor(h * 0.55)],
      [x + Math.floor(w * 0.82), y + Math.floor(h * 0.4)],
      [x + w, y + h],
    ],
    c,
  );
}

function drawFireScene(x: number, y: number, w: number, h: number): void {
  const night: RGB = [42, 20, 16];
  rect(x, y, w, h, night);
  // distant city glow
  rect(x, y + h - 46, w, 46, [58, 30, 24]);
  for (let i = 0; i < 8; i++) {
    rect(x + 12 + i * 40, y + h - 58, 22, 14, [30, 22, 20]);
    rect(x + 16 + i * 40, y + h - 54, 3, 3, GOLD);
    rect(x + 26 + i * 40, y + h - 52, 3, 3, GOLD);
  }
  // road
  rect(x, y + h - 26, w, 26, [24, 24, 28]);
  for (let i = 0; i < 10; i++) rect(x + 8 + i * 34, y + h - 14, 16, 3, [220, 200, 120]);
  // tanker (overturned, on its side)
  const tx = x + 52;
  const ty = y + h - 62;
  roundRect(tx, ty, 190, 34, 12, [200, 200, 205]);
  rect(tx + 20, ty + 6, 150, 22, [228, 120, 40]);
  rect(tx + 150, ty + 4, 40, 26, [180, 180, 185]);
  fillCircle(tx + 34, ty + 36, 9, [15, 15, 18]);
  fillCircle(tx + 150, ty + 36, 9, [15, 15, 18]);
  fillCircle(tx + 34, ty + 36, 4, [120, 120, 125]);
  fillCircle(tx + 150, ty + 36, 4, [120, 120, 125]);
  // flames: outer layer + smaller inner core so they read as fire, not hills
  // (all tops stay inside the 104px scene; tanker top is ty)
  drawFlame(tx + 34, ty - 38, 40, 40, [212, 43, 30]);
  drawFlame(tx + 92, ty - 42, 46, 44, [245, 130, 32]);
  drawFlame(tx + 152, ty - 34, 36, 36, [255, 197, 61]);
  drawFlame(tx + 46, ty - 24, 20, 26, [255, 220, 110]);
  drawFlame(tx + 104, ty - 28, 22, 30, [255, 220, 110]);
  drawFlame(tx + 160, ty - 20, 18, 22, [255, 240, 160]);
  // smoke
  fillCircle(x + 96, y + 12, 12, [90, 90, 96]);
  fillCircle(x + 128, y + 6, 16, [110, 110, 116]);
  fillCircle(x + 168, y + 14, 11, [90, 90, 96]);
  fillCircle(x + 250, y + 10, 13, [110, 110, 116]);
  // emergency lights
  fillCircle(x + w - 34, y + h - 40, 4, RED);
  fillCircle(x + w - 20, y + h - 40, 4, [40, 120, 220]);
}

function drawStormScene(x: number, y: number, w: number, h: number): void {
  const slate: RGB = [36, 52, 74];
  rect(x, y, w, h, slate);
  // clouds
  fillEllipse(x + 70, y + 22, 62, 20, [138, 153, 173]);
  fillEllipse(x + 150, y + 14, 74, 24, [160, 172, 190]);
  fillEllipse(x + 250, y + 26, 58, 18, [138, 153, 173]);
  fillEllipse(x + 110, y + 40, 48, 14, [110, 126, 148]);
  fillEllipse(x + 220, y + 44, 52, 15, [110, 126, 148]);
  // lightning
  fillPoly(
    [
      [x + 262, y + 40],
      [x + 274, y + 40],
      [x + 266, y + 62],
      [x + 276, y + 62],
      [x + 258, y + 92],
      [x + 264, y + 66],
      [x + 254, y + 66],
    ],
    [255, 214, 64],
  );
  // rain
  for (let i = 0; i < 16; i++) {
    const rx = x + 10 + ((i * 61) % (w - 20));
    const ry = y + 52 + ((i * 29) % 40);
    line(rx, ry, rx - 5, ry + 12, [170, 200, 235], 1);
  }
  // parade balloon (round, red, with a thin white belt)
  const bx = x + 118;
  const by = y + 62;
  fillEllipse(bx, by, 52, 40, RED);
  rect(bx - 50, by - 5, 100, 10, [240, 240, 235]);
  // balloon strings + basket
  line(bx - 24, by + 36, bx - 12, by + 52, WHITE, 1);
  line(bx + 24, by + 36, bx + 12, by + 52, WHITE, 1);
  line(bx, by + 38, bx, by + 52, WHITE, 1);
  rect(bx - 14, by + 52, 28, 14, [150, 105, 50]);
  // small crowd umbrellas
  for (let i = 0; i < 5; i++) {
    const ux = x + 30 + i * 58;
    const uy = y + h - 12;
    fillEllipse(ux, uy, 16, 6, i % 2 === 0 ? GOLD : [200, 60, 60]);
    rect(ux - 1, uy + 4, 2, 8, [30, 30, 34]);
  }
}

// Small icons for the mid band (36x36 box)
function drawIcon(kind: string, x: number, y: number): void {
  const s = 36;
  rect(x, y, s, s, [232, 226, 214]);
  rect(x, y, s, 2, RED);
  if (kind === "missile") {
    fillPoly(
      [
        [x + 8, y + 28],
        [x + 20, y + 8],
        [x + 28, y + 24],
        [x + 22, y + 26],
      ],
      INK,
    );
    line(x + 20, y + 8, x + 26, y + 4, RED, 2);
    fillCircle(x + 28, y + 26, 3, [245, 130, 32]);
  } else if (kind === "doc") {
    rect(x + 10, y + 6, 16, 24, WHITE);
    rect(x + 10, y + 6, 16, 3, INK);
    rect(x + 13, y + 13, 4, 8, RED);
    rect(x + 19, y + 13, 4, 12, INK);
    rect(x + 25, y + 13, 1, 6, RED);
  } else if (kind === "chart") {
    line(x + 6, y + 30, x + 30, y + 30, INK, 2);
    line(x + 6, y + 30, x + 6, y + 8, INK, 2);
    line(x + 9, y + 12, x + 15, y + 18, RED, 2);
    line(x + 15, y + 18, x + 21, y + 14, RED, 2);
    line(x + 21, y + 14, x + 28, y + 22, RED, 2);
    fillPoly(
      [
        [x + 28, y + 22],
        [x + 22, y + 22],
        [x + 28, y + 28],
      ],
      RED,
    );
  } else if (kind === "towers") {
    rect(x + 8, y + 12, 8, 18, INK);
    rect(x + 20, y + 8, 8, 22, INK);
    fillPoly(
      [
        [x + 20, y + 8],
        [x + 24, y + 2],
        [x + 28, y + 8],
      ],
      GOLD,
    );
    rect(x + 6, y + 30, 24, 2, GOLD);
  } else if (kind === "plane") {
    fillPoly(
      [
        [x + 6, y + 20],
        [x + 30, y + 12],
        [x + 26, y + 20],
        [x + 30, y + 24],
        [x + 10, y + 26],
      ],
      INK,
    );
    rect(x + 16, y + 22, 4, 8, RED);
  } else if (kind === "scales") {
    vline(x + 18, y + 6, 22, INK, 2);
    hline(x + 8, y + 10, 20, INK, 2);
    line(x + 8, y + 10, x + 6, y + 18, INK, 1);
    line(x + 28, y + 10, x + 30, y + 18, INK, 1);
    fillPoly(
      [
        [x + 2, y + 18],
        [x + 10, y + 18],
        [x + 6, y + 24],
      ],
      GOLD,
    );
    fillPoly(
      [
        [x + 26, y + 18],
        [x + 34, y + 18],
        [x + 30, y + 24],
      ],
      GOLD,
    );
    hline(x + 10, y + 30, 16, INK, 2);
  }
}

// ---------------------------------------------------------------------------
// Content (all facts from the verified research; numbers as reported)
// ---------------------------------------------------------------------------
interface Hero {
  kicker: string;
  scene: string;
  lines: string[];
  sub: string;
}
const HEROES: Hero[] = [
  {
    kicker: "TECHNOLOGY \u2022 SPACE",
    scene: "space",
    lines: ["1 MILLION", "SATELLITES", "IN ORBIT"],
    sub: "FCC OKS SPACEX PLAN FOR 1M ORBITAL DATA CENTRES",
  },
  {
    kicker: "DISASTER \u2022 EGYPT",
    scene: "fire",
    lines: ["TANKER FIRE", "KILLS 31"],
    sub: "TANKER OVERTURNS; 21 HURT, CAUSE PROBED",
  },
  {
    kicker: "WEATHER \u2022 USA",
    scene: "storm",
    lines: ["MACY'S", "PARADE", "POSTPONED"],
    sub: "STORM HITS THANKSGIVING; NJ IN EMERGENCY",
  },
];

interface Mid {
  icon: string;
  tag: string;
  lines: string[];
  sub: string;
  claim: boolean;
}
const MID: Mid[] = [
  { icon: "missile", tag: "MIDDLE EAST", lines: ["HOUTHI HITS", "GULF PORTS"], sub: "OIL JUMPS; JEDDAH, JAZAN CLAIMED", claim: true },
  { icon: "doc", tag: "RUSSIA", lines: ["DEAD: 490,334"], sub: "LEAKED FILES; TRUE TOLL MAY TOP 700,000", claim: false },
  { icon: "chart", tag: "MARKETS", lines: ["TRUMP TARIFFS", "HIT 14 NATIONS"], sub: "NASDAQ -0.62%, NVIDIA -3.91% AT CLOSE", claim: false },
  { icon: "towers", tag: "DIPLOMACY", lines: ["ABU DHABI", "TALKS STALL"], sub: "TALKS STALL; PRISONER SWAP ONLY", claim: false },
  { icon: "plane", tag: "UKRAINE", lines: ["UKRAINE HITS", "5 WARPLANES"], sub: "3 MIG-31S, 2 SU-34S DAMAGED, KYIV CLAIMS", claim: true },
  { icon: "scales", tag: "ISRAEL", lines: ["NETANYAHU", "CASES EASE"], sub: "JUDGES URGE DROPPING ONE BRIBERY CASE", claim: false },
];

interface Brief {
  cat: RGB;
  text: string;
}
const BRIEF_A: Brief[] = [
  { cat: RUST, text: "SUDAN: RSF DRONE KILLS 19 CIVILIANS" },
  { cat: OCHRE, text: "BOGOR: MINE FLOOD KILLS 9, 17 TRAPPED" },
  { cat: BLUE, text: "SHENZHOU-24: FIRST PAKISTANI IN ORBIT" },
  { cat: RUST, text: "GAZA: STORM THREATENS 1.76M IN TENTS" },
  { cat: PURPLE, text: "LIBYA: 2 NAVY OFFICERS KILLED BY DRONE" },
  { cat: RUST, text: "LEBANON PLANS SECOND INTL AIRPORT" },
  { cat: BLUE, text: "POLAND WANTS NATO AIR SHIELD" },
  { cat: BLUE, text: "MURMANSK GOVERNOR HELD FOR GRAFT" },
  { cat: BLUE, text: "NATIONS URGE RUSSIA: STOP RIOT AGENTS" },
  { cat: BLUE, text: "NATO VOWS TO DEFEND SPACE" },
  { cat: BLUE, text: "UKRAINE: 88 OF 112 DRONES DOWNED" },
  { cat: BLUE, text: "EU PLANS $50BN TECH FUND" },
  { cat: BLUE, text: "GPS JAMMING HIT 140 NORTH SEA FLIGHTS" },
  { cat: GREEN, text: "BIRTHRIGHT ORDER BLOCKED BY 2ND JUDGE" },
  { cat: GREEN, text: "ARMY BLOWS UP 4.5 TONS OF EXPLOSIVES" },
  { cat: GREEN, text: "ECUADOR TALKS WITH US ON OPERATIONS" },
];
const BRIEF_B: Brief[] = [
  { cat: GREEN, text: "UCL: PSG HELD, BAYERN BEATEN BY LILLE" },
  { cat: GREEN, text: "NBA UNVEILS $11BN EUROPE ARENA PLAN" },
  { cat: GREEN, text: "ABREGO GARCIA ARRIVES IN SPAIN" },
  { cat: GREEN, text: "DEMOCRATS FLIP NORTH CAROLINA SENATE" },
  { cat: GREEN, text: "CALIFORNIA BRACES FOR KING TIDE FLOODS" },
  { cat: GREEN, text: "COLOMBIA: 30 HOSTAGES FREED" },
  { cat: OCHRE, text: "SHANGHAI PARTY CHIEF PROBED FOR GRAFT" },
  { cat: OCHRE, text: "N. KOREA EXPELS SWISS ENVOY" },
  { cat: OCHRE, text: "CHINA STILL GETS NVIDIA AI CHIPS" },
  { cat: OCHRE, text: "AUSTRALIA SIGNS PACT WITH SOLOMONS" },
  { cat: OCHRE, text: "HANOI HOT POT BLAST KILLS 6" },
  { cat: OCHRE, text: "MALAYSIA TO RETURN 6,803 MYANMAR PEOPLE" },
  { cat: PURPLE, text: "KENYA CULT LEADER FACES NEW CHARGES" },
  { cat: PURPLE, text: "NIGERIA SEIZES $220M METH, 5 HELD" },
  { cat: PURPLE, text: "TURKIYE SENDS F-16S TO SOMALIA" },
  { cat: GREY, text: "DURAN DURAN'S ANDY TAYLOR DIES, 65" },
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
function drawMasthead(): void {
  rect(0, 0, W, 60, NAVY);
  drawTextCenter(W / 2, 8, "MAKE.FUN \u2022 THE WORLD IN ONE IMAGE", 2, GOLD);
  drawTextCenter(W / 2, 26, "THURSDAY 26 NOVEMBER 2026", 4, WHITE);
  hline(0, 60, W, GOLD, 2);
}

function drawHeroes(): void {
  const colW = 328;
  const gap = 12;
  for (let i = 0; i < HEROES.length; i++) {
    const hero = HEROES[i];
    const x = 8 + i * (colW + gap);
    const y = 64;
    const w = colW;
    // panel
    rect(x, y, w, 296, WHITE);
    rect(x, y, 1, 296, GREY);
    rect(x + w - 1, y, 1, 296, GREY);
    rect(x, y, w, 1, GREY);
    rect(x, y + 295, w, 1, GREY);
    // kicker
    drawText(x + 12, y + 10, hero.kicker, 2, RED);
    // scene
    const sy = y + 30;
    if (hero.scene === "space") drawSpaceScene(x + 4, sy, w - 8, 104);
    else if (hero.scene === "fire") drawFireScene(x + 4, sy, w - 8, 104);
    else drawStormScene(x + 4, sy, w - 8, 104);
    // headline (centred, up to 3 lines, 28px)
    let hy = y + 146;
    for (const ln of hero.lines) {
      drawTextCenter(x + Math.floor(w / 2), hy, ln, 4, INK);
      hy += 34;
    }
    // sub (wrapped, up to 2 lines, 14px)
    textBox(x + 12, y + 252, w - 24, hero.sub, 2, 18, 2, [60, 66, 74], `hero${i + 1} sub`);
  }
}

function drawMid(): void {
  drawText(8, 366, "MORE OF THE DAY", 2, RED);
  hline(8, 384, W - 16, RED, 2);
  const colW = 328;
  const gap = 12;
  const rowH = 100;
  for (let i = 0; i < MID.length; i++) {
    const m = MID[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 8 + col * (colW + gap);
    const y = 390 + row * rowH;
    rect(x, y, colW, 96, WHITE);
    rect(x, y, colW, 1, GREY);
    rect(x, y + 95, colW, 1, GREY);
    drawIcon(m.icon, x + 8, y + 8);
    const tx = x + 52;
    const tw = colW - 60;
    drawText(tx, y + 8, m.tag, 2, RED);
    if (m.claim) {
      const cw = textWidth("CLAIM", 2);
      rect(tx + tw - cw - 8, y + 6, cw + 8, 16, RED);
      drawText(tx + tw - cw - 4, y + 9, "CLAIM", 2, WHITE);
    }
    let hy = y + 24;
    for (const ln of m.lines) {
      if (textWidth(ln, 3) > tw) warnings.push(`TRUNCATED [mid${i + 1} headline]: "${ln}"`);
      drawText(tx, hy, ln, 3, INK);
      hy += 22;
    }
    textBox(tx, y + 24 + m.lines.length * 22, tw, m.sub, 2, 13, 2, [60, 66, 74], `mid${i + 1} sub`);
  }
}

function drawBrief(): void {
  drawText(8, 592, "AROUND THE WORLD \u2022 32 MORE STORIES", 2, RED);
  hline(8, 610, W - 16, RED, 2);
  const rowH = 17;
  const cols = [BRIEF_A, BRIEF_B];
  for (let c = 0; c < 2; c++) {
    const x = c === 0 ? 8 : 520;
    const w = 496;
    for (let r = 0; r < cols[c].length; r++) {
      const item = cols[c][r];
      const y = 614 + r * rowH;
      fillCircle(x + 4, y + 5, 3, item.cat);
      if (textWidth(item.text, 2) > w - 16) {
        warnings.push(`TRUNCATED [brief ${c}-${r}]: "${item.text}"`);
      }
      drawText(x + 14, y, item.text, 2, INK);
    }
  }
}

function drawHonesty(): void {
  const x = 8;
  const y = 888;
  const w = W - 16;
  const h = 80;
  rect(x, y, w, h, BOXBG);
  rect(x, y, w, 1, GOLD);
  rect(x, y + h - 1, w, 1, GOLD);
  rect(x, y, 1, h, GOLD);
  rect(x + w - 1, y, 1, h, GOLD);
  drawTextCenter(x + Math.floor(w / 2), y + 6, "CLAIMED VS CONFIRMED - READ IT HONESTLY", 2, RED);
  const colW = Math.floor((w - 24) / 2);
  // left: claimed
  drawText(x + 12, y + 28, "CLAIMED - NOT YET VERIFIED", 2, RED);
  textBox(x + 12, y + 46, colW, "HOUTHI STRIKES; IRAN MINE CLAIMS;", 2, 15, 1, INK, "honesty claimed");
  textBox(x + 12, y + 61, colW, "SAVASLEYKA; GPS BLAME; EXECUTIONS STAYED", 2, 15, 1, INK, "honesty claimed 2");
  // right: confirmed
  const rx = x + 12 + colW + 12;
  drawText(rx, y + 28, "CONFIRMED - AS REPORTED", 2, GREEN);
  textBox(rx, y + 46, colW, "CAIRO 31; SUDAN 19; FCC 1M SATELLITES", 2, 15, 1, INK, "honesty confirmed");
  textBox(rx, y + 61, colW, "MACY'S DELAY; ROSSTAT LEAK", 2, 15, 1, INK, "honesty confirmed 2");
}

function drawFooter(): void {
  rect(0, 972, W, 52, NAVY);
  drawTextCenter(
    W / 2,
    980,
    "SOURCES: REUTERS \u2022 BBC \u2022 AP \u2022 CNN \u2022 WSJ \u2022 FOX WEATHER \u2022 UEFA \u2022 NATURE \u2022 AFP",
    2,
    WHITE,
  );
  drawTextCenter(
    W / 2,
    1000,
    "EVENTS FIRST REPORTED 26 NOV 2026 UNLESS DATED \u2022 DRAWN BY KAIKENAL93-ARCH",
    2,
    GOLD,
  );
}

// ---------------------------------------------------------------------------
// PNG encode (RGB, filter Sub per row, deflate level 9)
// ---------------------------------------------------------------------------
function encodePNG(): Uint8Array {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowBytes = W * 3;
  const raw = new Uint8Array((rowBytes + 1) * H);
  for (let y = 0; y < H; y++) {
    const off = y * (rowBytes + 1);
    raw[off] = 1; // filter: Sub
    for (let i = 0; i < rowBytes; i++) {
      const src = y * rowBytes + i;
      const left = i >= 3 ? px[src - 3] : 0;
      raw[off + 1 + i] = (px[src] - left) & 0xff;
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// Walk a finished PNG buffer chunk by chunk and verify every CRC and the
// structure (signature, IHDR first, IEND last, no trailing bytes). Returns
// the list of chunk types found; throws on the first problem.
function verifyPngChunks(buf: Uint8Array): string[] {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error(`bad PNG signature at byte ${i}`);
  }
  const found: string[] = [];
  let off = 8;
  while (off + 12 <= buf.length) {
    const len =
      (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3];
    const type = String.fromCharCode(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7]);
    if (off + 12 + len > buf.length) throw new Error(`chunk ${type} overruns file`);
    const stored =
      (buf[off + 8 + len] << 24) |
      (buf[off + 9 + len] << 16) |
      (buf[off + 10 + len] << 8) |
      buf[off + 11 + len];
    const actual = crc32(buf.subarray(off + 4, off + 8 + len));
    if ((stored >>> 0) !== actual) throw new Error(`CRC mismatch in chunk ${type}`);
    found.push(type);
    off += 12 + len;
    if (type === "IEND") break;
  }
  if (found[0] !== "IHDR") throw new Error("first chunk is not IHDR");
  if (found[found.length - 1] !== "IEND") throw new Error("last chunk is not IEND");
  if (off !== buf.length) throw new Error(`trailing bytes after IEND: ${buf.length - off}`);
  return found;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  rect(0, 0, W, H, PAPER);
  drawMasthead();
  drawHeroes();
  drawMid();
  drawBrief();
  drawHonesty();
  drawFooter();

  const png = encodePNG();
  const chunks = verifyPngChunks(png);
  console.log(`PNG chunk walk: ${chunks.join(" -> ")} (all CRCs OK)`);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/entry.png`, png);
  const sha = createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${outDir}/entry.png  ${png.length} bytes  sha256 ${sha}`);
  if (png.length > 1048576) {
    console.log("ERROR: entry.png exceeds 1 MiB");
    process.exitCode = 1;
  }
  if (warnings.length > 0) {
    console.log(`TRUNCATIONS: ${warnings.length}`);
    for (const w of warnings) console.log(`  ${w}`);
    process.exitCode = 1;
  } else {
    console.log("TRUNCATIONS: 0");
  }
}

main();
