const express = require('express');
const router = express.Router();
const { convertFromUsd } = require('../controllers/currencyController');

// GET /api/currencies?to=GBP
// GET /api/currencies/GBP
router.get('/', convertFromUsd);
router.get('/:code', convertFromUsd);

module.exports = router;
