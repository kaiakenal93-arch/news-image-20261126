// World in One Image v4 — news-image-20261126
// A single Node 22 (stdlib only) program that draws the 26 Nov 2026 world
// news front page as a 1024x1024 RGB PNG. Fully deterministic: no clock,
// no randomness, no network. Own 5x7 bitmap font, own PNG encoder.
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const img = new Uint8Array(W * H * 3);
type RGB = [number, number, number];

const PAPER: RGB = [248, 245, 236];
const INK: RGB = [17, 17, 17];
const NAVY: RGB = [20, 33, 61];
const NAVY2: RGB = [30, 58, 95];
const RED: RGB = [185, 28, 28];
const GOLD: RGB = [245, 197, 24];
const GREY: RGB = [107, 114, 128];
const LIGHT: RGB = [216, 210, 192];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [21, 101, 52];

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let j = y0; j < y1; j++) {
    let i = (j * W + x0) * 3;
    for (let k = x0; k < x1; k++, i += 3) {
      img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2];
    }
  }
}
function hline(x: number, y: number, w: number, c: RGB): void { rect(x, y, w, 1, c); }
function vline(x: number, y: number, h: number, c: RGB): void { rect(x, y, 1, h, c); }
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    rect(cx - dx, cy + dy, 2 * dx + 1, 1, c);
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges: [number, number, number, number][] = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    if (xs.length >= 2) {
      const a = Math.max(0, Math.floor(Math.min(...xs)));
      const b = Math.min(W - 1, Math.ceil(Math.max(...xs)));
      for (let x = a; x <= b; x++) px(x, y, c);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 bits; bit 4 is the leftmost column.
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14], "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31], "3": [31, 2, 4, 6, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2], "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [14, 16, 30, 17, 17, 17, 14], "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14], "9": [14, 17, 17, 15, 1, 1, 14],
  " ": [0, 0, 0, 0, 0, 0, 0], ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8], ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8], "-": [0, 0, 0, 31, 0, 0, 0],
  "/": [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2], ")": [8, 4, 2, 2, 2, 4, 8],
  "%": [25, 25, 2, 4, 8, 19, 19], "$": [4, 15, 20, 14, 5, 30, 4],
  "&": [12, 18, 20, 8, 21, 18, 13], "+": [0, 4, 4, 31, 4, 4, 0],
  "=": [0, 0, 31, 0, 31, 0, 0], "?": [14, 17, 1, 2, 4, 0, 4],
  "!": [4, 4, 4, 4, 4, 0, 4], '"': [10, 10, 0, 0, 0, 0, 0],
  "•": [0, 4, 14, 14, 14, 4, 0],
};
function glyphFor(ch: string): number[] {
  const up = ch.toUpperCase();
  if (up === "’" || up === "‘") return FONT["'"];
  if (up === "—" || up === "–") return FONT["-"];
  if (up === "·") return FONT["•"];
  if (up === "…") return FONT["."];
  return FONT[up] ?? FONT[" "];
}
let TRUNCATIONS = 0;
function textWidth(t: string, s: number): number {
  const n = [...t].length;
  return n === 0 ? 0 : n * 6 * s - s;
}
function drawText(x: number, y: number, t: string, s: number, c: RGB): void {
  let cx = x;
  for (const ch of t) {
    const g = glyphFor(ch);
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row & (16 >> col)) rect(cx + col * s, y + r * s, s, s, c);
      }
    }
    cx += 6 * s;
  }
}
function drawTextCentered(cx: number, y: number, t: string, s: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(t, s) / 2), y, t, s, c);
}
function wrap(t: string, maxW: number, s: number): string[] {
  const words = t.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? cur + " " + word : word;
    if (textWidth(test, s) <= maxW) { cur = test; continue; }
    if (cur) lines.push(cur);
    if (textWidth(word, s) > maxW) {
      let part = "";
      for (const ch of word) {
        if (textWidth(part + ch, s) <= maxW) part += ch;
        else { lines.push(part); part = ch; }
      }
      cur = part;
    } else cur = word;
  }
  if (cur) lines.push(cur);
  return lines;
}
// Draw a wrapped block; counts a truncation per line that does not fit.
function drawBlock(x: number, y: number, t: string, s: number, c: RGB, maxW: number, lineH: number, maxLines: number): number {
  const lines = wrap(t, maxW, s);
  const n = Math.min(lines.length, maxLines);
  for (let i = 0; i < n; i++) drawText(x, y + i * lineH, lines[i], s, c);
  if (lines.length > maxLines) TRUNCATIONS += lines.length - maxLines;
  return n;
}

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  out.set(u32be(data.length), 0);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  const crcIn = new Uint8Array(4 + data.length);
  crcIn.set(new TextEncoder().encode(type), 0);
  crcIn.set(data, 4);
  out.set(u32be(crc32(crcIn)), 8 + data.length);
  return out;
}
function encodePNG(): Uint8Array {
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(img.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const comp = deflateSync(raw, { level: 9 });
  const ihdr = new Uint8Array(13);
  ihdr.set(u32be(W), 0); ihdr.set(u32be(H), 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", comp), chunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  // Self-verify: the zlib stream must inflate back to exactly the raw bytes.
  const back = inflateSync(comp);
  if (back.length !== raw.length) throw new Error("PNG self-verify: inflate length mismatch");
  for (let i = 0; i < raw.length; i++) if (back[i] !== raw[i]) throw new Error("PNG self-verify: inflate byte mismatch");
  return out;
}

// ---------------------------------------------------------------- content
// World map dot grid: 12 rows x 64 cols. '#' = land. Columns map longitude
// -180..+180, rows map latitude ~+80..-20.
const MAP_ROWS: string[] = [
  ".....########.........#####.............#######################.",
  "..#####################........#################################",
  ".....#################........##################################",
  "........#############.........#################################.",
  "..........###########.........###############################...",
  "...........#######............###############################...",
  "............######...........#############..#########...........",
  "...............##########....############....########...........",
  "..................#######.....##########.........########.......",
  "..................#######......########.............#######.....",
  "...................######.......######..............########....",
  "...................#####.........####...............#######.....",
];
// Pin positions as [mapCol, mapRow] on the grid above.
const PINS: { name: string; col: number; row: number }[] = [
  { name: "NEW YORK", col: 19, row: 4 },
  { name: "ODESA", col: 37, row: 3 },
  { name: "CAIRO", col: 38, row: 5 },
  { name: "KUWAIT", col: 40, row: 5 },
  { name: "JAZAN", col: 40, row: 6 },
  { name: "BANGKOK", col: 50, row: 6 },
];

const HEROES: { kicker: string; head: string[]; sub: string; scene: (x: number, y: number) => void }[] = [
  { kicker: "MIDDLE EAST • GULF", head: ["3 DEAD AS", "GULF WAR WIDENS"], sub: "KUWAIT DRONES KILL 2 ITALIANS; HOUTHI HIT KILLS 1 AT JAZAN", scene: sceneGulf },
  { kicker: "WEATHER • USA", head: ["1 MILLION", "IN THE DARK"], sub: "NOR'EASTER CUTS POWER; PHILLY PARADE AXED", scene: sceneStorm },
  { kicker: "DISASTER • EGYPT", head: ["TANKER FIRE", "KILLS 31"], sub: "TANKER OVERTURNS; 21 HURT, CAUSE PROBED", scene: sceneCairo },
];

const BRIEFS_A: string[] = [
  "SUDAN: RSF DRONE KILLS 19 CIVILIANS",
  "BOGOR: 13 DEAD; RAIN HALTS RESCUE",
  "SHENZHOU-24: FIRST PAKISTANI IN ORBIT",
  "GAZA: STORM THREATENS 1.76M IN TENTS",
  "LIBYA: 2 NAVY OFFICERS KILLED BY DRONE",
  "BANGKOK: REFINERY BLAST HURTS 9, 3 CRITICAL",
  "POLAND WANTS NATO AIR SHIELD",
  "MURMANSK GOVERNOR HELD FOR GRAFT",
  "NATIONS URGE RUSSIA: STOP RIOT AGENTS",
  "UKRAINE: 88 OF 112 DRONES DOWNED",
  "EU PLANS $50BN TECH FUND",
  "EU SUMMIT: 45BN EURO UKRAINE LOAN",
  "BIRTHRIGHT ORDER BLOCKED BY 2ND JUDGE",
  "BOK RAISES RATE TO 3.25%",
  "US GDP REVISED UP TO 4.3%",
  "ECUADOR TALKS WITH US ON OPERATIONS",
];
const BRIEFS_B: string[] = [
  "UCL: PSG HELD, BAYERN BEATEN BY LILLE",
  "DOW CLOSES ABOVE 50,000 FIRST TIME",
  "ABREGO GARCIA ARRIVES IN SPAIN",
  "DEMOCRATS FLIP NORTH CAROLINA SENATE",
  "CALIFORNIA BRACES FOR KING TIDE FLOODS",
  "COLOMBIA: 30 HOSTAGES FREED",
  "SHANGHAI PARTY CHIEF PROBED FOR GRAFT",
  "N. KOREA EXPELS SWISS ENVOY",
  "CHINA STILL GETS NVIDIA AI CHIPS",
  "AUSTRALIA SIGNS PACT WITH SOLOMONS",
  "HANOI HOT POT BLAST KILLS 6",
  "GUKESH-SINDAROV: GAME 3 DRAWN, 1.5-1.5",
  "INDIA MARKS 18 YEARS SINCE 26/11",
  "NETANYAHU: JUDGES URGE DROPPING CASE",
  "KIM INSPECTS NUCLEAR WARHEADS",
  "DURAN DURAN'S ANDY TAYLOR DIES, 65",
];

// ---------------------------------------------------------------- hero scenes
// Each scene fills a 316x128 box at (x, y).
function sceneGulf(x: number, y: number): void {
  rect(x, y, 316, 128, [15, 27, 45]);
  const stars: [number, number][] = [[18, 10], [52, 28], [88, 8], [128, 24], [168, 12], [208, 30], [248, 10], [282, 26], [38, 46], [118, 50], [198, 48], [268, 46], [72, 58], [158, 56], [238, 60]];
  for (const [dx, dy] of stars) rect(x + dx, y + dy, 2, 2, WHITE);
  disc(x + 276, y + 20, 12, [245, 240, 220]);
  // Refinery towers with flames.
  rect(x + 28, y + 58, 26, 52, [26, 42, 68]);
  tri(x + 32, y + 58, x + 41, y + 42, x + 50, y + 58, [245, 158, 11]);
  tri(x + 36, y + 58, x + 41, y + 48, x + 46, y + 58, [253, 230, 138]);
  rect(x + 68, y + 40, 22, 70, [26, 42, 68]);
  tri(x + 71, y + 40, x + 79, y + 26, x + 87, y + 40, [245, 158, 11]);
  tri(x + 74, y + 40, x + 79, y + 32, x + 84, y + 40, [253, 230, 138]);
  rect(x + 104, y + 66, 30, 44, [26, 42, 68]);
  tri(x + 109, y + 66, x + 119, y + 52, x + 129, y + 66, [245, 158, 11]);
  rect(x + 34, y + 70, 2, 3, GOLD); rect(x + 34, y + 84, 2, 3, GOLD);
  rect(x + 74, y + 54, 2, 3, GOLD); rect(x + 74, y + 70, 2, 3, GOLD);
  rect(x + 112, y + 78, 2, 3, GOLD);
  rect(x + 28, y + 88, 106, 4, [40, 60, 90]);
  // Water and a tanker.
  rect(x, y + 110, 316, 18, [18, 58, 92]);
  rect(x + 180, y + 98, 110, 12, [11, 21, 38]);
  rect(x + 180, y + 94, 110, 4, [30, 50, 80]);
  rect(x + 268, y + 86, 16, 8, [220, 220, 220]);
  tri(x + 196, y + 94, x + 202, y + 84, x + 208, y + 94, [245, 158, 11]);
  // Drones in the night sky.
  for (const [dx, dy] of [[150, 30], [200, 18], [240, 38]] as [number, number][]) {
    tri(x + dx, y + dy - 3, x + dx + 3, y + dy, x + dx, y + dy + 3, [160, 160, 160]);
    tri(x + dx, y + dy - 3, x + dx - 3, y + dy, x + dx, y + dy + 3, [160, 160, 160]);
    rect(x + dx - 1, y + dy - 1, 2, 2, RED);
  }
}
function sceneStorm(x: number, y: number): void {
  rect(x, y, 316, 128, [107, 124, 140]);
  disc(x + 60, y + 26, 24, [75, 85, 99]);
  disc(x + 100, y + 18, 28, [75, 85, 99]);
  disc(x + 150, y + 28, 22, [75, 85, 99]);
  disc(x + 210, y + 20, 26, [75, 85, 99]);
  disc(x + 255, y + 30, 20, [75, 85, 99]);
  rect(x, y + 44, 316, 8, [55, 65, 81]);
  // Lightning.
  const bolt: [number, number][] = [[150, 52], [138, 74], [152, 74], [134, 102]];
  for (let i = 0; i < bolt.length - 1; i++) {
    line(x + bolt[i][0], y + bolt[i][1], x + bolt[i + 1][0], y + bolt[i + 1][1], [253, 224, 71]);
    line(x + bolt[i][0] + 1, y + bolt[i][1], x + bolt[i + 1][0] + 1, y + bolt[i + 1][1], [253, 224, 71]);
  }
  // Rain.
  for (let i = 0; i < 14; i++) {
    line(x + 16 + i * 22, y + 58, x + 10 + i * 22, y + 76, [147, 197, 253]);
    line(x + 16 + i * 22, y + 84, x + 10 + i * 22, y + 102, [147, 197, 253]);
  }
  // Ground, house, leaning power pole.
  rect(x, y + 100, 316, 28, [31, 41, 55]);
  disc(x + 170, y + 112, 16, [90, 130, 170]);
  rect(x + 36, y + 52, 66, 48, [31, 41, 55]);
  tri(x + 30, y + 52, x + 69, y + 30, x + 108, y + 52, [17, 24, 39]);
  rect(x + 46, y + 64, 12, 12, [20, 20, 20]);
  rect(x + 80, y + 64, 12, 12, [253, 224, 71]);
  rect(x + 64, y + 76, 12, 24, [17, 24, 39]);
  line(x + 238, y + 100, x + 224, y + 28, [60, 40, 20]);
  line(x + 214, y + 36, x + 236, y + 32, [60, 40, 20]);
  line(x + 224, y + 28, x + 200, y + 42, [40, 40, 40]);
  line(x + 200, y + 42, x + 108, y + 36, [40, 40, 40]);
}
function sceneCairo(x: number, y: number): void {
  rect(x, y, 316, 128, [232, 224, 200]);
  disc(x + 280, y + 22, 13, [245, 200, 100]);
  rect(x + 18, y + 48, 48, 80, [200, 190, 170]);
  rect(x + 232, y + 38, 58, 90, [210, 200, 180]);
  rect(x + 28, y + 58, 4, 5, [90, 80, 60]); rect(x + 44, y + 58, 4, 5, [90, 80, 60]);
  rect(x + 244, y + 50, 4, 5, [90, 80, 60]); rect(x + 262, y + 50, 4, 5, [90, 80, 60]);
  // Road with dashed centre line.
  rect(x, y + 94, 316, 34, [107, 114, 128]);
  for (let i = 0; i < 8; i++) rect(x + 10 + i * 40, y + 110, 20, 2, WHITE);
  // Overturned tanker: tank body, wheels up, crushed cab.
  rect(x + 40, y + 62, 170, 32, [156, 163, 175]);
  rect(x + 40, y + 74, 170, 6, RED);
  for (const wx of [60, 90, 180, 200]) {
    disc(x + wx, y + 58, 6, [17, 24, 39]);
    disc(x + wx, y + 58, 2, [120, 120, 120]);
  }
  rect(x + 210, y + 66, 26, 28, [140, 30, 30]);
  // Flames and smoke at the rupture.
  tri(x + 112, y + 62, x + 122, y + 38, x + 132, y + 62, [245, 158, 11]);
  tri(x + 118, y + 62, x + 122, y + 48, x + 126, y + 62, [253, 230, 138]);
  tri(x + 144, y + 62, x + 152, y + 44, x + 160, y + 62, [245, 158, 11]);
  disc(x + 122, y + 30, 10, [107, 114, 128]);
  disc(x + 140, y + 20, 12, [156, 163, 175]);
  disc(x + 160, y + 28, 9, [107, 114, 128]);
  // Hazard diamond.
  tri(x + 268, y + 34, x + 284, y + 50, x + 268, y + 66, [249, 115, 22]);
  tri(x + 268, y + 34, x + 252, y + 50, x + 268, y + 66, [249, 115, 22]);
  drawText(x + 266, y + 47, "!", 1, INK);
  // Debris on the road.
  rect(x + 250, y + 100, 8, 3, [60, 60, 60]);
  rect(x + 270, y + 106, 6, 3, [60, 60, 60]);
  rect(x + 30, y + 104, 10, 3, [60, 60, 60]);
}

// ---------------------------------------------------------------- mid icons
// Each icon draws inside a 40x40 box at (ix, iy).
function iconSatellite(ix: number, iy: number): void {
  rect(ix + 2, iy + 14, 12, 10, [30, 58, 138]);
  rect(ix + 26, iy + 14, 12, 10, [30, 58, 138]);
  rect(ix + 15, iy + 12, 10, 14, [17, 24, 39]);
  line(ix + 20, iy + 12, ix + 20, iy + 4, [17, 24, 39]);
  disc(ix + 20, iy + 3, 2, GOLD);
  tri(ix + 15, iy + 26, ix + 25, iy + 26, ix + 20, iy + 32, [107, 114, 128]);
}
function iconShip(ix: number, iy: number): void {
  rect(ix + 6, iy + 22, 28, 8, [17, 24, 39]);
  tri(ix + 34, iy + 22, ix + 34, iy + 30, ix + 39, iy + 26, [17, 24, 39]);
  rect(ix + 10, iy + 14, 8, 8, RED);
  rect(ix + 20, iy + 14, 8, 8, [30, 58, 138]);
  disc(ix + 30, iy + 8, 3, GREY);
  line(ix + 2, iy + 34, ix + 38, iy + 34, [30, 58, 138]);
  line(ix + 6, iy + 37, ix + 34, iy + 37, [30, 58, 138]);
}
function iconDocument(ix: number, iy: number): void {
  rect(ix + 8, iy + 4, 24, 32, WHITE);
  rect(ix + 8, iy + 4, 24, 1, INK); rect(ix + 8, iy + 35, 24, 1, INK);
  rect(ix + 8, iy + 4, 1, 32, INK); rect(ix + 31, iy + 4, 1, 32, INK);
  rect(ix + 12, iy + 10, 16, 2, INK);
  rect(ix + 12, iy + 16, 16, 2, INK);
  rect(ix + 12, iy + 22, 10, 2, INK);
  disc(ix + 28, iy + 30, 5, RED);
  disc(ix + 28, iy + 30, 2, WHITE);
}
function iconChart(ix: number, iy: number): void {
  rect(ix + 6, iy + 22, 7, 14, [17, 24, 39]);
  rect(ix + 16, iy + 16, 7, 20, [30, 58, 138]);
  rect(ix + 26, iy + 10, 7, 26, RED);
  line(ix + 6, iy + 8, ix + 34, iy + 30, RED);
  tri(ix + 34, iy + 30, ix + 28, iy + 28, ix + 32, iy + 24, RED);
  hline(ix + 4, iy + 36, 32, INK);
}
function iconPlane(ix: number, iy: number): void {
  rect(ix + 4, iy + 18, 32, 5, [17, 24, 39]);
  tri(ix + 36, iy + 18, ix + 36, iy + 23, ix + 40, iy + 20, [17, 24, 39]);
  tri(ix + 18, iy + 18, ix + 26, iy + 18, ix + 22, iy + 8, [17, 24, 39]);
  tri(ix + 8, iy + 18, ix + 14, iy + 18, ix + 11, iy + 10, [17, 24, 39]);
}
function iconTanker(ix: number, iy: number): void {
  rect(ix + 4, iy + 20, 30, 8, [17, 24, 39]);
  tri(ix + 34, iy + 20, ix + 34, iy + 28, ix + 38, iy + 24, [17, 24, 39]);
  rect(ix + 8, iy + 12, 8, 8, [220, 220, 220]);
  rect(ix + 28, iy + 14, 4, 6, RED);
  line(ix + 2, iy + 32, ix + 38, iy + 32, [30, 58, 138]);
  line(ix + 6, iy + 35, ix + 34, iy + 35, [30, 58, 138]);
}
const MIDS: { cat: string; head: string[]; sub: string; icon: (x: number, y: number) => void }[] = [
  { cat: "SPACE", head: ["FCC OKS 1M", "SATELLITES"], sub: "SPACEX STARMIND: ORBITAL DATA CENTRES", icon: iconSatellite },
  { cat: "BLACK SEA", head: ["RUSSIA HITS", "2 GRAIN SHIPS"], sub: "100,000 TONS; ZELENSKYY WARNS OF NEW STRIKE", icon: iconShip },
  { cat: "RUSSIA", head: ["DEAD: 490,334"], sub: "LEAKED FILES; TRUE TOLL MAY TOP 700,000", icon: iconDocument },
  { cat: "MARKETS", head: ["TRUMP TARIFFS", "HIT 14 NATIONS"], sub: "NASDAQ -0.62%, NVIDIA -3.91% AT CLOSE", icon: iconChart },
  { cat: "UKRAINE (CLAIM)", head: ["UKRAINE HITS", "5 WARPLANES"], sub: "3 MIG-31S, 2 SU-34S DAMAGED, KYIV CLAIMS", icon: iconPlane },
  { cat: "HORMUZ (CLAIM)", head: ["TANKER HIT", "IN HORMUZ"], sub: "UKMTO CONFIRMS STRIKE; IRAN MINE CLAIM UNVERIFIED", icon: iconTanker },
];

// ---------------------------------------------------------------- layout
const HX = [24, 354, 684];
const HW = 316;
const SUB: RGB = [55, 65, 81];

function drawMasthead(): void {
  rect(0, 0, W, 58, NAVY);
  drawTextCentered(512, 8, "MAKE.FUN • THE WORLD IN ONE IMAGE", 3, WHITE);
  drawTextCentered(512, 36, "THURSDAY 26 NOVEMBER 2026", 2, GOLD);
  rect(0, 58, W, 4, RED);
}
function drawMap(): void {
  drawText(24, 66, "THE WORLD — WHERE IT HAPPENED", 1, RED);
  const x0 = 30, y0 = 80, cw = 13, ch = 6;
  for (let r = 0; r < MAP_ROWS.length; r++) {
    for (let c = 0; c < 64; c++) {
      if (MAP_ROWS[r][c] === "#") {
        rect(x0 + c * cw + 4, y0 + r * ch + 1, 5, 4, NAVY2);
      } else {
        rect(x0 + c * cw + 6, y0 + r * ch + 2, 1, 1, LIGHT);
      }
    }
  }
  for (const p of PINS) {
    const px = x0 + p.col * cw + 6, py = y0 + p.row * ch + 3;
    disc(px, py, 4, RED);
    disc(px, py, 2, WHITE);
  }
  drawText(880, 82, "PINS", 1, RED);
  PINS.forEach((p, i) => {
    const ly = 96 + i * 10;
    disc(884, ly + 3, 3, RED);
    drawText(892, ly, p.name, 1, INK);
  });
}
function drawTimeline(): void {
  rect(24, 156, 976, 36, NAVY2);
  rect(24, 156, 64, 36, RED);
  drawTextCentered(56, 167, "UTC", 2, WHITE);
  const parts: [string, RGB][] = [
    ["01:00", GOLD], [" BOK 3.25% ", WHITE], ["• ", GOLD],
    ["07:45", GOLD], [" BANGKOK BLAST ", WHITE], ["• ", GOLD],
    ["14:00", GOLD], [" GUKESH GAME 3", WHITE],
  ];
  const total = parts.reduce((a, [t]) => a + textWidth(t, 2), 0);
  let tx = 100 + Math.floor((900 - total) / 2);
  for (const [t, c] of parts) {
    drawText(tx, 167, t, 2, c);
    tx += textWidth(t, 2);
  }
}
function drawHeroes(): void {
  HEROES.forEach((h, i) => {
    const x = HX[i];
    h.scene(x, 194);
    drawText(x, 328, h.kicker, 1, RED);
    h.head.forEach((ln, j) => drawText(x, 348 + j * 24, ln, 3, INK));
    drawBlock(x, 400, h.sub, 1, SUB, HW, 11, 2);
  });
  vline(348, 194, 230, LIGHT);
  vline(678, 194, 230, LIGHT);
  rect(24, 428, 952, 2, LIGHT);
}
function drawMids(): void {
  MIDS.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = HX[col], y = 430 + row * 68;
    rect(x, y + 8, 40, 40, [240, 236, 224]);
    rect(x, y + 8, 40, 1, LIGHT); rect(x, y + 47, 40, 1, LIGHT);
    rect(x, y + 8, 1, 40, LIGHT); rect(x + 39, y + 8, 1, 40, LIGHT);
    m.icon(x, y + 8);
    const tx = x + 50;
    drawText(tx, y + 2, m.cat, 1, RED);
    m.head.forEach((ln, j) => drawText(tx, y + 12 + j * 17, ln, 2, INK));
    drawBlock(tx, y + 46, m.sub, 1, SUB, 266, 10, 2);
  });
}
function drawBriefs(): void {
  drawText(24, 566, "MORE FROM AROUND THE WORLD", 2, RED);
  rect(24, 582, 952, 2, INK);
  for (let i = 0; i < 16; i++) {
    drawText(24, 586 + i * 20, "• " + BRIEFS_A[i], 1, INK);
    drawText(514, 586 + i * 20, "• " + BRIEFS_B[i], 1, INK);
  }
}
function drawHonesty(): void {
  rect(24, 910, 952, 78, [255, 252, 240]);
  rect(24, 910, 952, 2, INK); rect(24, 986, 952, 2, INK);
  rect(24, 910, 2, 78, INK); rect(974, 910, 2, 78, INK);
  drawText(36, 918, "DATE CHECK:", 2, RED);
  rect(168, 914, 186, 22, GOLD);
  drawText(172, 918, "THU 26 NOV 2026", 2, INK);
  drawText(358, 918, "— CLAIMED VS CONFIRMED", 2, INK);
  drawText(36, 942, "CLAIMED (NOT YET VERIFIED):", 1, RED);
  drawText(201, 942, "HOUTHI STRIKES; IRAN MINE CLAIMS; SAVASLEYKA; EXECUTIONS; KUWAIT BLAME", 1, INK);
  drawText(36, 958, "CONFIRMED (AS REPORTED):", 1, GREEN);
  drawText(189, 958, "CAIRO 31; SUDAN 19; JAZAN 1 DEAD / STORM: 1M DARK; BOGOR 13; BANGKOK 9", 1, INK);
}
function drawFooter(): void {
  drawTextCentered(512, 992, "SOURCES: REUTERS • AP • BBC • UKMTO • BANGCHAK • FXMACRODATA", 1, GREY);
  drawTextCentered(512, 1006, "EVENTS FIRST REPORTED 26 NOV 2026 UNLESS DATED • DRAWN BY KAIKENAL93-ARCH", 1, GREY);
}

// ---------------------------------------------------------------- main
function main(): void {
  rect(0, 0, W, H, PAPER);
  drawMasthead();
  drawMap();
  drawTimeline();
  drawHeroes();
  drawMids();
  drawBriefs();
  drawHonesty();
  drawFooter();
  const png = encodePNG();
  mkdirSync("/output", { recursive: true });
  writeFileSync("/output/entry.png", png);
  const sha = createHash("sha256").update(png).digest("hex");
  console.error(`entry.png ${png.length} bytes sha256=${sha}`);
  console.error(`TRUNCATIONS: ${TRUNCATIONS}`);
  console.error(`size: ${W}x${H} RGB`);
}
main();
