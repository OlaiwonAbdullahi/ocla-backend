const Product = require('../models/Product');
const Review = require('../models/Review');

const SUPPORTED_COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa',
  'United Kingdom', 'United States', 'Canada', 'UAE', 'Saudi Arabia', 'Other',
];

async function listProducts(req, res, next) {
  try {
    const { category, search, badge } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (badge) filter.badge = badge;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

async function listCategories(req, res, next) {
  try {
    const categories = await Product.distinct('category');
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

async function getReviews(req, res, next) {
  try {
    const reviews = await Review.find({ productId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

async function createReview(req, res, next) {
  try {
    const { name, rating, body } = req.body;

    if (!name || !body) {
      const err = new Error('name and body are required');
      err.status = 400;
      return next(err);
    }
    if (!rating || !Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      const err = new Error('rating must be an integer between 1 and 5');
      err.status = 400;
      return next(err);
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      const err = new Error('Product not found');
      err.status = 404;
      return next(err);
    }

    const review = await Review.create({
      productId: req.params.id,
      name,
      rating: Number(rating),
      body,
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, getProduct, listCategories, getReviews, createReview };
