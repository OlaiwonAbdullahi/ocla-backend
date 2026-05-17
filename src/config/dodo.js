const axios = require("axios");

// Dodo Payments API — https://docs.dodopayments.com
const client = axios.create({
  baseURL: process.env.DODO_BASE_URL || "https://test.dodopayments.com",
  headers: {
    Authorization: `Bearer ${process.env.DODO_API_KEY}`,
    "Content-Type": "application/json",
  },
});

const COUNTRY_CODES = {
  "nigeria": "NG", "united states": "US", "usa": "US",
  "united kingdom": "GB", "uk": "GB", "ghana": "GH", "kenya": "KE",
  "south africa": "ZA", "canada": "CA", "germany": "DE", "france": "FR",
  "india": "IN", "australia": "AU", "uae": "AE", "united arab emirates": "AE",
};

function toCountryCode(country = "") {
  if (!country) return "NG";
  if (country.length === 2) return country.toUpperCase();
  return COUNTRY_CODES[country.toLowerCase()] || "NG";
}

async function createCheckoutSession({
  orderNumber,
  amountInCurrency,  // grand total already converted to billing currency
  currency = "USD",
  email,
  name,
  country,
  language = "en",
}) {
  const amountCents = Math.round(amountInCurrency * 100);
  const billingCurrency = currency.toUpperCase();

  // Step 1: create a one-time product priced in the customer's billing currency
  const { data: product } = await client.post("/products", {
    name: `OCLA Order ${orderNumber}`,
    tax_category: "digital_products",
    price: {
      type: "one_time_price",
      price: amountCents,
      currency: billingCurrency,
      discount: 0,
      purchasing_power_parity: false,
    },
  });

  // Step 2: create checkout session
  const { data } = await client.post("/checkouts", {
    product_cart: [{ product_id: product.product_id, quantity: 1 }],
    customer: { email, name },
    billing_address: { country: toCountryCode(country) },
    billing_currency: billingCurrency,
    customization: { language },
    return_url: `${process.env.FRONTEND_URL}order/confirm?ref=${orderNumber}`,
    cancel_url: `${process.env.FRONTEND_URL}checkout?cancelled=true&ref=${orderNumber}`,
    metadata: { orderNumber },
  });

  return {
    checkoutUrl: data.checkout_url,
    sessionId: data.session_id,
  };
}

async function verifyDodoPayment(reference) {
  const { data } = await client.get(
    `/payments/${encodeURIComponent(reference)}`,
  );
  return data;
}

module.exports = { createCheckoutSession, verifyDodoPayment };
