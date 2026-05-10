const mongoose = require('mongoose');

const productUnitSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true },
    weight: { type: Number, required: true, default: 0 }, // in kg
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    _id: { type: String }, // e.g. "fp1", "co2"
    name: { type: String, required: true },
    category: { type: String, required: true },
    units: { type: [productUnitSchema], required: true },
    image: { type: String, required: true },
    images: [String],
    video: String,
    badge: {
      type: String,
      enum: ['Best Seller', 'New', 'Popular'],
    },
    description: { type: String, required: true },
    inci: { type: String, required: true },
    grade: { type: String, required: true },
    shelfLife: { type: String, required: true },
    storage: { type: String, required: true },
    safety: { type: String, required: true },
    usageInstructions: { type: String, required: true },
    features: [String],
    // Computed average rating (updated on each review save)
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
