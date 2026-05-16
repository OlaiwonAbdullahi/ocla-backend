const express = require("express");
const multer = require("multer");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const {
  login,
  getMe,
  createProduct,
  updateProduct,
  deleteProduct,
  listOrders,
  startShipment,
} = require("../controllers/adminController");
const { uploadSingle, uploadBatch } = require("../controllers/mediaController");
const {
  listContactMessages,
  markContactRead,
} = require("../controllers/contactController");
const {
  createZone,
  updateZone,
  deleteZone,
  listZones,
} = require("../controllers/shippingZoneController");

// multer — memory storage, 100 MB ceiling (per-file limits enforced in controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Public
router.post("/login", login);

// Protected — all routes below require a valid admin JWT
router.use(requireAdmin);

router.get("/me", getMe);

// Media upload
router.post("/media/upload", upload.single("file"), uploadSingle);
router.post("/media/upload/batch", upload.array("files", 10), uploadBatch);

// Product CRUD
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

// Orders
router.get("/orders", listOrders);
router.post("/orders/:id/ship", startShipment);

// Contact messages
router.get("/contact-messages", listContactMessages);
router.patch("/contact-messages/:id/read", markContactRead);

// Shipping zones
router.get("/shipping-zones", listZones);
router.post("/shipping-zones", createZone);
router.put("/shipping-zones/:id", updateZone);
router.delete("/shipping-zones/:id", deleteZone);

module.exports = router;
