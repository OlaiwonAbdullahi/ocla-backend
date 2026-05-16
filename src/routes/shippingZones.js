const express = require("express");
const router = express.Router();
const { listZones, getZoneByLocation } = require("../controllers/shippingZoneController");

router.get("/", listZones);
router.get("/lookup", getZoneByLocation);

module.exports = router;
