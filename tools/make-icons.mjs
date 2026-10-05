// Generates the extension's PNG icons from pure math — no third-party image
// library, only Node's built-in `zlib`. Run inside the isolated dev container:
//
//     dev node node tools/make-icons.mjs
//
// Produces icons/icon-{48,96,128}.png. Committed output is reproducible from
// this script, so the icons carry zero supply-chain surface.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "icons");
const SS = 4; // supersampling factor for smooth edges

// --- CRC32 (PNG chunk checksums) -----------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- drawing helpers ------------------------------------------------------
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Draw at SS× resolution then box-downsample for anti-aliasing.
function render(size) {
  const N = size * SS;
  const buf = Buffer.alloc(N * N * 4); // hi-res RGBA

  const radius = N * 0.22; // rounded-rect corner radius
  const topColor = [79, 70, 229]; // indigo
  const botColor = [6, 182, 212]; // cyan

  const coins = [
    { cx: N * 0.40, cy: N * 0.60, r: N * 0.26, base: [251, 191, 36], ring: [217, 119, 6] },
    { cx: N * 0.63, cy: N * 0.42, r: N * 0.26, base: [252, 211, 77], ring: [202, 138, 4] },
  ];

  const insideRoundedRect = (x, y) => {
    const dx = Math.max(radius - x, x - (N - radius), 0);
    const dy = Math.max(radius - y, y - (N - radius), 0);
    return dx * dx + dy * dy <= radius * radius;
  };

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      if (!insideRoundedRect(x + 0.5, y + 0.5)) {
        buf[i + 3] = 0; // transparent outside the badge
        continue;
      }
      // gradient background
      let [r, g, b] = mix(topColor, botColor, y / N);

      // coins (drawn in order so the second overlaps the first)
      for (const coin of coins) {
        const d = Math.hypot(x + 0.5 - coin.cx, y + 0.5 - coin.cy);
        if (d <= coin.r) {
          if (d > coin.r * 0.74 && d <= coin.r * 0.82) {
            [r, g, b] = coin.ring; // inner ring detail
          } else {
            [r, g, b] = coin.base;
          }
        }
      }

      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = 255;
    }
  }

  // box-downsample SS×SS → 1
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, bl = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const si = ((y * SS + sy) * N + (x * SS + sx)) * 4;
          const alpha = buf[si + 3];
          r += buf[si] * alpha;
          g += buf[si + 1] * alpha;
          bl += buf[si + 2] * alpha;
          a += alpha;
        }
      }
      const oi = (y * size + x) * 4;
      if (a === 0) {
        out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0;
      } else {
        out[oi] = Math.round(r / a);
        out[oi + 1] = Math.round(g / a);
        out[oi + 2] = Math.round(bl / a);
        out[oi + 3] = Math.round(a / (SS * SS));
      }
    }
  }
  return encodePng(size, size, out);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [48, 96, 128]) {
  const png = render(size);
  writeFileSync(join(OUT_DIR, `icon-${size}.png`), png);
  console.log(`wrote icons/icon-${size}.png (${png.length} bytes)`);
}
