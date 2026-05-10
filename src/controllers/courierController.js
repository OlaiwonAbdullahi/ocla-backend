const {
  calculateTotalWeight,
  getDynamicShippingRates,
} = require("../utils/shipping");
const { getCarriers } = require("../config/terminal");

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Lists all available carriers from Terminal Africa
 */
async function listCouriers(req, res, next) {
  try {
    const carriers = await getCarriers();
    res.json({ success: true, data: carriers });
  } catch (err) {
    next(err);
  }
}

/**
 * Calculates dynamic shipping rates based on weight and address via Terminal Africa
 */
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
    const rates = await getDynamicShippingRates(totalWeight, shippingAddress);

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
