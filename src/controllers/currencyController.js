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

// GET /api/currencies?to=NGN  OR  GET /api/currencies/NGN
// Returns: 1 USD expressed in the requested currency

async function convertFromUsd(req, res, next) {
  try {
    const code = (req.params.code || req.query.to || "").toUpperCase();
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Provide a currency code via /api/currencies/:code or ?to=CODE",
      });
    }

    const { rates, date } = await getRates();

    const rate = rates[code];
    if (rate === undefined) {
      return res.status(404).json({
        success: false,
        message: `Currency "${code}" is not supported.`,
      });
    }

    res.json({
      success: true,
      data: { base: "USD", target: code, rate, date },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { convertFromUsd };
