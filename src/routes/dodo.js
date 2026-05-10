const express = require('express');
const router = express.Router();
const { webhook, verifyPayment } = require('../controllers/dodoController');

router.post('/webhook', express.json(), webhook);
router.get('/verify/:reference', verifyPayment);

module.exports = router;
