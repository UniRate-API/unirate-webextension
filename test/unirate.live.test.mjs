// Live free-tier tests against api.unirateapi.com. Skipped unless
// UNIRATE_API_KEY is set, so the default `npm test` stays offline.
// Only free-tier endpoints are exercised (rates / convert / currencies / VAT);
// Pro endpoints would 403 on the free tier.

import { test } from "node:test";
import assert from "node:assert/strict";

import { UniRateClient } from "../src/unirate.js";

const apiKey = process.env.UNIRATE_API_KEY;
const opts = { skip: apiKey ? false : "UNIRATE_API_KEY not set" };

function client() {
  return new UniRateClient({ apiKey });
}

test("live: getRate(USD, EUR) returns a positive number", opts, async () => {
  const rate = await client().getRate("USD", "EUR");
  assert.equal(typeof rate, "number");
  assert.ok(rate > 0);
});

test("live: getRate(USD) returns a map of rates", opts, async () => {
  const rates = await client().getRate("USD");
  assert.equal(typeof rates, "object");
  assert.ok(Object.keys(rates).length > 10);
});

test("live: convert 100 USD to EUR returns a positive number", opts, async () => {
  const result = await client().convert("EUR", 100, "USD");
  assert.equal(typeof result, "number");
  assert.ok(result > 0);
});

test("live: getSupportedCurrencies returns a large list incl. USD", opts, async () => {
  const codes = await client().getSupportedCurrencies();
  assert.ok(Array.isArray(codes));
  assert.ok(codes.length > 50);
  assert.ok(codes.includes("USD"));
});

test("live: getVATRates('DE') returns German VAT data", opts, async () => {
  const data = await client().getVATRates("DE");
  assert.equal(data.country_code, "DE");
  assert.ok(data.vat_rate > 0);
});

test("live: getVATRates() returns a map of countries", opts, async () => {
  const map = await client().getVATRates();
  assert.equal(typeof map, "object");
  assert.ok(Object.keys(map).length > 10);
});
