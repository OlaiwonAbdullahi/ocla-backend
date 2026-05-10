const Order = require('../models/Order');
const { getShipmentTracking } = require('../config/terminal');

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

    let liveEvents = [];
    let currentStatus = order.status;

    // If we have a Terminal Africa Shipment ID, fetch live updates
    if (order.terminalShipmentId) {
      try {
        const terminalData = await getShipmentTracking(order.terminalShipmentId);
        if (terminalData && terminalData.status) {
          currentStatus = mapTerminalStatus(terminalData.status);
          liveEvents = terminalData.events || [];
        }
      } catch (err) {
        console.error('Terminal Africa Tracking Sync Error:', err.message);
      }
    }

    const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus);

    // Build full timeline — merge internal events with live Terminal Africa events
    const timeline = STATUS_ORDER.map((status, i) => {
      // Find internal event or map from live events
      const internalEvent = order.trackingEvents.find((e) => e.status === status);
      const liveEvent = liveEvents.find(e => mapTerminalStatus(e.status) === status);

      const done = i < currentStatusIndex;
      const active = i === currentStatusIndex;

      return {
        status,
        label: internalEvent?.label || liveEvent?.name || defaultLabel(status),
        description: internalEvent?.description || liveEvent?.description || defaultDescription(status),
        timestamp: internalEvent?.timestamp || liveEvent?.created_at || null,
        done,
        active,
      };
    });

    const eta = new Date(order.estimatedDelivery).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
        origin: 'Lagos',
        destination,
        status: currentStatus,
        events: timeline,
        terminalShipmentId: order.terminalShipmentId || null
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Maps Terminal Africa statuses to internal OCLA statuses
 */
function mapTerminalStatus(terminalStatus) {
  const map = {
    'draft': 'processing',
    'pending': 'processing',
    'processing': 'processing',
    'label_generated': 'packed',
    'pickup_requested': 'packed',
    'out_for_pickup': 'packed',
    'picked_up': 'shipped',
    'in_transit': 'shipped',
    'out_for_delivery': 'out_for_delivery',
    'delivered': 'delivered',
    'returned': 'shipped',
    'cancelled': 'processing'
  };
  return map[terminalStatus] || 'processing';
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
