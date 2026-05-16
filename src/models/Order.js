const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, ref: "Product", required: true },
    productName: { type: String, required: true },
    unitLabel: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
  },
  { _id: false },
);

const trackingEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
      ],
      required: true,
    },
    label: { type: String, required: true },
    description: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    address2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postal: String,
    country: { type: String, required: true, default: "Nigeria" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Contact snapshot
    contactFirstName: { type: String, required: true },
    contactLastName: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },

    shippingAddress: { type: shippingAddressSchema, required: true },

    items: { type: [orderItemSchema], required: true },

    status: {
      type: String,
      enum: [
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
      ],
      default: "processing",
    },

    // Shipping zone snapshot at order time
    deliveryZone: { type: String },
    deliveryPrice: { type: Number, required: true },
    estimatedDays: { type: Number },

    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: ["dodo"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    // Stored for Dodo webhook matching (USD payments use a separate gateway ref)
    paymentReference: { type: String },

    // Shipbubble references (populated at order creation from rate data)
    shipbubbleRequestToken: { type: String },
    shipbubbleServiceCode: { type: String },
    shipbubbleCourierId: { type: String },
    // Populated after admin starts shipment
    shipbubbleOrderId: { type: String },
    trackingUrl: { type: String },

    estimatedDelivery: { type: Date, required: true },
    carrier: String,

    trackingEvents: { type: [trackingEventSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
