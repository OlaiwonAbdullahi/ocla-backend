const axios = require("axios");

const client = axios.create({
  baseURL: "https://api.shipbubble.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`,
    "Content-Type": "application/json",
  },
});

const CATEGORY_ID = 99652979;

async function validateAddress(addressData) {
  const { data } = await client.post("/shipping/address/validate", addressData);
  console.log("Shipbubble validateAddress response:", JSON.stringify(data, null, 2));
  if (data.status !== "success") {
    throw new Error(
      data.message || "Failed to validate address with Shipbubble",
    );
  }
  return data.data.address_code;
}

async function fetchShippingRates(payload) {
  const { data } = await client.post("/shipping/fetch_rates", payload);
  console.log("Shipbubble fetch_rates raw response:", JSON.stringify(data, null, 2));
  if (data.status !== "success") {
    throw new Error(
      data.message || "Failed to fetch shipping rates from Shipbubble",
    );
  }
  // Normalise: API may return an array directly, or nest it under a key
  const inner = data.data;
  if (Array.isArray(inner)) return inner;
  if (inner && Array.isArray(inner.rates)) return inner.rates;
  if (inner && Array.isArray(inner.couriers)) return inner.couriers;
  // Last resort: collect any array-valued property
  if (inner && typeof inner === "object") {
    const found = Object.values(inner).find(Array.isArray);
    if (found) return found;
  }
  throw new Error(`Unexpected Shipbubble fetch_rates response shape: ${JSON.stringify(inner)}`);
}

module.exports = { validateAddress, fetchShippingRates, CATEGORY_ID };
