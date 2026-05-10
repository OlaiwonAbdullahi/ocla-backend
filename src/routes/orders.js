const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrder,
  getOrderTracking,
  updateOrderStatus,
} = require('../controllers/orderController');
const { requireAdmin } = require('../middleware/auth');

router.post('/', createOrder);
router.get('/:orderNumber', getOrder);
router.get('/:id/tracking', getOrderTracking);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

module.exports = router;
