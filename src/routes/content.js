const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const {
  createStory, getStories, updateStory, deleteStory,
  addGalleryImage, getGallery, updateGalleryImage, deleteGalleryImage,
  createCertificate, getCertificates, updateCertificate, deleteCertificate,
} = require("../controllers/contentController");

// Our Story
router.get("/story", getStories);
router.post("/story", requireAdmin, createStory);
router.put("/story/:id", requireAdmin, updateStory);
router.delete("/story/:id", requireAdmin, deleteStory);

// Gallery
router.get("/gallery", getGallery);
router.post("/gallery", requireAdmin, addGalleryImage);
router.put("/gallery/:id", requireAdmin, updateGalleryImage);
router.delete("/gallery/:id", requireAdmin, deleteGalleryImage);

// Certificates
router.get("/certificates", getCertificates);
router.post("/certificates", requireAdmin, createCertificate);
router.put("/certificates/:id", requireAdmin, updateCertificate);
router.delete("/certificates/:id", requireAdmin, deleteCertificate);

module.exports = router;
