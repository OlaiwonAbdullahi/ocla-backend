const Order = require('../models/Order');
const { getShipmentTracking } = require('../config/shipbubble');

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

    let currentStatus = order.status;
    let liveTracking = null;
    let packageStatusHistory = [];

    // Fetch live tracking from Shipbubble if shipment has been created
    if (order.shipbubbleOrderId) {
      try {
        liveTracking = await getShipmentTracking(order.shipbubbleOrderId);
        if (liveTracking?.status) {
          const mapped = mapShipbubbleStatus(liveTracking.status);
          if (STATUS_ORDER.indexOf(mapped) > STATUS_ORDER.indexOf(currentStatus)) {
            currentStatus = mapped;
          }
        }
        if (Array.isArray(liveTracking?.package_status)) {
          packageStatusHistory = liveTracking.package_status;
        }
      } catch (err) {
        console.error('Shipbubble Tracking Error:', err.message);
      }
    }

    const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus);

    const timeline = STATUS_ORDER.map((status, i) => {
      const internalEvent = order.trackingEvents.find((e) => e.status === status);
      const done = i < currentStatusIndex;
      const active = i === currentStatusIndex;

      return {
        status,
        label: internalEvent?.label || defaultLabel(status),
        description: internalEvent?.description || defaultDescription(status),
        timestamp: internalEvent?.timestamp || null,
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

    const trackingUrl = liveTracking?.tracking_url || order.trackingUrl || null;
    const trackingCode = liveTracking?.courier?.tracking_code || null;
    const trackingMessage = liveTracking?.courier?.tracking_message || null;

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        estimatedDelivery: eta,
        carrier: order.carrier || null,
        origin: 'Lagos',
        destination,
        status: currentStatus,
        trackingUrl,
        trackingCode,
        trackingMessage,
        shipbubbleOrderId: order.shipbubbleOrderId || null,
        packageStatusHistory,
        events: timeline,
      },
    });
  } catch (err) {
    next(err);
  }
}

function mapShipbubbleStatus(status) {
  const map = {
    pending: 'shipped',
    picked_up: 'shipped',
    in_transit: 'shipped',
    out_for_delivery: 'out_for_delivery',
    delivered: 'delivered',
    cancelled: 'shipped',
    returned: 'shipped',
  };
  return map[status] || 'shipped';
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
