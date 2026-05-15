const Order = require("../models/Order");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const { getEstimatedDelivery } = require("../utils/delivery");
const {
  calculateTotalWeight,
  getDynamicShippingRates,
} = require("../utils/shipping");
const { sendOrderConfirmation, sendNewOrderAdmin } = require("../utils/email");
const { initializeTransaction } = require("../config/korapay");
const { createDodoPayment } = require("../config/dodo");
const Currency = require("../models/Currency");

const BANK_DETAILS = {
  bank: "Zenith Bank",
  accountName: "OCLA Botanical Ltd",
  accountNo: "1234567890",
};

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function bad(res, message) {
  return res.status(400).json({ success: false, message });
}

async function createOrder(req, res, next) {
  try {
    const { contact, shippingAddress, courierId, paymentMethod, items } =
      req.body;

    // ── Contact ───────────────────────────────────────────────────────────────
    if (
      !contact?.firstName ||
      !contact?.lastName ||
      !contact?.email ||
      !contact?.phone
    ) {
      return bad(
        res,
        "All contact fields (firstName, lastName, email, phone) are required",
      );
    }
    if (!validEmail(contact.email)) {
      return bad(res, "Invalid email address");
    }

    // ── Address ───────────────────────────────────────────────────────────────
    const addr = shippingAddress;
    if (!addr?.address || !addr?.city || !addr?.state || !addr?.country) {
      return bad(res, "address, city, state, and country are required");
    }

    // ── Courier ───────────────────────────────────────────────────────────────
    if (!courierId) return bad(res, "courierId is required");

    const totalWeight = await calculateTotalWeight(items);
    const availableRates = await getDynamicShippingRates(totalWeight, {
      ...shippingAddress,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
    }, items);
    const courier = availableRates.find((r) => r._id === courierId);

    if (!courier)
      return bad(
        res,
        "Selected courier rate has expired or is no longer available. Please recalculate shipping.",
      );

    // ── Payment method ────────────────────────────────────────────────────────
    if (!["bank", "korapay", "dodo"].includes(paymentMethod)) {
      return bad(
        res,
        'Invalid paymentMethod. Use "bank", "korapay", or "dodo"',
      );
    }

    // ── Items ─────────────────────────────────────────────────────────────────
    if (!Array.isArray(items) || items.length === 0) {
      return bad(res, "items must be a non-empty array");
    }

    const orderItems = [];
    for (const item of items) {
      if (
        !item.productId ||
        !item.unitLabel ||
        !item.quantity ||
        !item.name ||
        !item.description ||
        item.weight == null ||
        item.amount == null
      ) {
        return bad(
          res,
          "Each item needs productId, unitLabel, quantity, name, description, weight, and amount",
        );
      }
      if (
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1
      ) {
        return bad(res, "Item quantity must be a positive integer");
      }

      const product = await Product.findById(item.productId);
      if (!product) return bad(res, `Product not found: ${item.productId}`);

      const unit = product.units.find((u) => u.label === item.unitLabel);
      if (!unit) {
        return bad(
          res,
          `Unit "${item.unitLabel}" not found for product ${item.productId}`,
        );
      }

      const qty = Number(item.quantity);
      orderItems.push({
        productId: product._id,
        productName: product.name,
        unitLabel: unit.label,
        unitPrice: unit.price,
        quantity: qty,
        lineTotal: unit.price * qty,
      });
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    // NOTE: Products are priced in USD (Base Currency)
    // Courier price is in NGN, so we convert it to USD
    const subtotal = orderItems.reduce((s, i) => s + i.lineTotal, 0); // in USD

    const usdCurrency = await Currency.findOne({ code: "USD", isActive: true });
    if (!usdCurrency) {
      return res.status(400).json({
        success: false,
        message: "USD rate is not configured. Contact the store admin.",
      });
    }

    const deliveryPriceUsd = parseFloat(
      (courier.price / usdCurrency.rateToNgn).toFixed(2),
    );
    const grandTotal = subtotal + deliveryPriceUsd; // in USD
    const estimatedDelivery = getEstimatedDelivery(courier.estimatedDays);

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
      courierId: courier._id,
      courierName: courier.name,
      deliveryPrice: deliveryPriceUsd,
      estimatedDays: courier.estimatedDays,
      shipbubbleRequestToken: courier.request_token || null,
      shipbubbleServiceCode: courier.service_code || null,
      shipbubbleCourierId: courier.courier_id ? String(courier.courier_id) : null,

      subtotal,
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

    // ── Response ──────────────────────────────────────────────────────────────
    const response = {
      orderNumber: order.orderNumber,
      grandTotal: order.grandTotal,
      estimatedDelivery: estimatedDelivery.toISOString().split("T")[0],
      courier: { name: courier.name, estimatedLabel: courier.estimatedLabel },
      paymentMethod: order.paymentMethod,
    };

    if (paymentMethod === "bank") {
      response.bankDetails = BANK_DETAILS;
    }

    if (paymentMethod === "korapay") {
      // Convert USD grandTotal to NGN for Korapay
      const amountNaira = Math.round(grandTotal * usdCurrency.rateToNgn);

      const korapay = await initializeTransaction({
        email: contact.email,
        amount: amountNaira,
        reference: orderNumber,
        customerName: `${contact.firstName} ${contact.lastName}`,
      });
      response.korapay = {
        checkoutUrl: korapay.checkout_url,
        reference: korapay.reference,
      };
    }

    if (paymentMethod === "dodo") {
      const dodo = await createDodoPayment({
        orderNumber,
        amountNaira: grandTotal * usdCurrency.rateToNgn,
        rateToNgn: usdCurrency.rateToNgn,
        email: contact.email,
        name: `${contact.firstName} ${contact.lastName}`,
      });
      // Store the Dodo payment reference for webhook matching
      await Order.findByIdAndUpdate(order._id, {
        paymentReference: dodo.reference,
      });
      response.dodo = {
        checkoutUrl: dodo.checkoutUrl,
        reference: dodo.reference,
      };
    }

    res.status(201).json({ success: true, data: response });
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

    const validStatuses = [
      "processing",
      "packed",
      "shipped",
      "out_for_delivery",
      "delivered",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error("Order not found");
      err.status = 404;
      return next(err);
    }

    const defaults = {
      processing: {
        label: "Order Placed",
        description: "Your order has been received and is being reviewed.",
      },
      packed: {
        label: "Order Packed",
        description: "Your order has been packed and is ready for dispatch.",
      },
      shipped: {
        label: "Shipped",
        description: "Your order has been handed to the carrier.",
      },
      out_for_delivery: {
        label: "Out for Delivery",
        description: "Your order is out for delivery.",
      },
      delivered: {
        label: "Delivered",
        description: "Your order has been delivered.",
      },
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
