const axios = require("axios");

const frankfurter = axios.create({ baseURL: "https://api.frankfurter.app" });

// GET /api/currencies?to=GBP  OR  GET /api/currencies/GBP
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

    const { data } = await frankfurter.get("/latest", {
      params: { from: "USD", to: code },
    });

    const rate = data.rates[code];
    if (rate === undefined) {
      return res.status(404).json({
        success: false,
        message: `Currency "${code}" is not supported.`,
      });
    }

    res.json({
      success: true,
      data: {
        base: "USD",
        target: code,
        rate,
        date: data.date,
      },
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: `Currency "${(req.params.code || req.query.to || "").toUpperCase()}" is not supported.`,
      });
    }
    next(err);
  }
}

module.exports = { convertFromUsd };
