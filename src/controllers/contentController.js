const Story = require("../models/Story");
const Gallery = require("../models/Gallery");
const Certificate = require("../models/Certificate");

// ── Our Story ─────────────────────────────────────────────────────────────────

async function createStory(req, res, next) {
  try {
    const { text, image } = req.body;
    if (!text || !image) {
      return res.status(400).json({ success: false, message: "text and image are required." });
    }
    const story = await Story.create({ text, image });
    res.status(201).json({ success: true, data: story });
  } catch (err) {
    next(err);
  }
}

async function getStories(req, res, next) {
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    res.json({ success: true, data: stories });
  } catch (err) {
    next(err);
  }
}

async function updateStory(req, res, next) {
  try {
    const { text, image } = req.body;
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { text, image },
      { new: true, runValidators: true },
    );
    if (!story) return res.status(404).json({ success: false, message: "Story not found." });
    res.json({ success: true, data: story });
  } catch (err) {
    next(err);
  }
}

async function deleteStory(req, res, next) {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: "Story not found." });
    res.json({ success: true, message: "Story deleted." });
  } catch (err) {
    next(err);
  }
}

// ── Gallery ───────────────────────────────────────────────────────────────────

async function addGalleryImage(req, res, next) {
  try {
    const { imageLink } = req.body;
    if (!imageLink) {
      return res.status(400).json({ success: false, message: "imageLink is required." });
    }
    const item = await Gallery.create({ imageLink });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function getGallery(req, res, next) {
  try {
    const items = await Gallery.find().sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

async function updateGalleryImage(req, res, next) {
  try {
    const { imageLink } = req.body;
    if (!imageLink) {
      return res.status(400).json({ success: false, message: "imageLink is required." });
    }
    const item = await Gallery.findByIdAndUpdate(
      req.params.id,
      { imageLink },
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found." });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function deleteGalleryImage(req, res, next) {
  try {
    const item = await Gallery.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found." });
    res.json({ success: true, message: "Gallery item deleted." });
  } catch (err) {
    next(err);
  }
}

// ── Certificates ──────────────────────────────────────────────────────────────

async function createCertificate(req, res, next) {
  try {
    const { title, imageLink, description, year } = req.body;
    const certId = req.body["cert-id"] || req.body.certId;

    const missing = [];
    if (!certId) missing.push("cert-id");
    if (!title) missing.push("title");
    if (!imageLink) missing.push("imageLink");
    if (!description) missing.push("description");
    if (!year) missing.push("year");

    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });
    }

    const cert = await Certificate.create({ certId, title, imageLink, description, year: Number(year) });
    res.status(201).json({ success: true, data: cert });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A certificate with that cert-id already exists." });
    }
    next(err);
  }
}

async function getCertificates(req, res, next) {
  try {
    const certs = await Certificate.find().sort({ year: -1, createdAt: -1 });
    res.json({ success: true, data: certs });
  } catch (err) {
    next(err);
  }
}

async function updateCertificate(req, res, next) {
  try {
    const { title, imageLink, description, year } = req.body;
    const certId = req.body["cert-id"] || req.body.certId;

    const update = {};
    if (certId !== undefined) update.certId = certId;
    if (title !== undefined) update.title = title;
    if (imageLink !== undefined) update.imageLink = imageLink;
    if (description !== undefined) update.description = description;
    if (year !== undefined) update.year = Number(year);

    const cert = await Certificate.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true },
    );
    if (!cert) return res.status(404).json({ success: false, message: "Certificate not found." });
    res.json({ success: true, data: cert });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A certificate with that cert-id already exists." });
    }
    next(err);
  }
}

async function deleteCertificate(req, res, next) {
  try {
    const cert = await Certificate.findByIdAndDelete(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: "Certificate not found." });
    res.json({ success: true, message: "Certificate deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStory, getStories, updateStory, deleteStory,
  addGalleryImage, getGallery, updateGalleryImage, deleteGalleryImage,
  createCertificate, getCertificates, updateCertificate, deleteCertificate,
};
