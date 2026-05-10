const Product = require("../models/Product");
const { getTerminalRates } = require("../config/terminal");

// Default warehouse/pickup address
const WAREHOUSE_ADDRESS = {
  first_name: "OCLA",
  last_name: "Botanicals",
  email: "oclabotanical@gmail.com",
  phone: "+2347014311814",
  address: "Lekki Phase 1",
  city: "Ikeja",
  state: "Lagos",
  country: "NG",
  zip: "100001",
};

/**
 * Calculates total weight of items
 */
async function calculateTotalWeight(items) {
  let totalWeight = 0;
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    const unit = product.units.find((u) => u.label === item.unitLabel);
    if (!unit) continue;

    totalWeight += (unit.weight || 0) * (item.quantity || 1);
  }
  return totalWeight;
}

/**
 * Fetches dynamic shipping rates from Terminal Africa
 */
async function getDynamicShippingRates(totalWeight, deliveryAddress) {
  try {
    const deliveryPhone = deliveryAddress.phone || "+2348000000000";
    const formattedPhone =
      deliveryPhone.startsWith("0") && !deliveryPhone.startsWith("+")
        ? `+234${deliveryPhone.substring(1)}`
        : deliveryPhone;

    const quotes = await getTerminalRates({
      pickup_address: WAREHOUSE_ADDRESS,
      delivery_address: {
        first_name: deliveryAddress.firstName || "Customer",
        last_name: deliveryAddress.lastName || "User",
        email: deliveryAddress.email || "customer@example.com",
        phone: formattedPhone,
        address: deliveryAddress.address,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        country:
          deliveryAddress.country === "Nigeria"
            ? "NG"
            : deliveryAddress.country,
        zip: deliveryAddress.postal || "100001",
      },
      parcel: {
        items: [], // Optional: can list items here if needed for customs
        parcel_total_weight: totalWeight || 0.1, // Terminal requires min weight
      },
    });

    return quotes.map((quote) => ({
      _id: quote.rate_id, // Terminal's rate ID
      name: quote.carrier_name,
      description: quote.carrier_rate_description,
      price: Math.round(quote.amount), // Total price in NGN
      estimatedDays: Math.ceil(quote.delivery_eta / 1440), // Convert minutes to days
      estimatedLabel: quote.delivery_time,
      carrier_logo: quote.carrier_logo,
    }));
  } catch (err) {
    console.error("Terminal Africa Rate Error:", err.message);
    // Fallback or rethrow
    throw err;
  }
}

module.exports = { calculateTotalWeight, getDynamicShippingRates };
