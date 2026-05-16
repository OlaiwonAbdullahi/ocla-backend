const crypto = require("crypto");
const Order = require("../models/Order");
const { verifyDodoPayment } = require("../config/dodo");

// POST /api/dodo/webhook  — called by Dodo only
async function webhook(req, res) {
  // Verify signature — Dodo sends HMAC-SHA256 of the raw body
  const signature =
    req.headers["x-dodo-signature"] || req.headers["webhook-signature"];
  const secret = process.env.DODO_WEBHOOK_SECRET;

  if (secret) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest("hex");

    if (signature !== expected) {
      return res.status(401).send("Invalid signature");
    }
  }

  // Acknowledge immediately
  res.sendStatus(200);

  const { event, data } = req.body;
  if (
    !["payment.success", "payment.completed", "charge.success"].includes(event)
  )
    return;

  try {
    const reference = data?.reference ?? data?.payment_id ?? data?.order_id;
    const orderNumber = data?.metadata?.orderNumber;
    if (!reference && !orderNumber) return;

    const query = [];
    if (reference) query.push({ orderNumber: reference }, { paymentReference: reference });
    if (orderNumber) query.push({ orderNumber });

    const order = await Order.findOne({ $or: query });
    if (!order || order.paymentStatus === "paid") return;

    // Double-verify before marking paid
    const payment = await verifyDodoPayment(reference);
    const success = ["success", "completed", "paid"].includes(
      payment.status?.toLowerCase(),
    );
    if (!success) return;

    // Verify amount matches
    if (Math.abs(payment.amount - order.grandTotal) > 0.05) {
      console.error(
        `Amount mismatch for order ${reference}: expected ${order.grandTotal}, got ${payment.amount}`,
      );
      return;
    }

    order.paymentStatus = "paid";
    await order.save();
  } catch (err) {
    console.error("Dodo webhook error:", err.message);
  }
}

// GET /api/dodo/verify/:reference  — frontend calls after redirect
async function verifyPayment(req, res, next) {
  try {
    const { reference } = req.params;

    const payment = await verifyDodoPayment(reference);
    const success = ["success", "completed", "paid"].includes(
      payment.status?.toLowerCase(),
    );

    if (!success) {
      return res.status(402).json({
        success: false,
        message: "Payment not completed",
        status: payment.status,
      });
    }

    const order = await Order.findOne({
      $or: [{ orderNumber: reference }, { paymentReference: reference }],
    });

    if (order) {
      // Verify amount matches
      if (Math.abs(payment.amount - order.grandTotal) > 0.05) {
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
        reference: payment.reference ?? reference,
        amountUsd: payment.amount,
        currency: payment.currency ?? "USD",
        status: payment.status,
        orderNumber: order?.orderNumber ?? reference,
        paidAt: payment.paid_at ?? payment.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { webhook, verifyPayment };
