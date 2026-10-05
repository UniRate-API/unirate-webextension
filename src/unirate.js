// Zero-dependency UniRate API client used by the browser extension.
//
// Uses the global `fetch` (available in every browser's extension pages and in
// Node.js 18+), so this module ships with NO runtime dependencies. All
// request-building and response-parsing logic lives here as pure, testable
// functions; the HTTP layer is injectable so the test suite never touches the
// network.
//
// Only the four free-tier endpoints the extension actually uses are
// implemented (rates / convert / currencies / VAT). The Pro-gated historical
// and timeseries endpoints are intentionally omitted so the extension can
// never surface a 403 to an end user.

export const DEFAULT_BASE_URL = "https://api.unirateapi.com";
export const DEFAULT_TIMEOUT = 30000;
export const VERSION = "0.1.0";

/** Base error for every client failure (HTTP and transport). */
export class UniRateError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = "UniRateError";
    if (statusCode !== undefined) this.statusCode = statusCode;
    if (response !== undefined) this.response = response;
  }
}

/** Coerce a string/number rate value from the API into a Number. */
export function toNumber(value) {
  return typeof value === "number" ? value : parseFloat(String(value));
}

/**
 * Build the request URL for an endpoint. The API key is passed as a query
 * parameter (that is how UniRate authenticates).
 */
export function buildUrl(baseUrl, apiKey, endpoint, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  search.set("api_key", apiKey);
  const base = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return `${base}${endpoint}?${search.toString()}`;
}

/** Map an HTTP status to a descriptive UniRateError. */
export function errorForStatus(status, body) {
  switch (status) {
    case 400:
      return new UniRateError("Invalid request parameters", 400, body);
    case 401:
      return new UniRateError("Missing or invalid API key", 401, body);
    case 403:
      return new UniRateError("Endpoint requires a Pro subscription", 403, body);
    case 404:
      return new UniRateError("Currency not found or no data available", 404, body);
    case 429:
      return new UniRateError("Rate limit exceeded", 429, body);
    case 503:
      return new UniRateError("Service unavailable", 503, body);
    default:
      return new UniRateError(`API request failed with status ${status}`, status, body);
  }
}

/**
 * A thin, dependency-free UniRate API client.
 *
 * The transport is injectable (`fetchImpl`) so unit tests run offline and the
 * same class drives both the extension popup and the Node example/tests.
 */
export class UniRateClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT, fetchImpl } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this._fetch = fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : undefined);
  }

  async _request(endpoint, params) {
    if (!this.apiKey) throw new UniRateError("An API key is required");
    if (typeof this._fetch !== "function") {
      throw new UniRateError("No fetch implementation available");
    }

    const url = buildUrl(this.baseUrl, this.apiKey, endpoint, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response;
    try {
      response = await this._fetch(url, {
        method: "GET",
        // Accept header is REQUIRED — /api/currencies returns an HTML 404 without it.
        headers: {
          Accept: "application/json",
          "User-Agent": `unirate-webextension/${VERSION}`,
        },
        signal: controller.signal,
      });
    } catch (err) {
      const message = err && err.message ? err.message : "Unknown error";
      throw new UniRateError(`API request failed: ${message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let body;
      try {
        body = await response.text();
      } catch (_e) {
        body = undefined;
      }
      throw errorForStatus(response.status, body);
    }

    return response.json();
  }

  /** Get the exchange rate for a pair, or all rates for a base currency. */
  async getRate(from = "USD", to) {
    const params = { from: String(from).toUpperCase() };
    if (to) params.to = String(to).toUpperCase();
    const json = await this._request("/api/rates", params);
    if (to) return toNumber(json.rate);
    const rates = {};
    for (const [cur, rate] of Object.entries(json.rates || {})) {
      rates[cur] = toNumber(rate);
    }
    return rates;
  }

  /** Convert an amount from one currency to another using current rates. */
  async convert(to, amount = 1, from = "USD") {
    const params = {
      amount,
      from: String(from).toUpperCase(),
      to: String(to).toUpperCase(),
    };
    const json = await this._request("/api/convert", params);
    if (json && json.result !== undefined) return toNumber(json.result);
    const results = {};
    for (const [cur, result] of Object.entries((json && json.results) || {})) {
      results[cur] = toNumber(result);
    }
    return results;
  }

  /** List all supported currency codes. */
  async getSupportedCurrencies() {
    const json = await this._request("/api/currencies", {});
    return json.currencies;
  }

  /** Get VAT rates for all countries, or the VAT data for a single country. */
  async getVATRates(country) {
    const params = {};
    if (country) params.country = String(country).toUpperCase();
    const json = await this._request("/api/vat/rates", params);
    if (country) return json.vat_data;
    return json.vat_rates;
  }
}
