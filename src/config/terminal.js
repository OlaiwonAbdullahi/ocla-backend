const axios = require("axios");

const client = axios.create({
  baseURL: "https://api.terminal.africa/v1",
  headers: {
    Authorization: `Bearer ${process.env.TERMINAL_AFRICA_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * Get shipping quotes from Terminal Africa
 */
async function getTerminalRates({
  pickup_address,
  delivery_address,
  parcel,
  currency = "NGN",
}) {
  const { data } = await client.post("/rates/shipment/quotes", {
    pickup_address,
    delivery_address,
    parcel,
    currency,
  });

  if (!data.status) {
    throw new Error(
      data.message || "Failed to fetch rates from Terminal Africa",
    );
  }

  return data.data; // Array of quotes
}

/**
 * Get list of available carriers from Terminal Africa
 */
async function getCarriers() {
  try {
    const { data } = await client.get("/carriers");

    if (!data.status) {
      throw new Error(
        data.message || "Failed to fetch carriers from Terminal Africa",
      );
    }

    return data.data;
  } catch (err) {
    if (err.response) {
      throw new Error(
        err.response.data.message ||
          `Terminal Africa API error: ${err.response.status}`,
      );
    }
    throw err;
  }
}

/**
 * Track a shipment using shipment ID
 */
async function getShipmentTracking(shipmentId) {
  const { data } = await client.get(`/shipments/track/${shipmentId}`);

  if (!data.status) {
    throw new Error(
      data.message || "Failed to fetch tracking details from Terminal Africa",
    );
  }

  return data.data;
}

module.exports = { getTerminalRates, getCarriers, getShipmentTracking };
