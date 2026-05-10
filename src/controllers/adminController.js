const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Product = require('../models/Product');

// ── Auth ──────────────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: { token, admin: { id: admin._id, email: admin.email, name: admin.name } },
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res) {
  res.json({ success: true, data: req.admin });
}

// ── Product CRUD ──────────────────────────────────────────────────────────────

async function createProduct(req, res, next) {
  try {
    const {
      _id, name, category, units, image, images, video, badge,
      description, inci, grade, shelfLife, storage, safety,
      usageInstructions, features,
    } = req.body;

    const missing = ['_id', 'name', 'category', 'units', 'image', 'description',
      'inci', 'grade', 'shelfLife', 'storage', 'safety', 'usageInstructions']
      .filter((f) => !req.body[f]);

    if (missing.length) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    }

    if (!Array.isArray(units) || units.length === 0) {
      return res.status(400).json({ success: false, message: 'units must be a non-empty array' });
    }
    for (const u of units) {
      if (!u.label || u.price == null) {
        return res.status(400).json({ success: false, message: 'Each unit must have label and price' });
      }
    }

    const existing = await Product.findById(_id);
    if (existing) {
      return res.status(409).json({ success: false, message: `Product with id "${_id}" already exists` });
    }

    const product = await Product.create({
      _id, name, category, units, image,
      images: images || [],
      video,
      badge,
      description, inci, grade, shelfLife, storage, safety,
      usageInstructions,
      features: features || [],
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const allowed = [
      'name', 'category', 'units', 'image', 'images', 'video', 'badge',
      'description', 'inci', 'grade', 'shelfLife', 'storage', 'safety',
      'usageInstructions', 'features',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.units !== undefined) {
      if (!Array.isArray(updates.units) || updates.units.length === 0) {
        return res.status(400).json({ success: false, message: 'units must be a non-empty array' });
      }
      for (const u of updates.units) {
        if (!u.label || u.price == null) {
          return res.status(400).json({ success: false, message: 'Each unit must have label and price' });
        }
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: `Product "${product.name}" deleted` });
  } catch (err) {
    next(err);
  }
}

// ── Orders (read-only for admin) ──────────────────────────────────────────────

async function listOrders(req, res, next) {
  try {
    const Order = require('../models/Order');
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getMe, createProduct, updateProduct, deleteProduct, listOrders };
