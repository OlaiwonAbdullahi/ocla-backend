const express = require('express');
const router = express.Router();
const {
  listProducts,
  getProduct,
  listCategories,
  getReviews,
  createReview,
} = require('../controllers/productController');

router.get('/', listProducts);
router.get('/categories', listCategories);
router.get('/:id', getProduct);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', createReview);

module.exports = router;
