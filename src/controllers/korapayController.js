const crypto = require("crypto");
const Order = require("../models/Order");
const { verifyTransaction } = require("../config/korapay");

// POST /api/korapay/webhook (called by Korapay)
async function webhook(req, res) {
  // Verify signature
  const signature = req.headers["x-korapay-signature"];
  if (!signature) {
    return res.status(401).send("Missing signature");
  }

  const hash = crypto
    .createHmac("sha256", process.env.KORAPAY_SECRET_KEY)
    .update(req.rawBody || JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature) {
    return res.status(401).send("Invalid signature");
  }

  const { event, data } = req.body;

  // Acknowledge receipt
  res.sendStatus(200);

  // We only care about successful charges
  if (event !== "charge.success") return;

  try {
    const reference = data.reference;
    const order = await Order.findOne({ orderNumber: reference });
    if (!order) return;

    // Double-check with Korapay
    const transaction = await verifyTransaction(reference);
    if (transaction.status !== "success") return;

    // Verify amount matches (within a small margin for rounding)
    const Currency = require("../models/Currency");
    const usd = await Currency.findOne({ code: "USD" });
    const expectedNaira = Math.round(order.grandTotal * (usd?.rateToNgn || 0));

    // Allow for small rounding difference (e.g., 1 Naira)
    if (Math.abs(transaction.amount - expectedNaira) > 5) {
      console.error(
        `Amount mismatch for order ${reference}: expected ${expectedNaira}, got ${transaction.amount}`,
      );
      return;
    }

    if (order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      await order.save();
    }
  } catch (err) {
    console.error("Korapay webhook error:", err.message);
  }
}

// GET /api/korapay/verify/:reference (frontend polls/redirects here)
async function verifyPayment(req, res, next) {
  try {
    const { reference } = req.params;
    const transaction = await verifyTransaction(reference);

    if (transaction.status !== "success") {
      return res.status(402).json({
        success: false,
        message: "Payment not completed",
        status: transaction.status,
      });
    }

    const order = await Order.findOne({ orderNumber: reference });
    if (order) {
      // Verify amount matches
      const Currency = require("../models/Currency");
      const usd = await Currency.findOne({ code: "USD" });
      const expectedNaira = Math.round(
        order.grandTotal * (usd?.rateToNgn || 0),
      );

      if (Math.abs(transaction.amount - expectedNaira) > 5) {
        return res
          .status(400)
          .json({ success: false, message: "Amount mismatch" });
      }

      if (order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        await order.save();
      }
    }

    res.json({
      success: true,
      data: {
        reference: transaction.reference,
        amount: transaction.amount,
        status: transaction.status,
        orderNumber: reference,
        paidAt: transaction.paid_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { webhook, verifyPayment };
