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

async function createDodoPayment({
  orderNumber,
  amountNaira,
  rateToNgn,
  email,
  name,
  country,
}) {
  const amountUsd = parseFloat((amountNaira / rateToNgn).toFixed(2));
  const amountCents = Math.round(amountUsd * 100);

  // Step 1: create a one-time product for this order's exact amount
  const { data: product } = await client.post("/products", {
    name: `OCLA Order ${orderNumber}`,
    tax_category: "digital_products",
    price: {
      type: "one_time_price",
      price: amountCents,
      currency: "USD",
      discount: 0,
      purchasing_power_parity: false,
    },
  });

  // Step 2: create the payment using that product
  const { data } = await client.post("/payments", {
    product_cart: [{ product_id: product.product_id, quantity: 1 }],
    customer: { email, name },
    billing: { country: toCountryCode(country) },
    return_url: `${process.env.FRONTEND_URL}order/confirm?ref=${orderNumber}`,
    payment_link: true,
    metadata: { orderNumber },
  });

  return {
    checkoutUrl: data.payment_link,
    reference: data.payment_id,
    amountUsd,
  };
}

async function verifyDodoPayment(reference) {
  const { data } = await client.get(
    `/payments/${encodeURIComponent(reference)}`,
  );
  return data;
}

module.exports = { createDodoPayment, verifyDodoPayment };
