const express = require('express');
const router = express.Router();
const { listCouriers, calculateShipping } = require('../controllers/courierController');

router.get('/', listCouriers);
router.post('/calculate', calculateShipping);

module.exports = router;
