# UniRate Currency Converter — browser extension

A tiny, **zero-dependency** browser extension that puts live currency
conversion in your toolbar. Convert any amount between 170+ currencies, look up
exchange rates, and check VAT rates — powered by the free
[UniRate API](https://unirateapi.com).

Works on **Firefox, Chrome, and Edge** (Manifest V3).

- 💱 Convert amounts between any supported currencies
- 📈 Live exchange rates from [unirateapi.com](https://unirateapi.com)
- 🧾 VAT-rate lookups
- 🌓 Light & dark mode, matches your system
- 🔒 Your API key never leaves your browser except to call `api.unirateapi.com`
- 📦 **No runtime dependencies** — vanilla HTML/CSS/JS, no build step, no bundler

## Install

Store listings (self-serve, free):

- **Firefox** — Add-ons (AMO)
- **Chrome** — Chrome Web Store
- **Edge** — Edge Add-ons

> Store links are added as each listing goes live.

### Manual / development install

The extension is plain static files — no build required.

- **Firefox:** `about:debugging` → *This Firefox* → *Load Temporary Add-on* →
  pick `manifest.json`.
- **Chrome / Edge:** `chrome://extensions` → enable *Developer mode* →
  *Load unpacked* → select this folder.

## Setup

1. Get a **free API key** at [unirateapi.com](https://unirateapi.com).
2. Open the extension's **Settings** (the ⚙ button in the popup, or the
   extension's options page) and paste your key.
3. Open the popup, pick your currencies, and convert.

Your key and preferences are stored with the browser's `storage.local` API —
local to your browser. The only network requests the extension makes are
`GET` calls to `https://api.unirateapi.com`.

## How it works

All API logic lives in [`src/unirate.js`](src/unirate.js) — a dependency-free
client with an **injectable `fetch`**, so it is unit-tested entirely offline
and shared between the popup and the Node tests/example. It implements the four
free-tier endpoints the UI needs:

| Method | Endpoint | Returns |
|---|---|---|
| `getRate(from, to?)` | `/api/rates` | one rate, or a map of all rates |
| `convert(to, amount?, from?)` | `/api/convert` | converted amount |
| `getSupportedCurrencies()` | `/api/currencies` | list of currency codes |
| `getVATRates(country?)` | `/api/vat/rates` | one country's VAT data, or all |

The Pro-gated historical/timeseries endpoints are intentionally **not**
included, so the extension can never surface a `403` to an end user.

```js
import { UniRateClient } from "./src/unirate.js";

const client = new UniRateClient({ apiKey: "your-key" });
const eur = await client.convert("EUR", 100, "USD"); // 100 USD → EUR
```

## Error handling

Every failure is a `UniRateError` carrying a `statusCode`: `401` (bad key),
`404` (unknown currency), `429` (rate limited), `503` (service unavailable),
and a wrapped transport error for network problems.

## Development

```bash
# Run the mock test suite (Node stdlib only, no install, fully offline)
node --test

# Run the live free-tier tests against the real API
UNIRATE_API_KEY=your-key node --test

# Try the client from Node
UNIRATE_API_KEY=your-key node examples/node-example.mjs

# Regenerate the PNG icons from pure math (zlib only)
node tools/make-icons.mjs

# Lint the extension with Mozilla's web-ext (dev-only tool, fetched on demand)
npx web-ext lint --source-dir .
```

> Per this project's container-isolation policy, run the `npx`/`node` commands
> inside the `dev node` sandbox rather than on the host.

## Related UniRate clients

Official UniRate clients exist for Python, Node, Go, Rust, Java, Ruby, PHP,
.NET, Swift, Elixir, Perl, R, and more — see
[github.com/UniRate-API](https://github.com/UniRate-API).

## License

MIT © 2026 Unirate Team. See [LICENSE](LICENSE).
