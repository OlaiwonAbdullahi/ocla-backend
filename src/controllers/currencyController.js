const { getExchangeRate } = require("../config/korapay");

// GET /api/currencies?to=GBP  OR  GET /api/currencies/GBP
// Returns: 1 USD expressed in the requested currency

async function convertFromUsd(req, res, next) {
  try {
    const code = (req.params.code || req.query.to || "").toUpperCase();
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Provide a currency code via /api/currencies/:code or ?to=CODE',
      });
    }

    const rate = await getExchangeRate("USD", code);

    res.json({
      success: true,
      data: {
        base: "USD",
        target: code,
        rate,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { convertFromUsd };
