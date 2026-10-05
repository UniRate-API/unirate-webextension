// Render store screenshots (1280x800) of the real popup + options pages.
//
// Pass 1: navigate directly to src/popup.html and src/options.html with
// chrome.storage + fetch stubbed via addInitScript (reliably applies to the
// main frame), drive the real UI, and capture it. Pass 2: embed those captures
// on a branded 1280x800 canvas (Chrome Web Store's required size; also fine
// for AMO). No markup duplication — the UI is the actual extension.
//
// Run inside the isolated Playwright container.

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outDir = join(here, "..", "screenshots");
mkdirSync(outDir, { recursive: true });

// Chromium blocks ES-module imports over file:// (opaque origin), so serve the
// repo over a throwaway loopback HTTP server. JS must carry a JS MIME type or
// module scripts won't execute.
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
};
const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = normalize(join(root, urlPath));
  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("not found"); return;
  }
  const ext = filePath.slice(filePath.lastIndexOf("."));
  res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
});
await new Promise((r) => server.listen(8099, "127.0.0.1", r));
const base = "http://127.0.0.1:8099";

const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "BRL",
  "MXN", "SGD", "HKD", "NZD", "SEK", "NOK", "ZAR", "KRW", "AED", "TRY",
];

function stub(data) {
  const store = {
    apiKey: "ur_live_demo_8f3c9a21b7",
    baseUrl: "https://api.unirateapi.com",
    fromCurrency: "USD",
    toCurrency: "EUR",
    currencyCache: data.currencies,
    currencyCacheAt: Date.now(),
  };
  globalThis.chrome = {
    storage: { local: {
      async get(keys) {
        if (Array.isArray(keys)) { const o = {}; for (const k of keys) if (k in store) o[k] = store[k]; return o; }
        if (typeof keys === "string") return (keys in store) ? { [keys]: store[keys] } : {};
        return { ...store };
      },
      async set(obj) { Object.assign(store, obj); },
    }},
    runtime: { openOptionsPage() {} },
  };
  globalThis.fetch = async (url) => {
    const u = String(url);
    let body = {};
    if (u.includes("/api/currencies")) body = { currencies: data.currencies };
    else if (u.includes("/api/convert")) body = { result: "91.84" };
    else if (u.includes("/api/rates")) body = { rate: "0.9184" };
    return { ok: true, status: 200, async json() { return body; }, async text() { return JSON.stringify(body); } };
  };
}

const browser = await chromium.launch();

// --- Pass 1: capture the real UI at 2x ---
const uiCtx = await browser.newContext({ deviceScaleFactor: 2 });
await uiCtx.addInitScript(stub, { currencies: CURRENCIES });

const pop = await uiCtx.newPage();
await pop.setViewportSize({ width: 300, height: 480 });
await pop.goto(base + "/src/popup.html");
await pop.waitForFunction(
  () => { const s = document.querySelector("#from"); return s && s.options && s.options.length > 0; },
  undefined,
  { timeout: 15000 },
);
await pop.fill("#amount", "100");
await pop.selectOption("#from", "USD");
await pop.selectOption("#to", "EUR");
await pop.click("#convert");
await pop.waitForFunction(
  () => { const r = document.querySelector("#result"); return r && r.textContent.trim().length > 0; },
  undefined,
  { timeout: 15000 },
);
await pop.waitForTimeout(200);
await pop.locator("body").screenshot({ path: join(outDir, "raw-popup.png") });
console.log("captured raw-popup.png");

const opt = await uiCtx.newPage();
await opt.setViewportSize({ width: 640, height: 680 });
await opt.goto(base + "/src/options.html");
await opt.waitForSelector("#apiKey");
await opt.waitForTimeout(150);
await opt.locator(".card").screenshot({ path: join(outDir, "raw-options.png") });
console.log("captured raw-options.png");

// --- Pass 2: frame each on a 1280x800 branded canvas at 1x ---
function promoHtml({ img, title, subtitle, gradient, imgWidth }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0}
  body{width:1280px;height:800px;display:flex;align-items:center;justify-content:center;gap:72px;
    background:${gradient};font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}
  .pitch{color:#fff;max-width:480px}
  .pitch h1{font-size:52px;line-height:1.1;margin:0 0 20px;font-weight:800;letter-spacing:-1px}
  .pitch p{font-size:22px;line-height:1.5;margin:0;opacity:.92}
  .device{background:#fff;border-radius:22px;padding:12px;box-shadow:0 32px 90px rgba(2,6,23,.4)}
  .device img{display:block;border-radius:12px;width:${imgWidth}px;height:auto}
  </style></head><body>
  <div class="pitch"><h1>${title}</h1><p>${subtitle}</p></div>
  <div class="device"><img src="../screenshots/${img}"></div>
  </body></html>`;
}

const promoCtx = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1280, height: 800 } });

const scenes = [
  {
    file: "_promo-popup.html",
    out: "01-popup.png",
    img: "raw-popup.png",
    imgWidth: 300,
    title: "Convert currencies from your toolbar",
    subtitle: "Live exchange rates &amp; VAT for 170+ currencies, powered by the free UniRate API.",
    gradient: "linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%)",
  },
  {
    file: "_promo-options.html",
    out: "02-options.png",
    img: "raw-options.png",
    imgWidth: 460,
    title: "Your key, your browser",
    subtitle: "Bring your own free UniRate API key. It is stored only in your browser and sent only to unirateapi.com.",
    gradient: "linear-gradient(135deg,#06b6d4 0%,#4f46e5 100%)",
  },
];

for (const s of scenes) {
  const htmlPath = join(here, s.file);
  writeFileSync(htmlPath, promoHtml(s));
  const page = await promoCtx.newPage();
  await page.goto(base + "/store/screenshot/" + s.file);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(outDir, s.out) });
  console.log("wrote screenshots/" + s.out);
  await page.close();
}

await browser.close();
server.close();
