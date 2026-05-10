const axios = require("axios");

const client = axios.create({
  baseURL: "https://api.korapay.com/merchant/api/v1",
  headers: {
    Authorization: `Bearer ${process.env.KORAPAY_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * Initialize a standard checkout transaction
 */
async function initializeTransaction({
  email,
  amount,
  reference,
  customerName,
}) {
  const { data } = await client.post("/checkout/standard", {
    amount,
    currency: "NGN",
    reference,
    customer: {
      email,
      name: customerName,
    },
    redirect_url: `${process.env.FRONTEND_URL}/order/confirm?ref=${reference}`,
    notification_url: `${process.env.BACKEND_URL}/api/korapay/webhook`,
    merchant_bears_cost: false,
  });

  if (!data.status) {
    throw new Error(data.message || "Failed to initialize Korapay transaction");
  }

  return data.data; // { checkout_url, reference }
}

/**
 * Verify a transaction using its reference
 */
async function verifyTransaction(reference) {
  const { data } = await client.get(
    `/charges/${encodeURIComponent(reference)}`,
  );

  if (!data.status) {
    throw new Error(data.message || "Failed to verify Korapay transaction");
  }

  return data.data; // full transaction object
}

/**
 * Get exchange rate from Korapay
 */
async function getExchangeRate(fromCurrency, toCurrency) {
  const { data } = await client.post("/conversions/rates", {
    from_currency: fromCurrency.toUpperCase(),
    to_currency: toCurrency.toUpperCase(),
    amount: 1,
  });

  if (!data.status) {
    throw new Error(data.message || "Failed to fetch exchange rate");
  }

  return data.data.amount; // The rate
}

module.exports = { initializeTransaction, verifyTransaction, getExchangeRate };
