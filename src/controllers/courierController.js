const {
  calculateTotalWeight,
  getDynamicShippingRates,
} = require("../utils/shipping");

// ── Public ────────────────────────────────────────────────────────────────────

async function listCouriers(req, res) {
  res.json({ success: true, data: [] });
}

async function calculateShipping(req, res, next) {
  try {
    const { items, shippingAddress } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "items must be a non-empty array" });
    }
    if (
      !shippingAddress?.address ||
      !shippingAddress?.city ||
      !shippingAddress?.state
    ) {
      return res.status(400).json({
        success: false,
        message: "shippingAddress with address, city, and state is required",
      });
    }

    const totalWeight = await calculateTotalWeight(items);
    const rates = await getDynamicShippingRates(totalWeight, shippingAddress, items);

    res.json({
      success: true,
      data: {
        totalWeight,
        rates,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCouriers, calculateShipping };
