// Runnable example exercising the client core outside the browser.
//
//     UNIRATE_API_KEY=your-key node examples/node-example.mjs
//
// Get a free key at https://unirateapi.com

import { UniRateClient } from "../src/unirate.js";

const apiKey = process.env.UNIRATE_API_KEY;
if (!apiKey) {
  console.error("Set UNIRATE_API_KEY first — get a free key at https://unirateapi.com");
  process.exit(1);
}

const client = new UniRateClient({ apiKey });

const rate = await client.getRate("USD", "EUR");
console.log(`1 USD = ${rate} EUR`);

const converted = await client.convert("JPY", 50, "USD");
console.log(`50 USD = ${converted} JPY`);

const currencies = await client.getSupportedCurrencies();
console.log(`${currencies.length} currencies supported (e.g. ${currencies.slice(0, 5).join(", ")}…)`);
