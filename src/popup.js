import { UniRateClient, UniRateError } from "./unirate.js";
import { loadSettings, saveSettings } from "./storage.js";

const api = globalThis.browser ?? globalThis.chrome;

// A short fallback list so the dropdowns are usable even if the currency
// endpoint is unreachable on first open. Replaced by the live list when
// available.
const FALLBACK_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY",
  "INR", "BRL", "MXN", "SGD", "HKD", "NZD", "SEK", "NOK",
];
const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

const $ = (id) => document.getElementById(id);

function openOptions() {
  if (api.runtime.openOptionsPage) api.runtime.openOptionsPage();
}

function setStatus(message, isError = false) {
  const el = $("status");
  el.textContent = message || "";
  el.classList.toggle("error", Boolean(isError));
}

function populateSelect(select, codes, selected) {
  select.textContent = "";
  for (const code of codes) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    if (code === selected) opt.selected = true;
    select.appendChild(opt);
  }
}

/** Resolve the currency list: fresh cache, else live fetch, else fallback. */
async function resolveCurrencies(client) {
  const { currencyCache, currencyCacheAt } = await api.storage.local.get([
    "currencyCache",
    "currencyCacheAt",
  ]);
  const fresh =
    Array.isArray(currencyCache) &&
    currencyCache.length > 0 &&
    typeof currencyCacheAt === "number" &&
    Date.now() - currencyCacheAt < CURRENCY_CACHE_TTL;
  if (fresh) return currencyCache;

  try {
    const codes = await client.getSupportedCurrencies();
    if (Array.isArray(codes) && codes.length > 0) {
      const sorted = [...codes].sort();
      await api.storage.local.set({
        currencyCache: sorted,
        currencyCacheAt: Date.now(),
      });
      return sorted;
    }
  } catch (_e) {
    // fall through to any stale cache / fallback
  }
  if (Array.isArray(currencyCache) && currencyCache.length > 0) return currencyCache;
  return FALLBACK_CURRENCIES;
}

async function main() {
  $("settings-btn").addEventListener("click", openOptions);
  $("setup-btn").addEventListener("click", openOptions);

  const settings = await loadSettings();

  if (!settings.apiKey) {
    $("setup").classList.remove("hidden");
    return;
  }

  const form = $("converter");
  form.classList.remove("hidden");

  const client = new UniRateClient({
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
  });

  setStatus("Loading currencies…");
  const codes = await resolveCurrencies(client);
  setStatus("");

  const fromSel = $("from");
  const toSel = $("to");
  populateSelect(fromSel, codes, settings.fromCurrency);
  populateSelect(toSel, codes, settings.toCurrency);

  $("swap").addEventListener("click", () => {
    const a = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = a;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = parseFloat($("amount").value);
    const from = fromSel.value;
    const to = toSel.value;

    if (!Number.isFinite(amount) || amount < 0) {
      setStatus("Enter a valid amount.", true);
      return;
    }

    const btn = $("convert");
    btn.disabled = true;
    setStatus("Converting…");
    $("result").textContent = "";

    try {
      const result = await client.convert(to, amount, from);
      const formatted = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 4,
      }).format(result);
      $("result").textContent = `${amount} ${from} = ${formatted} ${to}`;
      setStatus("");
      await saveSettings({ fromCurrency: from, toCurrency: to });
    } catch (err) {
      const message =
        err instanceof UniRateError ? err.message : "Something went wrong.";
      setStatus(message, true);
    } finally {
      btn.disabled = false;
    }
  });
}

main().catch((err) => setStatus(err.message || "Unexpected error.", true));
