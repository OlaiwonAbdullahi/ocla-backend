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
} = require("../controllers/adminController");
const { uploadSingle, uploadBatch } = require("../controllers/mediaController");
const {
  listAllCurrencies,
  toggleCurrencyVisibility,
  syncRates,
} = require("../controllers/currencyController");

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

// Currency Management
router.get("/currencies", listAllCurrencies);
router.post("/currencies/sync", syncRates);
router.patch("/currencies/:code", toggleCurrencyVisibility);

// Orders (read + status update reuses the existing PATCH /api/orders/:id/status)
router.get("/orders", listOrders);

module.exports = router;
