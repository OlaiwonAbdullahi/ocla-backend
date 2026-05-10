const express = require('express');
const router = express.Router();
const { trackOrder } = require('../controllers/trackingController');

router.get('/:orderNumber', trackOrder);

module.exports = router;
