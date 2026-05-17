const { getRates } = require("../utils/exchangeRates");

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
