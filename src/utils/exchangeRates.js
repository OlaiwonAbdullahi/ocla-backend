const axios = require("axios");

const erApi = axios.create({ baseURL: "https://open.er-api.com/v6" });

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache = { rates: null, date: null, fetchedAt: 0 };

async function getRates() {
  if (cache.rates && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }
  const { data } = await erApi.get("/latest/USD");
  if (data.result !== "success") throw new Error("Exchange rate service unavailable");
  cache = { rates: data.rates, date: data.time_last_update_utc, fetchedAt: Date.now() };
  return cache;
}

// Converts a USD amount to the target currency. Returns the converted amount and rate.
async function convertUsd(amountUsd, targetCurrency) {
  const code = targetCurrency.toUpperCase();
  if (code === "USD") return { amount: amountUsd, rate: 1 };
  const { rates } = await getRates();
  const rate = rates[code];
  if (!rate) throw new Error(`Unsupported currency: ${code}`);
  return { amount: parseFloat((amountUsd * rate).toFixed(2)), rate };
}

module.exports = { getRates, convertUsd };
