// Tiny cross-browser settings helper. No webextension-polyfill dependency:
// Chrome 88+, Edge, and Firefox all return promises from `storage.local`
// when accessed via the `browser`/`chrome` namespace, so a one-line alias is
// enough.

const api = globalThis.browser ?? globalThis.chrome;

const DEFAULTS = {
  apiKey: "",
  baseUrl: "https://api.unirateapi.com",
  fromCurrency: "USD",
  toCurrency: "EUR",
};

/** Load all settings, merged over defaults. */
export async function loadSettings() {
  const stored = await api.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

/** Persist a partial settings patch. */
export async function saveSettings(patch) {
  await api.storage.local.set(patch);
}

export { DEFAULTS };
