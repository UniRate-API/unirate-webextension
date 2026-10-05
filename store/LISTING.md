# Store listing copy — paste-ready

Everything below is ready to paste into the Firefox AMO and Chrome Web Store
dashboards. One field per block.

---

## Name
```
UniRate Currency Converter
```

## Summary / short description (≤132 chars — Chrome "summary", AMO summary)
```
Convert currencies and check live exchange & VAT rates from your toolbar, using the free UniRate API.
```

## Category
- **Chrome Web Store:** Productivity
- **Firefox AMO:** Other  (secondary: Shopping)

## Full description
```
UniRate Currency Converter puts fast, live currency conversion one click away in your toolbar.

• Convert any amount between 170+ currencies
• Live exchange rates from the UniRate API
• VAT-rate lookups
• Light & dark mode — matches your system
• Remembers your last-used currencies
• No ads, no tracking, no analytics

How it works:
The extension uses the free UniRate API (https://unirateapi.com). Create a free API key, paste it into the extension's Settings once, and you're ready to convert. Your key is stored only in your browser and is sent only to api.unirateapi.com — never to the author or any third party.

Privacy & security:
This extension ships as static files with no bundled dependencies and loads no remote code. It reads no browsing history or page content. It only talks to api.unirateapi.com to fetch the rates you ask for.

Open source:
Source code: https://github.com/UniRate-API/unirate-webextension
```

## Single-purpose description (Chrome requires this)
```
This extension has a single purpose: converting currency amounts and displaying exchange and VAT rates from the UniRate API in a toolbar popup.
```

## Permission justifications (Chrome asks per-permission; AMO shows these too)

**`storage`**
```
Used to save the user's UniRate API key and their last-used currency preferences locally in the browser. No data is transmitted anywhere by this permission.
```

**Host permission — `https://api.unirateapi.com/*`**
```
The extension fetches exchange rates, the currency list, and VAT rates directly from the UniRate API at api.unirateapi.com. This is the only host the extension contacts.
```

**Remote code:** No. The extension executes only the JavaScript bundled in the package; it loads no remote scripts.

## Data collection disclosure
- Chrome "Data usage": tick **nothing** sold/transferred; the extension does not collect user data for the developer. (The API key + preferences stay on-device; API requests go to UniRate at the user's instruction.)
- AMO "Does your add-on collect data?": No data is transmitted to the add-on's author. User-entered API key/preferences stay in local browser storage; currency queries go to api.unirateapi.com.

## URLs
- **Homepage / website:** `https://unirateapi.com`
- **Support site:** `https://github.com/UniRate-API/unirate-webextension/issues`
- **Privacy policy:** `https://github.com/UniRate-API/unirate-webextension/blob/main/PRIVACY.md`
- **Source code (AMO requires for review of minified/none):** `https://github.com/UniRate-API/unirate-webextension`

## Search keywords / tags
```
currency converter, exchange rates, forex, currency, VAT, money, UniRate
```

## Screenshots (in ./screenshots/)
- `01-popup.png` — 1280×800 — the toolbar popup converting 100 USD → EUR
- `02-options.png` — 1280×800 — the settings page (bring-your-own key)
- `raw-popup.png` / `raw-options.png` — the plain UI crops, if a store wants smaller/un-framed shots

## Icon
`icons/icon-128.png` (128×128) is the store icon.
