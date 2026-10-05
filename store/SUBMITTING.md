# Submitting to the stores — step by step

The extension is built, gated, and packaged. Your part is: create the dev
account, upload the zip, paste the copy from [`LISTING.md`](LISTING.md), attach
the screenshots in [`screenshots/`](screenshots/), submit.

**Upload package:** `dist/unirate-webextension-0.1.0.zip`
(also attached to the GitHub release `v0.1.0` if you prefer to download it:
<https://github.com/UniRate-API/unirate-webextension/releases/tag/v0.1.0>)

Targeting **Firefox AMO + Chrome Web Store**. Edge is skipped — Edge Add-ons
runs through Microsoft Partner Center, which needs a Microsoft account (the same
wall as VS Code Marketplace). If that ever changes, the same zip + copy works.

---

## 1. Firefox — addons.mozilla.org (free, fast)

1. Sign in / create a free Firefox account → <https://addons.mozilla.org/developers/>.
2. **Submit a New Add-on** → *On this site* (listed).
3. **Upload** `dist/unirate-webextension-0.1.0.zip`. The validator runs; it
   should pass (we ran `web-ext lint` clean). It's a Manifest V3 extension.
4. Choice of distribution: **On this site**.
5. Fill the listing from `LISTING.md`: name, summary, full description, category
   (**Other**), homepage, support URL, and the **source-code note** (link the
   GitHub repo — AMO reviewers like a source link even though our code isn't
   minified).
6. **Add-on icon:** `icons/icon-128.png`. **Screenshots:** upload
   `screenshots/01-popup.png` and `screenshots/02-options.png`.
7. **Privacy:** when asked "does your add-on collect data?", answer per the
   LISTING.md disclosure (no data to the author; key/prefs local; queries go to
   api.unirateapi.com). Privacy-policy URL = the `PRIVACY.md` link.
8. Submit for review. Firefox review is usually quick (often automated for
   simple MV3 extensions).

> Listing URL once live: `https://addons.mozilla.org/firefox/addon/...` →
> set it in the repo README's Install section + CLAUDE.md.

---

## 2. Chrome Web Store (one-time $5 developer fee)

1. Go to <https://chrome.google.com/webstore/devconsole/>, sign in with a Google
   account, and pay the **one-time $5** registration fee (required before your
   first publish).
2. **Add new item** → upload `dist/unirate-webextension-0.1.0.zip`.
3. **Store listing tab:** paste name, summary, full description, category
   (**Productivity**), language. Upload the icon (`icons/icon-128.png`) and the
   screenshots (`screenshots/01-popup.png`, `02-options.png` — Chrome wants
   1280×800 or 640×400; ours are 1280×800).
4. **Privacy tab:**
   - **Single purpose:** paste the single-purpose description from LISTING.md.
   - **Permission justifications:** paste the `storage` + host-permission
     justifications from LISTING.md. Remote code: **No**.
   - **Data usage:** certify you do **not** collect/sell user data for the
     developer (key + prefs are on-device; API calls are user-initiated).
   - **Privacy policy URL:** the `PRIVACY.md` link (required because the
     extension requests permissions).
5. **Distribution:** Public. Submit for review (Chrome review typically takes a
   few days).

> Listing URL once live: `https://chromewebstore.google.com/detail/...` →
> set it in the repo README + CLAUDE.md.

---

## After both are live
- Add the store badges/links to `README.md` (Install section) and the CLAUDE.md
  repo row.
- Set each listing's **website field → https://unirateapi.com** (backlink rule).
- The DR-96 (AMO) + DR-99 (Chrome) referring domains land once the listings are
  indexed.
