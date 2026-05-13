const Product = require("../models/Product");
const {
  validateAddress,
  fetchShippingRates,
  CATEGORY_ID,
} = require("../config/shipbubble");

const SENDER_ADDRESS = {
  name: "OCLA Botanical",
  email: "oclabotanical@gmail.com",
  phone: "07014311814",
  address: "15 Admiralty Way, Lekki Phase 1, Lagos,Nigeria",
};

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

function parseEtaDays(etaString) {
  if (!etaString) return 3;
  const lower = etaString.toLowerCase();
  if (lower.includes("same day")) return 1;
  const nums = lower.match(/\d+/g);
  if (nums && nums.length > 0) return Math.max(...nums.map(Number));
  return 3;
}

async function getDynamicShippingRates(
  totalWeight,
  deliveryAddress,
  items = [],
) {
  try {
    const phone = deliveryAddress.phone || "08000000000";
    const normalizedPhone = phone.startsWith("+234")
      ? `0${phone.slice(4)}`
      : phone;

    const senderAddressCode = await validateAddress(SENDER_ADDRESS);

    const receiverAddressCode = await validateAddress({
      name: `${deliveryAddress.firstName || "Customer"} ${deliveryAddress.lastName || ""}`.trim(),
      email: deliveryAddress.email || "customer@example.com",
      phone: normalizedPhone,
      address: [
        deliveryAddress.address,
        deliveryAddress.city,
        deliveryAddress.state,
        deliveryAddress.country,
      ]
        .filter(Boolean)
        .join(", "),
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDate = tomorrow.toISOString().split("T")[0];

    // Build package_items from real product data
    const packageItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      const unit = product.units.find((u) => u.label === item.unitLabel);
      if (!unit) continue;
      packageItems.push({
        name: product.name,
        description: unit.label,
        unit_weight: String(unit.weight || 0.5),
        unit_amount: String(unit.price || 0),
        quantity: String(item.quantity || 1),
      });
    }

    // Fallback if no valid items were resolved
    if (packageItems.length === 0) {
      packageItems.push({
        name: "Product",
        description: "Order item",
        unit_weight: String(totalWeight || 0.5),
        unit_amount: "0",
        quantity: "1",
      });
    }

    const rates = await fetchShippingRates({
      sender_address_code: senderAddressCode,
      reciever_address_code: receiverAddressCode,
      pickup_date: pickupDate,
      category_id: CATEGORY_ID,
      package_items: packageItems,
      service_type: "pickup",
      package_dimension: {
        length: 30,
        width: 20,
        height: 10,
      },
    });

    console.log("Shipbubble rates raw:", JSON.stringify(rates, null, 2));

    return rates.map((rate) => ({
      _id: String(rate.courier_id),
      name: rate.courier_name,
      description: rate.delivery_eta,
      price: Math.round(rate.total),
      estimatedDays: parseEtaDays(rate.delivery_eta),
      estimatedLabel: rate.delivery_eta,
      ...rate,
    }));
  } catch (err) {
    console.error("Shipbubble Rate Error:", err.message);
    throw err;
  }
}

module.exports = { calculateTotalWeight, getDynamicShippingRates };
