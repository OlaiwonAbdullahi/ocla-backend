const express = require('express');
const router = express.Router();
const { webhook, verifyPayment } = require('../controllers/korapayController');

// Korapay sends raw JSON
router.post('/webhook', express.json(), webhook);

// Frontend redirects here
router.get('/verify/:reference', verifyPayment);

module.exports = router;
