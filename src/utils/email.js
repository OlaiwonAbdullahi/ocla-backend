const { Resend } = require('resend');
const {
  orderConfirmationTemplate,
  orderShippedTemplate,
  orderDeliveredTemplate,
  newOrderAdminTemplate,
} = require('./emailTemplates');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || 'OCLA Botanical <orders@ocla.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function send({ to, subject, html }) {
  return resend.emails.send({ from: FROM, to, subject, html });
}

async function sendOrderConfirmation(order) {
  await send({
    to: order.contactEmail,
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: orderConfirmationTemplate(order),
  });
}

async function sendShippedNotification(order) {
  await send({
    to: order.contactEmail,
    subject: `Your Order Has Shipped — ${order.orderNumber}`,
    html: orderShippedTemplate(order),
  });
}

async function sendDeliveredNotification(order) {
  await send({
    to: order.contactEmail,
    subject: `Delivered! Your OCLA Order ${order.orderNumber}`,
    html: orderDeliveredTemplate(order),
  });
}

async function sendNewOrderAdmin(order) {
  if (!ADMIN_EMAIL) return;
  await send({
    to: ADMIN_EMAIL,
    subject: `New Order — ${order.orderNumber} (₦${order.grandTotal.toLocaleString()})`,
    html: newOrderAdminTemplate(order),
  });
}

module.exports = {
  sendOrderConfirmation,
  sendShippedNotification,
  sendDeliveredNotification,
  sendNewOrderAdmin,
};
