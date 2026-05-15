const axios = require("axios");

// Dodo Payments API — https://docs.dodopayments.com
const client = axios.create({
  baseURL: process.env.DODO_BASE_URL || "https://test.dodopayments.com",
  headers: {
    Authorization: `Bearer ${process.env.DODO_API_KEY}`,
    "Content-Type": "application/json",
  },
});

async function createDodoPayment({
  orderNumber,
  amountNaira,
  rateToNgn,
  email,
  name,
}) {
  const amountUsd = parseFloat((amountNaira / rateToNgn).toFixed(2));

  const { data } = await client.post("/payments", {
    amount: amountUsd,
    currency: "USD",
    reference: orderNumber,
    customer: { email, name },
    redirect_url: `${process.env.FRONTEND_URL}order/confirm?ref=${orderNumber}`,
    metadata: { orderNumber },
  });

  return {
    checkoutUrl: data.checkout_url ?? data.payment_link ?? data.url,
    reference: data.reference ?? data.payment_id ?? orderNumber,
    amountUsd,
  };
}

async function verifyDodoPayment(reference) {
  const { data } = await client.get(
    `/payments/${encodeURIComponent(reference)}`,
  );
  return data; // { status, reference, amount, currency, ... }
}

module.exports = { createDodoPayment, verifyDodoPayment };
