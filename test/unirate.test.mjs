// Mock tests for the UniRate client core. Pure Node stdlib (node:test +
// node:assert), zero dependencies. The HTTP layer is injected, so these run
// fully offline.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  UniRateClient,
  UniRateError,
  buildUrl,
  errorForStatus,
  toNumber,
} from "../src/unirate.js";

/** Build a mock fetch that records the request and returns a canned response. */
function mockFetch({ status = 200, json, text }) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() {
        return json;
      },
      async text() {
        return text !== undefined ? text : JSON.stringify(json);
      },
    };
  };
  fn.calls = calls;
  return fn;
}

function client(fetchImpl) {
  return new UniRateClient({ apiKey: "test-key", fetchImpl });
}

// --- URL + helper units ---------------------------------------------------

test("buildUrl appends the api_key and params", () => {
  const url = buildUrl("https://api.unirateapi.com", "k", "/api/rates", {
    from: "USD",
    to: "EUR",
  });
  assert.ok(url.startsWith("https://api.unirateapi.com/api/rates?"));
  assert.match(url, /from=USD/);
  assert.match(url, /to=EUR/);
  assert.match(url, /api_key=k/);
});

test("buildUrl omits empty/null params and strips trailing slashes", () => {
  const url = buildUrl("https://api.unirateapi.com/", "k", "/api/rates", {
    from: "USD",
    to: "",
    amount: null,
  });
  assert.ok(!url.includes("to="));
  assert.ok(!url.includes("amount="));
  assert.ok(url.startsWith("https://api.unirateapi.com/api/rates?"));
});

test("toNumber parses string and passes through numbers", () => {
  assert.equal(toNumber("0.92"), 0.92);
  assert.equal(toNumber(1.5), 1.5);
});

// --- getRate --------------------------------------------------------------

test("getRate(from,to) returns a single number", async () => {
  const f = mockFetch({ json: { rate: "0.92" } });
  const rate = await client(f).getRate("USD", "EUR");
  assert.equal(rate, 0.92);
  assert.match(f.calls[0].url, /\/api\/rates\?/);
});

test("getRate(from) returns a map of all rates", async () => {
  const f = mockFetch({ json: { rates: { EUR: "0.92", GBP: "0.79" } } });
  const rates = await client(f).getRate("USD");
  assert.deepEqual(rates, { EUR: 0.92, GBP: 0.79 });
});

test("getRate uppercases currency codes", async () => {
  const f = mockFetch({ json: { rate: "0.92" } });
  await client(f).getRate("usd", "eur");
  assert.match(f.calls[0].url, /from=USD/);
  assert.match(f.calls[0].url, /to=EUR/);
});

// --- convert --------------------------------------------------------------

test("convert returns the result number", async () => {
  const f = mockFetch({ json: { result: "92.50" } });
  const out = await client(f).convert("EUR", 100, "USD");
  assert.equal(out, 92.5);
});

test("convert defaults amount=1 and from=USD", async () => {
  const f = mockFetch({ json: { result: "0.92" } });
  await client(f).convert("EUR");
  assert.match(f.calls[0].url, /amount=1/);
  assert.match(f.calls[0].url, /from=USD/);
});

// --- currencies -----------------------------------------------------------

test("getSupportedCurrencies returns the list", async () => {
  const f = mockFetch({ json: { currencies: ["USD", "EUR", "GBP"] } });
  const codes = await client(f).getSupportedCurrencies();
  assert.deepEqual(codes, ["USD", "EUR", "GBP"]);
});

test("every request sends Accept: application/json", async () => {
  const f = mockFetch({ json: { currencies: [] } });
  await client(f).getSupportedCurrencies();
  assert.equal(f.calls[0].options.headers.Accept, "application/json");
});

// --- VAT ------------------------------------------------------------------

test("getVATRates(country) returns vat_data", async () => {
  const f = mockFetch({
    json: { country: "DE", vat_data: { country_code: "DE", vat_rate: 19.0 } },
  });
  const data = await client(f).getVATRates("DE");
  assert.equal(data.vat_rate, 19.0);
});

test("getVATRates() returns the full vat_rates map", async () => {
  const f = mockFetch({ json: { vat_rates: { DE: { vat_rate: 19 } } } });
  const map = await client(f).getVATRates();
  assert.deepEqual(map, { DE: { vat_rate: 19 } });
});

// --- error mapping --------------------------------------------------------

test("401 maps to an authentication UniRateError", async () => {
  const f = mockFetch({ status: 401, text: "unauthorized" });
  await assert.rejects(client(f).getRate("USD", "EUR"), (err) => {
    assert.ok(err instanceof UniRateError);
    assert.equal(err.statusCode, 401);
    assert.match(err.message, /API key/);
    return true;
  });
});

test("403 maps to the Pro-subscription message", () => {
  const err = errorForStatus(403, "forbidden");
  assert.equal(err.statusCode, 403);
  assert.match(err.message, /Pro subscription/);
});

test("404 maps to a currency-not-found error", async () => {
  const f = mockFetch({ status: 404, text: "not found" });
  await assert.rejects(client(f).getRate("USD", "ZZZ"), (err) => {
    assert.equal(err.statusCode, 404);
    return true;
  });
});

test("429 and 503 map to rate-limit / unavailable", () => {
  assert.match(errorForStatus(429).message, /Rate limit/);
  assert.match(errorForStatus(503).message, /unavailable/);
});

test("a missing api key throws before any fetch", async () => {
  const c = new UniRateClient({ fetchImpl: mockFetch({ json: {} }) });
  await assert.rejects(c.getRate("USD", "EUR"), /API key is required/);
});

test("a transport failure is wrapped in UniRateError", async () => {
  const f = async () => {
    throw new Error("boom");
  };
  await assert.rejects(client(f).getRate("USD", "EUR"), (err) => {
    assert.ok(err instanceof UniRateError);
    assert.match(err.message, /boom/);
    return true;
  });
});
