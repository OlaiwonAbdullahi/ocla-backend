const mongoose = require("mongoose");

const shippingZoneSchema = new mongoose.Schema(
  {
    location: { type: String, required: true, trim: true, unique: true },
    fee: { type: Number, required: true, min: 0 }, // in USD
  },
  { timestamps: true },
);

shippingZoneSchema.index({ location: "text" });

module.exports = mongoose.model("ShippingZone", shippingZoneSchema);
