const Currency = require("../models/Currency");
const { getExchangeRate } = require("../config/korapay");

// ── Public ────────────────────────────────────────────────────────────────────

async function listCurrencies(req, res, next) {
  try {
    const currencies = await Currency.find({ isActive: true }).sort({
      code: 1,
    });
    res.json({ success: true, data: currencies });
  } catch (err) {
    next(err);
  }
}

async function getCurrency(req, res, next) {
  try {
    const currency = await Currency.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true,
    });
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency "${req.params.code}" not found`,
      });
    }
    res.json({ success: true, data: currency });
  } catch (err) {
    next(err);
  }
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

async function listAllCurrencies(req, res, next) {
  try {
    const currencies = await Currency.find().sort({ code: 1 });
    res.json({ success: true, data: currencies });
  } catch (err) {
    next(err);
  }
}

async function toggleCurrencyVisibility(req, res, next) {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "isActive (boolean) is required",
      });
    }

    const currency = await Currency.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      { $set: { isActive } },
      { new: true, runValidators: true },
    );

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: `Currency "${req.params.code.toUpperCase()}" not found`,
      });
    }

    res.json({ success: true, data: currency });
  } catch (err) {
    next(err);
  }
}

async function syncRates(req, res, next) {
  try {
    const currencies = await Currency.find({ isActive: true });
    const results = [];

    for (const currency of currencies) {
      if (currency.code === "USD") {
        // USD is base, rate to USD is 1. But we store rateToNgn.
        // So we need USD to NGN rate from Korapay.
        const rateToNgn = await getExchangeRate("USD", "NGN");
        currency.rateToNgn = rateToNgn;
        await currency.save();
        results.push({ code: "USD", rateToNgn });
        continue;
      }

      try {
        // For other currencies, we want their rate to NGN.
        // Since USD is base, we might want rate from USD to this currency?
        // User said: "rate converter is for checking the price in other currency other than USD which is the base currency"
        // This means if we have $100, we want to know how much it is in EUR.
        // So we need USD to EUR rate.
        const rateToUsd = await getExchangeRate("USD", currency.code);

        // However, the model stores `rateToNgn`.
        // If we want to maintain the current structure where everything is converted via NGN:
        // rateToNgn = (1 / rateToUsd) * (USD_to_NGN_rate) ?? No, that's confusing.

        // Let's reconsider. If USD is base, then `rateToNgn` in the model should probably be renamed to `rateToBase` (where base is USD).
        // But the user didn't ask to change the model schema.

        // If the model stays as `rateToNgn`, then:
        // 1 unit of currency = rateToNgn NGN.
        // 1 USD = rateToNgn_USD NGN.
        // So 1 USD = (rateToNgn_USD / rateToNgn_EUR) EUR? No.

        // Let's assume the user wants to keep `rateToNgn` but use Korapay to fetch it.
        const rateToNgn = await getExchangeRate(currency.code, "NGN");
        currency.rateToNgn = rateToNgn;
        await currency.save();
        results.push({ code: currency.code, rateToNgn });
      } catch (err) {
        console.error(`Failed to sync rate for ${currency.code}:`, err.message);
        results.push({ code: currency.code, error: err.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCurrencies,
  getCurrency,
  listAllCurrencies,
  toggleCurrencyVisibility,
  syncRates,
};
