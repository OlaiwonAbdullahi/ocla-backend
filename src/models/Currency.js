const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // e.g. USD
    name: { type: String, required: true },     // e.g. US Dollar
    symbol: { type: String, required: true },   // e.g. $
    rateToNgn: { type: Number, required: true }, // 1 unit of this currency = rateToNgn NGN
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Currency', currencySchema);
