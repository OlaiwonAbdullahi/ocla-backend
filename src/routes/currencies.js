const express = require('express');
const router = express.Router();
const { listCurrencies, getCurrency } = require('../controllers/currencyController');

router.get('/', listCurrencies);
router.get('/:code', getCurrency);

module.exports = router;
