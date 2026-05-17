const Order = require('../models/Order');

const STATUS_ORDER = ['processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

async function trackOrder(req, res, next) {
  try {
    const { orderNumber } = req.params;

    if (!/^OCL-\d+$/.test(orderNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid order number format. Expected: OCL-XXXXX' });
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      return next(err);
    }

    const currentStatusIndex = STATUS_ORDER.indexOf(order.status);

    const timeline = STATUS_ORDER.map((status, i) => {
      const event = order.trackingEvents.find((e) => e.status === status);
      return {
        status,
        label: event?.label || defaultLabel(status),
        description: event?.description || defaultDescription(status),
        timestamp: event?.timestamp || null,
        done: i < currentStatusIndex,
        active: i === currentStatusIndex,
      };
    });

    const eta = new Date(order.estimatedDelivery).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const destination = [
      order.shippingAddress.address,
      order.shippingAddress.city,
      order.shippingAddress.state,
    ].join(', ');

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        estimatedDelivery: eta,
        carrier: order.carrier || null,
        trackingUrl: order.trackingUrl || null,
        origin: 'Lagos',
        destination,
        status: order.status,
        events: timeline,
      },
    });
  } catch (err) {
    next(err);
  }
}

function defaultLabel(status) {
  const map = {
    processing: 'Order Placed',
    packed: 'Order Packed',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
  };
  return map[status] || status;
}

function defaultDescription(status) {
  const map = {
    processing: 'Your order has been received and is being reviewed.',
    packed: 'Your order has been packed and is ready for dispatch.',
    shipped: 'Your order has been handed to the carrier.',
    out_for_delivery: 'Your order is out for delivery.',
    delivered: 'Your order has been delivered successfully.',
  };
  return map[status] || '';
}

module.exports = { trackOrder };
