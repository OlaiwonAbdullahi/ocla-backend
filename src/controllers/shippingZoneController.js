const ShippingZone = require("../models/ShippingZone");

// ── Admin ─────────────────────────────────────────────────────────────────────

async function createZone(req, res, next) {
  try {
    const { location, fee, estimatedDays } = req.body;
    if (!location || fee == null) {
      return res.status(400).json({ success: false, message: "location and fee are required." });
    }
    const zone = await ShippingZone.create({
      location: location.trim(),
      fee: Number(fee),
      ...(estimatedDays != null && { estimatedDays: Number(estimatedDays) }),
    });
    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A shipping zone for that location already exists." });
    }
    next(err);
  }
}

async function updateZone(req, res, next) {
  try {
    const { location, fee, estimatedDays } = req.body;
    const update = {};
    if (location !== undefined) update.location = location.trim();
    if (fee !== undefined) update.fee = Number(fee);
    if (estimatedDays !== undefined) update.estimatedDays = Number(estimatedDays);

    if (!Object.keys(update).length) {
      return res.status(400).json({ success: false, message: "Provide location or fee to update." });
    }

    const zone = await ShippingZone.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true },
    );
    if (!zone) return res.status(404).json({ success: false, message: "Shipping zone not found." });
    res.json({ success: true, data: zone });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A shipping zone for that location already exists." });
    }
    next(err);
  }
}

async function deleteZone(req, res, next) {
  try {
    const zone = await ShippingZone.findByIdAndDelete(req.params.id);
    if (!zone) return res.status(404).json({ success: false, message: "Shipping zone not found." });
    res.json({ success: true, message: "Shipping zone deleted." });
  } catch (err) {
    next(err);
  }
}

// ── Public ────────────────────────────────────────────────────────────────────

async function listZones(req, res, next) {
  try {
    const zones = await ShippingZone.find().sort({ location: 1 });
    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
}

async function getZoneByLocation(req, res, next) {
  try {
    const location = req.query.location || "";
    if (!location) {
      return res.status(400).json({ success: false, message: "location query param is required." });
    }

    const zone = await ShippingZone.findOne({
      location: { $regex: new RegExp(`^${location.trim()}$`, "i") },
    });

    if (!zone) {
      return res.status(404).json({ success: false, message: `No shipping rate found for "${location}".` });
    }

    res.json({ success: true, data: zone });
  } catch (err) {
    next(err);
  }
}

module.exports = { createZone, updateZone, deleteZone, listZones, getZoneByLocation };
