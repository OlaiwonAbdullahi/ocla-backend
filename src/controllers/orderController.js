const Order = require("../models/Order");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const ShippingZone = require("../models/ShippingZone");
const { getEstimatedDelivery } = require("../utils/delivery");
const { sendOrderConfirmation, sendNewOrderAdmin } = require("../utils/email");
const { createCheckoutSession } = require("../config/dodo");
const { convertUsd } = require("../utils/exchangeRates");

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function bad(res, message) {
  return res.status(400).json({ success: false, message });
}

// Lookup zone: city → state → country (most specific first)
async function resolveShippingZone({ city, state, country }) {
  const match = (loc) =>
    ShippingZone.findOne({ location: { $regex: new RegExp(`^${loc.trim()}$`, "i") } });

  return (await match(city)) || (await match(state)) || (await match(country)) || null;
}

async function createOrder(req, res, next) {
  try {
    const {
      contact,
      shippingAddress,
      paymentMethod,
      items,
      currency = "USD",
      language = "en",
    } = req.body;

    // ── Contact ───────────────────────────────────────────────────────────────
    if (!contact?.firstName || !contact?.lastName || !contact?.email || !contact?.phone) {
      return bad(res, "All contact fields (firstName, lastName, email, phone) are required");
    }
    if (!validEmail(contact.email)) {
      return bad(res, "Invalid email address");
    }

    // ── Address ───────────────────────────────────────────────────────────────
    const addr = shippingAddress;
    if (!addr?.address || !addr?.city || !addr?.state || !addr?.country) {
      return bad(res, "address, city, state, and country are required");
    }

    // ── Payment method ────────────────────────────────────────────────────────
    if (paymentMethod !== "dodo") {
      return bad(res, 'Invalid paymentMethod. Use "dodo"');
    }

    // ── Items ─────────────────────────────────────────────────────────────────
    if (!Array.isArray(items) || items.length === 0) {
      return bad(res, "items must be a non-empty array");
    }

    const orderItems = [];
    for (const item of items) {
      if (!item.productId || !item.unitLabel || !item.quantity) {
        return bad(res, "Each item requires productId, unitLabel, and quantity");
      }
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
        return bad(res, "Item quantity must be a positive integer");
      }

      const product = await Product.findById(item.productId);
      if (!product) return bad(res, `Product not found: ${item.productId}`);

      const unit = product.units.find((u) => u.label === item.unitLabel);
      if (!unit) {
        return bad(res, `Unit "${item.unitLabel}" not found for product ${item.productId}`);
      }

      const qty = Number(item.quantity);
      const lineTotal = parseFloat((unit.price * qty).toFixed(2));
      orderItems.push({
        productId: product._id,
        productName: product.name,
        unitLabel: unit.label,
        unitPrice: unit.price,
        quantity: qty,
        lineTotal,
        taxRate: product.tax || 0,
      });
    }

    // ── Shipping zone ─────────────────────────────────────────────────────────
    const zone = await resolveShippingZone({
      city: addr.city,
      state: addr.state,
      country: addr.country,
    });

    if (!zone) {
      return bad(
        res,
        `Delivery is not available to ${addr.city}, ${addr.country}. Please contact us for shipping options.`,
      );
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    const subtotal = parseFloat(orderItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
    const taxAmount = parseFloat(
      orderItems.reduce((s, i) => s + i.lineTotal * (i.taxRate / 100), 0).toFixed(2),
    );
    const deliveryPrice = zone.fee; // in USD
    const grandTotal = parseFloat((subtotal + taxAmount + deliveryPrice).toFixed(2));
    const estimatedDelivery = getEstimatedDelivery(zone.estimatedDays || 7);

    // ── Order number ──────────────────────────────────────────────────────────
    const seq = await Counter.nextSeq("orderNumber");
    const orderNumber = `OCL-${seq}`;

    // ── Persist ───────────────────────────────────────────────────────────────
    const order = await Order.create({
      orderNumber,
      contactFirstName: contact.firstName,
      contactLastName: contact.lastName,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      shippingAddress: {
        address: addr.address,
        address2: addr.address2 || undefined,
        city: addr.city,
        state: addr.state,
        postal: addr.postal || undefined,
        country: addr.country,
      },
      items: orderItems,
      deliveryZone: zone.location,
      deliveryPrice,
      estimatedDays: zone.estimatedDays || 7,
      subtotal,
      taxAmount,
      grandTotal,
      paymentMethod,
      estimatedDelivery,
      trackingEvents: [
        {
          status: "processing",
          label: "Order Placed",
          description: "Your order has been received and is being reviewed.",
          timestamp: new Date(),
        },
      ],
    });

    // ── Emails ────────────────────────────────────────────────────────────────
    sendOrderConfirmation(order).catch(console.error);
    sendNewOrderAdmin(order).catch(console.error);

    // ── Convert grand total to billing currency ───────────────────────────────
    const { amount: amountInCurrency } = await convertUsd(grandTotal, currency);

    // ── Dodo checkout session ─────────────────────────────────────────────────
    const dodo = await createCheckoutSession({
      orderNumber,
      amountInCurrency,
      currency,
      email: contact.email,
      name: `${contact.firstName} ${contact.lastName}`,
      country: addr.country,
      language,
    });

    await Order.findByIdAndUpdate(order._id, { paymentReference: dodo.sessionId });

    res.status(201).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        deliveryFee: order.deliveryPrice,
        grandTotal: order.grandTotal,
        grandTotalInCurrency: amountInCurrency,
        currency: currency.toUpperCase(),
        deliveryZone: zone.location,
        estimatedDelivery: estimatedDelivery.toISOString().split("T")[0],
        paymentMethod: order.paymentMethod,
        dodo: {
          checkoutUrl: dodo.checkoutUrl,
          sessionId: dodo.sessionId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) {
      const err = new Error("Order not found");
      err.status = 404;
      return next(err);
    }
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

async function getOrderTracking(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("Order not found");
      err.status = 404;
      return next(err);
    }
    res.json({ success: true, data: order.trackingEvents });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status, label, description, carrier } = req.body;

    const validStatuses = ["processing", "packed", "shipped", "out_for_delivery", "delivered"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("Order not found");
      err.status = 404;
      return next(err);
    }

    const defaults = {
      processing: { label: "Order Placed", description: "Your order has been received and is being reviewed." },
      packed: { label: "Order Packed", description: "Your order has been packed and is ready for dispatch." },
      shipped: { label: "Shipped", description: "Your order has been handed to the carrier." },
      out_for_delivery: { label: "Out for Delivery", description: "Your order is out for delivery." },
      delivered: { label: "Delivered", description: "Your order has been delivered." },
    };

    order.status = status;
    if (carrier) order.carrier = carrier;
    order.trackingEvents.push({
      status,
      label: label || defaults[status].label,
      description: description || defaults[status].description,
      timestamp: new Date(),
    });

    await order.save();

    if (status === "shipped") {
      const { sendShippedNotification } = require("../utils/email");
      sendShippedNotification(order).catch(console.error);
    }
    if (status === "delivered") {
      const { sendDeliveredNotification } = require("../utils/email");
      sendDeliveredNotification(order).catch(console.error);
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, getOrder, getOrderTracking, updateOrderStatus };
