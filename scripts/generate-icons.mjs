import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size) {
  const bg = [9, 9, 11];       // #09090b
  const blue = [59, 130, 246]; // #3b82f6
  const indigo = [99, 102, 241]; // #6366f1
  const violet = [139, 92, 246]; // #8b5cf6

  const pad = Math.round(size * 0.18);
  const gap = Math.round(size * 0.04);
  const cell = Math.round((size - pad * 2 - gap) / 2);
  const r = Math.round(size * 0.04);

  const pixels = [];
  for (let y = 0; y < size; y++) {
    pixels.push(0); // filter: None
    for (let x = 0; x < size; x++) {
      const col = getColor(x, y, size, pad, gap, cell, r, bg, blue, indigo, violet);
      pixels.push(col[0], col[1], col[2]);
    }
  }

  const raw = Buffer.from(pixels);
  const compressed = deflateSync(raw);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 2;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdrData),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function inRoundedRect(x, y, rx, ry, w, h, r) {
  if (x < rx || x >= rx + w || y < ry || y >= ry + h) return false;
  const corners = [[rx + r, ry + r], [rx + w - r, ry + r], [rx + r, ry + h - r], [rx + w - r, ry + h - r]];
  for (const [cx, cy] of corners) {
    if (x >= cx - r && x < cx + r && y >= cy - r && y < cy + r) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return false;
    }
  }
  return true;
}

function getColor(x, y, size, pad, gap, cell, r, bg, blue, indigo, violet) {
  const x1 = pad, x2 = pad + cell + gap;
  const y1 = pad, y2 = pad + cell + gap;
  if (inRoundedRect(x, y, x1, y1, cell, cell, r)) return blue;
  if (inRoundedRect(x, y, x2, y1, cell, cell, r)) return indigo;
  if (inRoundedRect(x, y, x1, y2, cell, cell, r)) return violet;
  if (inRoundedRect(x, y, x2, y2, cell, cell, r)) return [59, 130, 246].map(v => Math.round(v * 0.6));
  return bg;
}

const out = join(__dirname, "..", "public", "icons");

for (const size of [192, 512]) {
  const buf = makePNG(size);
  writeFileSync(join(out, `icon-${size}.png`), buf);
  console.log(`icon-${size}.png (${buf.length} bytes)`);
}

const apple = makePNG(180);
writeFileSync(join(out, "apple-touch-icon.png"), apple);
console.log(`apple-touch-icon.png (${apple.length} bytes)`);
