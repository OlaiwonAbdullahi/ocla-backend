const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: String, ref: 'Product', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

reviewSchema.post('save', async function () {
  const Product = mongoose.model('Product');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { productId: this.productId } },
    { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Product.findByIdAndUpdate(this.productId, {
      ratingAverage: Math.round(stats[0].avg * 10) / 10,
      ratingCount: stats[0].count,
    });
  }
});

module.exports = mongoose.model('Review', reviewSchema);
