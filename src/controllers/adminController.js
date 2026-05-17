const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Product = require('../models/Product');

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function uniqueSlug(base, excludeId = null) {
  let slug = base;
  let i = 1;
  while (true) {
    const filter = { slug };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Product.exists(filter);
    if (!exists) return slug;
    slug = `${base}-${i++}`;
  }
}

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
      name, category, units, image, images, video, badge,
      description, inci, grade, shelfLife, storage, safety,
      usageInstructions, features,
    } = req.body;

    const missing = ['name', 'category', 'units', 'image', 'description',
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

    const slug = await uniqueSlug(toSlug(name));

    const product = await Product.create({
      name, slug, category, units, image,
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
      'usageInstructions', 'features', 'slug', 'tax',
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

    if (updates.name && !updates.slug) {
      updates.slug = await uniqueSlug(toSlug(updates.name), req.params.id);
    } else if (updates.slug) {
      updates.slug = await uniqueSlug(toSlug(updates.slug), req.params.id);
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

// ── Shipment ──────────────────────────────────────────────────────────────────

async function startShipment(req, res, next) {
  try {
    const Order = require('../models/Order');
    const { createShipment } = require('../config/shipbubble');
    const { sendShippedNotification } = require('../utils/email');

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.shipbubbleOrderId) {
      return res.status(400).json({ success: false, message: 'Shipment already created for this order' });
    }
    if (!order.shipbubbleRequestToken || !order.shipbubbleServiceCode || !order.shipbubbleCourierId) {
      return res.status(400).json({ success: false, message: 'Order is missing Shipbubble rate data. Please re-create the order.' });
    }

    const shipment = await createShipment({
      request_token: order.shipbubbleRequestToken,
      service_code: order.shipbubbleServiceCode,
      courier_id: order.shipbubbleCourierId,
    });

    order.shipbubbleOrderId = shipment.order_id;
    order.trackingUrl = shipment.tracking_url;
    order.carrier = shipment.courier?.name || order.courierName;
    order.status = 'shipped';
    order.trackingEvents.push({
      status: 'shipped',
      label: 'Shipped',
      description: `Your order has been handed to ${shipment.courier?.name || 'the carrier'}.`,
      timestamp: new Date(),
    });
    await order.save();

    sendShippedNotification(order).catch(console.error);

    res.json({ success: true, data: { shipbubbleOrderId: shipment.order_id, trackingUrl: shipment.tracking_url } });
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

// ── Transactions ──────────────────────────────────────────────────────────────

async function listTransactions(req, res, next) {
  try {
    const Order = require('../models/Order');
    const { paymentStatus, from, to, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Order.find(filter)
        .select('orderNumber contactFirstName contactLastName contactEmail subtotal taxAmount deliveryPrice grandTotal paymentStatus paymentMethod paymentReference deliveryZone createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
}

// ── Dashboard overview ────────────────────────────────────────────────────────

async function getDashboard(req, res, next) {
  try {
    const Order = require('../models/Order');
    const Product = require('../models/Product');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      ordersByStatus,
      ordersByPayment,
      totalOrders,
      totalProducts,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      // Total revenue (paid orders)
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),

      // Revenue this month
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),

      // Revenue last month
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),

      // Orders by fulfillment status
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Orders by payment status
      Order.aggregate([
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
      ]),

      // Total order count
      Order.countDocuments(),

      // Total product count
      Product.countDocuments(),

      // Recent 5 orders
      Order.find()
        .select('orderNumber contactFirstName contactLastName grandTotal paymentStatus status createdAt')
        .sort({ createdAt: -1 })
        .limit(5),

      // Top 5 products by units sold
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productName', unitsSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
        { $sort: { unitsSold: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const revenueThisMonthVal = parseFloat((revenueThisMonth[0]?.total || 0).toFixed(2));
    const revenueLastMonthVal = parseFloat((revenueLastMonth[0]?.total || 0).toFixed(2));
    const revenueGrowth = revenueLastMonthVal === 0
      ? null
      : parseFloat((((revenueThisMonthVal - revenueLastMonthVal) / revenueLastMonthVal) * 100).toFixed(1));

    const statusMap = Object.fromEntries(ordersByStatus.map((s) => [s._id, s.count]));
    const paymentMap = Object.fromEntries(ordersByPayment.map((s) => [s._id, s.count]));

    res.json({
      success: true,
      data: {
        revenue: {
          total: parseFloat((totalRevenue[0]?.total || 0).toFixed(2)),
          thisMonth: revenueThisMonthVal,
          lastMonth: revenueLastMonthVal,
          growthPercent: revenueGrowth,
        },
        orders: {
          total: totalOrders,
          byStatus: {
            processing: statusMap.processing || 0,
            packed: statusMap.packed || 0,
            shipped: statusMap.shipped || 0,
            out_for_delivery: statusMap.out_for_delivery || 0,
            delivered: statusMap.delivered || 0,
          },
          byPayment: {
            pending: paymentMap.pending || 0,
            paid: paymentMap.paid || 0,
            failed: paymentMap.failed || 0,
          },
        },
        products: { total: totalProducts },
        recentOrders,
        topProducts,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getMe, createProduct, updateProduct, deleteProduct, listOrders, startShipment, listTransactions, getDashboard };
