// news-image-20261126 — v3
// "The World in One Image" — Thursday 26 November 2026.
// A single self-contained Node 22 program (standard library only).
// Draws one 1024x1024 PNG: masthead, dot-grid world map strip,
// three hero stories, six mid stories, 32 briefs, an honesty box
// and a footer. Fully deterministic: no network, no Date.now,
// no Math.random. Every glyph and every PNG byte is produced here.
import * as fs from "node:fs";
import * as zlib from "node:zlib";
import * as path from "node:path";

const W = 1024;
const H = 1024;

// ---- palette ----
const PAPER = "#F6F1E7";
const INK = "#14202E";
const NAVY = "#0F1B2D";
const RED = "#C1272D";
const GOLD = "#D9A441";
const WHITE = "#FFFFFF";
const GREY = "#6E7680";
const GREEN = "#1E7A4C";
const BLUE = "#2E5A88";
const OCHRE = "#8A5A00";
const PURPLE = "#7A3E8C";
const RUST = "#A63A2A";
const OCEAN = "#D7E4EE";
const SLATE = "#2B3A4A";
const ORANGE = "#E86A1C";
const YELLOW = "#F2C230";
const LIGHTGREY = "#D8D2C4";

// ---- canvas (RGB) ----
const px = new Uint8Array(W * H * 3);
function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function setPx(x: number, y: number, c: string): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const [r, g, b] = hexRgb(c);
  const i = (y * W + x) * 3;
  px[i] = r; px[i + 1] = g; px[i + 2] = b;
}
function fillRect(x: number, y: number, w: number, h: number, c: string): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  const [r, g, b] = hexRgb(c);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      px[i] = r; px[i + 1] = g; px[i + 2] = b;
      i += 3;
    }
  }
}
function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: string): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(x, y, c);
    }
  }
}
function fillCircle(cx: number, cy: number, r: number, c: string): void {
  fillEllipse(cx, cy, r, r, c);
}
// Bresenham line, 1px.
function drawLine(x0: number, y0: number, x1: number, y1: number, c: string): void {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (let guard = 0; guard < 4096; guard++) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
// Thick stroke: stamps w×w squares along the line.
function stroke(x0: number, y0: number, x1: number, y1: number, w: number, c: string): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const half = Math.floor(w / 2);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    fillRect(x - half, y - half, w, w, c);
  }
}
function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: string): void {
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) setPx(x, y, c);
    }
  }
}
function fillPolygon(pts: [number, number][], c: string): void {
  // Scanline even-odd fill.
  let minY = H;
  let maxY = 0;
  for (const p of pts) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(a[0] + t * (b[0] - a[0]));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      fillRect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, 1, c);
    }
  }
}
function borderRect(x: number, y: number, w: number, h: number, t: number, c: string): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

// ---- 5x7 bitmap font (own design) ----
// Each glyph: 7 rows of 5 bits. "#" = ink, "." = blank.
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
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
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
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "•": ["00000", "00000", "01110", "01110", "01110", "00000", "00000"],
};
// Advance per character: 5*scale, plus 1px tracking at scale 3 and 4.
function advance(scale: number): number {
  return 5 * scale + (scale >= 3 ? 1 : 0);
}
function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * advance(scale) - (scale >= 3 ? 1 : 0);
}
function drawGlyph(ch: string, x: number, y: number, scale: number, color: string): void {
  const g = FONT[ch] || FONT["?"];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      if (g[r][c] === "1") fillRect(x + c * scale, y + r * scale, scale, scale, color);
    }
  }
}
function drawText(x: number, y: number, text: string, scale: number, color: string): void {
  let cx = x;
  for (const ch of text) {
    drawGlyph(ch, cx, y, scale, color);
    cx += advance(scale);
  }
}
function drawTextCenter(cx: number, y: number, text: string, scale: number, color: string): void {
  drawText(cx - Math.floor(textWidth(text, scale) / 2), y, text, scale, color);
}

// ---- warnings / text box ----
const warnings: string[] = [];
function wrapText(text: string, scale: number, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxW || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
// Wraps text into a box; records a warning (with label) if it does not fit.
function textBox(
  x: number, y: number, w: number, text: string, scale: number,
  lineHeight: number, maxLines: number, color: string, label: string,
  alignCenter = false
): void {
  const lines = wrapText(text, scale, w);
  if (lines.length > maxLines) {
    warnings.push(label + ": " + lines.length + " lines, max " + maxLines + " — " + text);
  }
  const shown = lines.slice(0, maxLines);
  shown.forEach((ln, i) => {
    if (alignCenter) drawTextCenter(x + Math.floor(w / 2), y + i * lineHeight, ln, scale, color);
    else drawText(x, y + i * lineHeight, ln, scale, color);
  });
}

// ---- PNG encoder (RGB, zlib deflate, CRC-32) ----
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
// Walks the PNG chunks and verifies every CRC.
function verifyPng(buf: Buffer): boolean {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return false;
  let off = 8;
  let sawIEND = false;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    if (off + 12 + len > buf.length) return false;
    const stored = buf.readUInt32BE(off + 8 + len);
    const calc = crc32(buf.subarray(off + 4, off + 8 + len));
    if (stored !== calc) return false;
    if (type === "IEND") sawIEND = true;
    off += 12 + len;
    if (type === "IEND") break;
  }
  return sawIEND && off === buf.length;
}

// ---- hero scenes (flat vector, ~92px tall, drawn inside x..x+w, y..y+h) ----
function drawGulf(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, NAVY);
  // stars
  const stars: [number, number][] = [[18, 8], [52, 16], [96, 6], [150, 12], [205, 8], [248, 18], [282, 6], [120, 22], [180, 20], [230, 26], [70, 26]];
  for (const s of stars) fillRect(x + s[0], y + s[1], 2, 2, GOLD);
  // moon
  fillCircle(x + 272, y + 14, 7, "#EFE3B8");
  // drones: small bodies with rotors, upper sky
  for (const d of [[58, 30], [196, 24]] as [number, number][]) {
    fillRect(x + d[0], y + d[1], 16, 5, "#0A0F16");
    stroke(x + d[0] - 4, y + d[1] - 3, x + d[0] + 20, y + d[1] - 3, 2, GREY);
    stroke(x + d[0] + 2, y + d[1] + 5, x + d[0] + 2, y + d[1] + 9, 2, GREY);
    stroke(x + d[0] + 14, y + d[1] + 5, x + d[0] + 14, y + d[1] + 9, 2, GREY);
    fillRect(x + d[0] + 6, y + d[1] + 1, 3, 3, RED);
  }
  // ground
  fillRect(x, y + h - 16, w, 16, "#1A2A3A");
  // refinery towers with flames
  const towers: [number, number, number][] = [[30, 34, 40], [86, 26, 52], [150, 30, 46]];
  for (const t of towers) {
    fillRect(x + t[0], y + h - 16 - t[2], 16, t[2], GREY);
    fillRect(x + t[0] + 16, y + h - 16 - t[2] + 10, 10, t[2] - 10, "#8A929C");
    // flame
    fillTriangle(x + t[0] + 1, y + h - 16 - t[2], x + t[0] + 15, y + h - 16 - t[2], x + t[0] + 8, y + h - 16 - t[2] - 14, ORANGE);
    fillTriangle(x + t[0] + 4, y + h - 16 - t[2], x + t[0] + 12, y + h - 16 - t[2], x + t[0] + 8, y + h - 16 - t[2] - 8, YELLOW);
  }
  // flare stack
  stroke(x + 210, y + h - 16, x + 210, y + h - 58, 4, GREY);
  fillTriangle(x + 204, y + h - 58, x + 216, y + h - 58, x + 210, y + h - 72, ORANGE);
  // tanker silhouette on the water line, right
  fillPolygon([[x + 228, y + h - 16], [x + 292, y + h - 16], [x + 284, y + h - 6], [x + 236, y + h - 6]], "#0A0F16");
  fillRect(x + 268, y + h - 30, 14, 14, "#0A0F16");
  fillRect(x + 272, y + h - 36, 4, 6, "#0A0F16");
  // sea shimmer
  for (let i = 0; i < 5; i++) fillRect(x + 232 + i * 12, y + h - 4, 8, 1, BLUE);
}
function drawStorm(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SLATE);
  // storm clouds
  fillEllipse(x + 70, y + 16, 62, 14, "#1C2733");
  fillEllipse(x + 200, y + 12, 70, 13, "#1C2733");
  fillEllipse(x + 140, y + 24, 56, 12, "#232F3D");
  // rain, slanted
  for (let i = 0; i < 14; i++) {
    const rx = x + 12 + i * 21;
    const ry = y + 34 + (i % 3) * 8;
    stroke(rx, ry, rx - 5, ry + 12, 1, "#9FB4C4");
  }
  // lightning bolt
  fillPolygon([[x + 150, y + 30], [x + 162, y + 30], [x + 154, y + 52], [x + 164, y + 52], [x + 146, y + 80], [x + 152, y + 54], [x + 143, y + 54]], YELLOW);
  // house, dark windows
  fillRect(x + 18, y + h - 34, 62, 34, "#20262E");
  fillTriangle(x + 12, y + h - 34, x + 86, y + h - 34, x + 49, y + h - 52, "#141A20");
  fillRect(x + 28, y + h - 26, 12, 12, "#05080C");
  fillRect(x + 58, y + h - 26, 12, 12, "#05080C");
  // leaning power pole with a fallen line
  stroke(x + 252, y + 14, x + 236, y + h - 6, 5, "#4A3A28");
  stroke(x + 240, y + 26, x + 268, y + 20, 4, "#4A3A28");
  stroke(x + 244, y + 24, x + 214, y + 44, 2, "#0A0F16");
  stroke(x + 214, y + 44, x + 196, y + h - 8, 2, "#0A0F16");
  // ground
  fillRect(x, y + h - 6, w, 6, "#141A20");
}
function drawFire(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, "#EFE3CC");
  // sky haze + smoke
  fillEllipse(x + 220, y + 16, 46, 12, "#9A938A");
  fillEllipse(x + 250, y + 8, 30, 9, "#B0A89E");
  // road
  fillRect(x, y + 52, w, h - 52, "#5A5E63");
  fillRect(x, y + 52, w, 3, WHITE);
  for (let i = 0; i < 6; i++) fillRect(x + 12 + i * 52, y + 72, 26, 3, "#C8C2B2");
  // fuel pool on the road
  fillEllipse(x + 150, y + 74, 74, 10, ORANGE);
  fillEllipse(x + 150, y + 74, 48, 6, YELLOW);
  // overturned tanker: tank lying on its side, wheels ABOVE it
  fillEllipse(x + 150, y + 44, 96, 20, "#C8C8C8");
  fillRect(x + 60, y + 40, 180, 8, "#8A929C");
  fillRect(x + 60, y + 46, 180, 4, RED);
  // wheels above the tank
  for (const wx of [84, 150, 216]) {
    fillCircle(x + wx, y + 18, 9, "#141414");
    fillCircle(x + wx, y + 18, 4, "#6E7680");
  }
  // red hazard diamond on the tank
  fillPolygon([[x + 150, y + 28], [x + 166, y + 44], [x + 150, y + 60], [x + 134, y + 44]], RED);
  fillPolygon([[x + 150, y + 34], [x + 160, y + 44], [x + 150, y + 54], [x + 140, y + 44]], WHITE);
  fillRect(x + 148, y + 38, 4, 10, RED);
  fillRect(x + 148, y + 50, 4, 4, RED);
  // flames rising from pool and tank
  for (const f of [[96, 62], [150, 58], [204, 62]] as [number, number][]) {
    fillTriangle(x + f[0] - 14, y + f[1] + 12, x + f[0] + 14, y + f[1] + 12, x + f[0], y + f[1] - 16, ORANGE);
    fillTriangle(x + f[0] - 7, y + f[1] + 12, x + f[0] + 7, y + f[1] + 12, x + f[0], y + f[1] - 6, YELLOW);
  }
}

// ---- 36x36 mid icons: bold strokes, at least 2px thick ----
function drawSat(ox: number, oy: number): void {
  fillRect(ox + 2, oy + 15, 9, 7, BLUE);
  fillRect(ox + 25, oy + 15, 9, 7, BLUE);
  stroke(ox + 11, oy + 18, ox + 14, oy + 18, 2, INK);
  stroke(ox + 22, oy + 18, ox + 25, oy + 18, 2, INK);
  fillRect(ox + 13, oy + 12, 10, 12, INK);
  fillRect(ox + 15, oy + 14, 6, 8, GOLD);
  stroke(ox + 18, oy + 12, ox + 30, oy + 2, 3, INK);
  stroke(ox + 26, oy + 2, ox + 32, oy + 8, 3, RED);
  fillRect(ox + 16, oy + 26, 4, 4, RED);
}
function drawShip(ox: number, oy: number): void {
  fillRect(ox + 8, oy + 6, 8, 8, RED);
  fillRect(ox + 18, oy + 6, 8, 8, BLUE);
  fillRect(ox + 13, oy + 14, 8, 6, GOLD);
  fillPolygon([[ox + 2, oy + 20], [ox + 34, oy + 20], [ox + 30, oy + 30], [ox + 6, oy + 30]], INK);
  stroke(ox + 2, oy + 33, ox + 12, oy + 33, 2, BLUE);
  stroke(ox + 16, oy + 33, ox + 34, oy + 33, 2, BLUE);
}
function drawDoc(ox: number, oy: number): void {
  borderRect(ox + 9, oy + 2, 18, 30, 3, INK);
  fillRect(ox + 9, oy + 2, 18, 30, WHITE);
  borderRect(ox + 9, oy + 2, 18, 30, 3, INK);
  fillPolygon([[ox + 21, oy + 2], [ox + 27, oy + 2], [ox + 27, oy + 8]], GREY);
  stroke(ox + 13, oy + 12, ox + 23, oy + 12, 2, INK);
  stroke(ox + 13, oy + 18, ox + 23, oy + 18, 2, INK);
  stroke(ox + 13, oy + 24, ox + 19, oy + 24, 2, INK);
  fillCircle(ox + 24, oy + 27, 4, RED);
}
function drawChart(ox: number, oy: number): void {
  stroke(ox + 4, oy + 4, ox + 4, oy + 32, 3, INK);
  stroke(ox + 4, oy + 32, ox + 33, oy + 32, 3, INK);
  fillRect(ox + 8, oy + 22, 6, 10, BLUE);
  fillRect(ox + 16, oy + 15, 6, 17, GOLD);
  fillRect(ox + 24, oy + 8, 6, 24, RED);
  stroke(ox + 7, oy + 12, ox + 17, oy + 7, 3, GREEN);
  stroke(ox + 17, oy + 7, ox + 30, oy + 3, 3, GREEN);
  fillPolygon([[ox + 30, oy + 3], [ox + 24, oy + 2], [ox + 28, oy + 8]], GREEN);
}
function drawPlane(ox: number, oy: number): void {
  fillRect(ox + 15, oy + 2, 6, 32, INK);
  fillPolygon([[ox + 15, oy + 2], [ox + 21, oy + 2], [ox + 18, oy + 10]], INK);
  fillRect(ox + 2, oy + 14, 32, 6, INK);
  fillRect(ox + 10, oy + 28, 16, 4, INK);
  fillRect(ox + 16, oy + 8, 4, 6, RED);
  fillCircle(ox + 18, oy + 6, 2, RED);
}
function drawTanker(ox: number, oy: number): void {
  fillPolygon([[ox + 2, oy + 20], [ox + 34, oy + 20], [ox + 30, oy + 30], [ox + 6, oy + 30]], INK);
  fillRect(ox + 24, oy + 10, 8, 10, INK);
  fillRect(ox + 26, oy + 6, 3, 4, RED);
  fillEllipse(ox + 12, oy + 12, 7, 4, GREY);
  fillEllipse(ox + 10, oy + 7, 4, 3, GREY);
  stroke(ox + 2, oy + 33, ox + 12, oy + 33, 2, BLUE);
  stroke(ox + 16, oy + 33, ox + 34, oy + 33, 2, BLUE);
}

// ---- story data (facts verified against at least two reputable sources) ----
type Hero = { kicker: string; scene: "gulf" | "storm" | "fire"; lines: [string, string]; sub: string };
const HEROES: Hero[] = [
  {
    kicker: "MIDDLE EAST • GULF",
    scene: "gulf",
    lines: ["3 DEAD AS", "GULF WAR WIDENS"],
    sub: "KUWAIT DRONES KILL 2 ITALIANS; HOUTHI HIT KILLS 1 AT JAZAN",
  },
  {
    kicker: "WEATHER • USA",
    scene: "storm",
    lines: ["1 MILLION", "IN THE DARK"],
    sub: "NOR'EASTER CUTS POWER; PHILLY PARADE AXED",
  },
  {
    kicker: "DISASTER • EGYPT",
    scene: "fire",
    lines: ["TANKER FIRE", "KILLS 31"],
    sub: "TANKER OVERTURNS; 21 HURT, CAUSE PROBED",
  },
];
type Mid = { icon: "sat" | "ship" | "doc" | "chart" | "plane" | "tanker"; tag: string; lines: [string, string]; sub: string; claim: boolean };
const MIDS: Mid[] = [
  { icon: "sat", tag: "SPACE", lines: ["FCC OKS 1M", "SATELLITES"], sub: "SPACEX STARMIND: ORBITAL DATA CENTRES", claim: false },
  { icon: "ship", tag: "BLACK SEA", lines: ["RUSSIA HITS", "2 GRAIN SHIPS"], sub: "100,000 TONS; ZELENSKYY WARNS OF NEW STRIKE", claim: false },
  { icon: "doc", tag: "RUSSIA", lines: ["DEAD: 490,334"], sub: "LEAKED FILES; TRUE TOLL MAY TOP 700,000", claim: false },
  { icon: "chart", tag: "MARKETS", lines: ["TRUMP TARIFFS", "HIT 14 NATIONS"], sub: "NASDAQ -0.62%, NVIDIA -3.91% AT CLOSE", claim: false },
  { icon: "plane", tag: "UKRAINE", lines: ["UKRAINE HITS", "5 WARPLANES"], sub: "3 MIG-31S, 2 SU-34S DAMAGED, KYIV CLAIMS", claim: true },
  { icon: "tanker", tag: "HORMUZ", lines: ["TANKER HIT", "IN HORMUZ"], sub: "UKMTO CONFIRMS STRIKE; IRAN MINE CLAIM UNVERIFIED", claim: true },
];
type Brief = { color: string; text: string };
const BRIEFS_A: Brief[] = [
  { color: RUST, text: "SUDAN: RSF DRONE KILLS 19 CIVILIANS" },
  { color: OCHRE, text: "BOGOR: 13 DEAD; RAIN HALTS RESCUE" },
  { color: BLUE, text: "SHENZHOU-24: FIRST PAKISTANI IN ORBIT" },
  { color: RUST, text: "GAZA: STORM THREATENS 1.76M IN TENTS" },
  { color: PURPLE, text: "LIBYA: 2 NAVY OFFICERS KILLED BY DRONE" },
  { color: RUST, text: "BANGKOK: REFINERY BLAST HURTS 9, 3 CRITICAL" },
  { color: BLUE, text: "POLAND WANTS NATO AIR SHIELD" },
  { color: BLUE, text: "MURMANSK GOVERNOR HELD FOR GRAFT" },
  { color: BLUE, text: "NATIONS URGE RUSSIA: STOP RIOT AGENTS" },
  { color: BLUE, text: "UKRAINE: 88 OF 112 DRONES DOWNED" },
  { color: BLUE, text: "EU PLANS $50BN TECH FUND" },
  { color: BLUE, text: "EU SUMMIT: 45BN EURO UKRAINE LOAN" },
  { color: GREEN, text: "BIRTHRIGHT ORDER BLOCKED BY 2ND JUDGE" },
  { color: GREEN, text: "BOK RAISES RATE TO 3.25%" },
  { color: GREEN, text: "US GDP REVISED UP TO 4.3%" },
  { color: GREEN, text: "ECUADOR TALKS WITH US ON OPERATIONS" },
];
const BRIEFS_B: Brief[] = [
  { color: GREEN, text: "UCL: PSG HELD, BAYERN BEATEN BY LILLE" },
  { color: GREEN, text: "DOW CLOSES ABOVE 50,000 FIRST TIME" },
  { color: GREEN, text: "ABREGO GARCIA ARRIVES IN SPAIN" },
  { color: GREEN, text: "DEMOCRATS FLIP NORTH CAROLINA SENATE" },
  { color: GREEN, text: "CALIFORNIA BRACES FOR KING TIDE FLOODS" },
  { color: GREEN, text: "COLOMBIA: 30 HOSTAGES FREED" },
  { color: OCHRE, text: "SHANGHAI PARTY CHIEF PROBED FOR GRAFT" },
  { color: OCHRE, text: "N. KOREA EXPELS SWISS ENVOY" },
  { color: OCHRE, text: "CHINA STILL GETS NVIDIA AI CHIPS" },
  { color: OCHRE, text: "AUSTRALIA SIGNS PACT WITH SOLOMONS" },
  { color: OCHRE, text: "HANOI HOT POT BLAST KILLS 6" },
  { color: GREEN, text: "GUKESH-SINDAROV: GAME 3 DRAWN, 1.5-1.5" },
  { color: GREEN, text: "INDIA MARKS 18 YEARS SINCE 26/11" },
  { color: PURPLE, text: "NETANYAHU: JUDGES URGE DROPPING CASE" },
  { color: PURPLE, text: "KIM INSPECTS NUCLEAR WARHEADS" },
  { color: GREY, text: "DURAN DURAN'S ANDY TAYLOR DIES, 65" },
];
const CLAIMED = ["HOUTHI STRIKES; IRAN MINE CLAIMS;", "SAVASLEYKA; EXECUTIONS; KUWAIT BLAME"];
const CONFIRMED = ["CAIRO 31; SUDAN 19; JAZAN 1 DEAD", "STORM: 1M DARK; BOGOR 13; BANGKOK 9"];

// ---- world map strip (y 62-108) ----
// Simplified continent bitmap: land = union of ellipses (cx, cy, rx, ry)
// in strip coordinates. Longitude maps x = (lon + 170) / 360 * 1024,
// latitude maps y = 62 + (75 - lat) / 130 * 46.
const LAND: [number, number, number, number][] = [
  [210, 82, 95, 17], // North America
  [258, 94, 28, 7], // Central America
  [385, 71, 26, 7], // Greenland
  [320, 96, 55, 12], // South America
  [525, 74, 62, 9], // Europe
  [472, 70, 9, 5], // Britain
  [530, 93, 58, 12], // Africa
  [795, 79, 210, 13], // Asia
  [878, 76, 12, 6], // Japan
  [810, 98, 55, 6], // South-East Asia / Indonesia
  [863, 102, 55, 7], // Australia
];
function isLand(x: number, y: number): boolean {
  for (const e of LAND) {
    const dx = (x - e[0]) / e[2];
    const dy = (y - e[1]) / e[3];
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}
function drawPin(x: number, y: number): void {
  fillPolygon([[x, y - 7], [x + 7, y], [x, y + 7], [x - 7, y]], GOLD);
  fillPolygon([[x, y - 5], [x + 5, y], [x, y + 5], [x - 5, y]], RED);
}
function drawPinLabel(x: number, y: number, text: string): void {
  const w = textWidth(text, 1);
  fillRect(x - 1, y - 1, w + 2, 9, PAPER);
  drawText(x, y, text, 1, INK);
}
function drawMapStrip(): void {
  fillRect(0, 62, W, 46, OCEAN);
  for (let y = 64; y <= 106; y += 4) {
    for (let x = 4; x <= 1020; x += 4) {
      if (isLand(x, y)) fillRect(x, y, 3, 3, BLUE);
    }
  }
  const pins: [number, number, string, number, number][] = [
    // pin x, pin y, label, label x, label y
    [273, 74, "NEW YORK", 285, 70],
    [569, 72, "ODESA", 527, 63],
    [572, 78, "CAIRO", 548, 88],
    [620, 78, "KUWAIT", 630, 68],
    [603, 83, "JAZAN", 611, 89],
    [768, 84, "BANGKOK", 780, 81],
  ];
  for (const p of pins) drawPin(p[0], p[1]);
  for (const p of pins) drawPinLabel(p[3], p[4], p[2]);
}

// ---- layout ----
function drawHero(h: Hero, x: number, y: number, w: number, hh: number): void {
  fillRect(x, y, w, hh, WHITE);
  borderRect(x, y, w, hh, 1, LIGHTGREY);
  drawText(x + 12, y + 8, h.kicker, 2, RED);
  const sx = x + 12;
  const sy = y + 28;
  if (h.scene === "gulf") drawGulf(sx, sy, w - 24, 92);
  else if (h.scene === "storm") drawStorm(sx, sy, w - 24, 92);
  else drawFire(sx, sy, w - 24, 92);
  drawTextCenter(x + Math.floor(w / 2), y + 128, h.lines[0], 4, INK);
  drawTextCenter(x + Math.floor(w / 2), y + 162, h.lines[1], 4, INK);
  textBox(x + 12, y + 204, w - 24, h.sub, 2, 16, 2, INK, "hero-sub: " + h.lines[0], true);
}
function drawMid(m: Mid, x: number, y: number, w: number, hh: number): void {
  fillRect(x, y, w, hh, WHITE);
  fillRect(x, y, w, 1, GREY);
  fillRect(x, y + hh - 1, w, 1, GREY);
  if (m.icon === "sat") drawSat(x + 10, y + 10);
  else if (m.icon === "ship") drawShip(x + 10, y + 10);
  else if (m.icon === "doc") drawDoc(x + 10, y + 10);
  else if (m.icon === "chart") drawChart(x + 10, y + 10);
  else if (m.icon === "plane") drawPlane(x + 10, y + 10);
  else drawTanker(x + 10, y + 10);
  drawText(x + 56, y + 4, m.tag, 2, RED);
  if (m.claim) {
    fillRect(x + w - 70, y + 2, 62, 16, RED);
    drawText(x + w - 64, y + 3, "CLAIM", 2, WHITE);
  }
  drawText(x + 56, y + 20, m.lines[0], 3, INK);
  if (m.lines[1]) drawText(x + 56, y + 41, m.lines[1], 3, INK);
  textBox(x + 56, y + 64, w - 68, m.sub, 2, 15, 2, GREY, "mid-sub: " + m.tag);
}
function drawBriefs(): void {
  const cols: [number, Brief[]][] = [[8, BRIEFS_A], [520, BRIEFS_B]];
  for (const col of cols) {
    const cx = col[0];
    const list = col[1];
    list.forEach((b, i) => {
      const ry = 636 + i * 16;
      fillCircle(cx + 4, ry + 7, 4, b.color);
      textBox(cx + 14, ry + 1, 482, b.text, 2, 14, 1, INK, "brief: " + b.text);
    });
  }
}
function drawHonesty(): void {
  const x = 8;
  const y = 894;
  const w = 1008;
  const h = 76;
  fillRect(x, y, w, h, WHITE);
  borderRect(x, y, w, h, 2, GOLD);
  drawTextCenter(x + Math.floor(w / 2), y + 4, "CLAIMED VS CONFIRMED • DATE CHECK: THU 26 NOV 2026", 2, RED);
  fillRect(x + Math.floor(w / 2), y + 24, 1, h - 28, LIGHTGREY);
  drawTextCenter(x + 252, y + 22, "CLAIMED - NOT YET VERIFIED", 2, RED);
  drawTextCenter(x + 756, y + 22, "CONFIRMED - AS REPORTED", 2, GREEN);
  for (let i = 0; i < 2; i++) {
    textBox(x + 12, y + 40 + i * 16, 480, CLAIMED[i], 2, 16, 1, INK, "honesty-claimed-" + i, true);
    textBox(x + 516, y + 40 + i * 16, 480, CONFIRMED[i], 2, 16, 1, INK, "honesty-confirmed-" + i, true);
  }
}
function build(): void {
  fillRect(0, 0, W, H, PAPER);
  // Masthead
  fillRect(0, 0, W, 60, NAVY);
  drawTextCenter(512, 6, "MAKE.FUN • THE WORLD IN ONE IMAGE", 2, GOLD);
  drawTextCenter(512, 24, "THURSDAY 26 NOVEMBER 2026", 4, WHITE);
  fillRect(0, 60, W, 2, GOLD);
  // Map strip
  drawMapStrip();
  // Heroes
  const heroXs = [8, 348, 688];
  HEROES.forEach((h, i) => drawHero(h, heroXs[i], 112, 328, 264));
  // Mid section
  drawText(8, 384, "MORE OF THE DAY", 2, RED);
  fillRect(8, 402, 1008, 2, RED);
  MIDS.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    drawMid(m, heroXs[col], 408 + row * 100, 328, 96);
  });
  // Brief section
  drawText(8, 612, "AROUND THE WORLD • 32 MORE STORIES • 9 REGIONS", 2, RED);
  fillRect(8, 630, 1008, 2, RED);
  drawBriefs();
  // Honesty box + footer
  drawHonesty();
  fillRect(0, 974, W, 50, NAVY);
  drawTextCenter(512, 982, "SOURCES: REUTERS • BBC • AP • CNN • WSJ • FOX WEATHER • UEFA • NATURE • AFP • FIDE", 2, WHITE);
  drawTextCenter(512, 1000, "EVENTS FIRST REPORTED 26 NOV 2026 UNLESS DATED • DRAWN BY KAIKENAL93-ARCH", 2, GOLD);
}

function main(): void {
  build();
  const png = encodePng();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
  if (verifyPng(png)) console.log("PNG OK");
  else throw new Error("PNG self-check failed: CRC mismatch");
  console.log("TRUNCATIONS: " + warnings.length);
  for (const w of warnings) console.log("WARNING: " + w);
  console.log("WROTE " + outPath + " " + png.length + " bytes");
}
main();
