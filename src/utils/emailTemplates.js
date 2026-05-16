// Inline-styled HTML email templates for OCLA Botanical
// All styles are inline for maximum email client compatibility

const BRAND = {
  primary: "#2D6A4F",
  primaryLight: "#52B788",
  bg: "#F4F0EB",
  cardBg: "#FFFFFF",
  text: "#1B2A1E",
  textMuted: "#6B7280",
  border: "#E5E0D8",
  danger: "#DC2626",
  success: "#16A34A",
};

function layout(title, bodyContent) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${BRAND.text};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="background-color:${BRAND.primary};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
                <p style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">OCLA Botanical</p>
                <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;">Pure · Natural · Botanical</p>
              </div>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background-color:${BRAND.cardBg};border-radius:0 0 12px 12px;padding:36px 40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 8px;">
              <p style="margin:0;font-size:12px;color:${BRAND.textMuted};line-height:1.6;">
                © ${new Date().getFullYear()} OCLA Botanical Ltd. All rights reserved.<br/>
                If you have questions, reply to this email or contact us at
                <a href="mailto:${process.env.ADMIN_EMAIL || "support@ocla.com"}" style="color:${BRAND.primary};text-decoration:none;">${process.env.ADMIN_EMAIL || "support@ocla.com"}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${BRAND.text};">${text}</h1>`;
}

function subheading(text) {
  return `<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">${text}</p>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:24px 0;" />`;
}

function badge(text, color = BRAND.primary) {
  return `<span style="display:inline-block;background-color:${color};color:#fff;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">${text}</span>`;
}

function button(text, url) {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background-color:${BRAND.primary};border-radius:8px;">
          <a href="${url}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">${text}</a>
        </td>
      </tr>
    </table>`;
}

function infoRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;font-size:14px;color:${BRAND.textMuted};width:40%;vertical-align:top;">${label}</td>
      <td style="padding:10px 0;font-size:14px;color:${BRAND.text};font-weight:500;vertical-align:top;">${value}</td>
    </tr>`;
}

function infoTable(rows) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.border};margin:16px 0;">
      ${rows}
    </table>`;
}

function itemsTable(items) {
  const rows = items
    .map(
      (i) => `
    <tr>
      <td style="padding:12px 0;font-size:14px;color:${BRAND.text};border-bottom:1px solid ${BRAND.border};">
        <strong>${i.productName}</strong><br/>
        <span style="color:${BRAND.textMuted};font-size:13px;">${i.unitLabel} × ${i.quantity}</span>
      </td>
      <td style="padding:12px 0;font-size:14px;color:${BRAND.text};font-weight:600;text-align:right;border-bottom:1px solid ${BRAND.border};">
        ₦${i.lineTotal.toLocaleString()}
      </td>
    </tr>`,
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:${BRAND.textMuted};text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${BRAND.border};">Item</th>
          <th style="padding:8px 0;font-size:12px;font-weight:600;color:${BRAND.textMuted};text-align:right;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${BRAND.border};">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function totalsBlock(subtotal, deliveryPrice, grandTotal) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${BRAND.textMuted};">Subtotal</td>
        <td style="padding:6px 0;font-size:14px;color:${BRAND.text};text-align:right;">₦${subtotal.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${BRAND.textMuted};">Delivery</td>
        <td style="padding:6px 0;font-size:14px;color:${BRAND.text};text-align:right;">₦${deliveryPrice.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 6px;font-size:16px;font-weight:700;color:${BRAND.text};border-top:2px solid ${BRAND.border};">Grand Total</td>
        <td style="padding:12px 0 6px;font-size:16px;font-weight:700;color:${BRAND.primary};text-align:right;border-top:2px solid ${BRAND.border};">₦${grandTotal.toLocaleString()}</td>
      </tr>
    </table>`;
}

// ── Exported template functions ────────────────────────────────────────────────

function orderConfirmationTemplate(order) {
  const eta = new Date(order.estimatedDelivery).toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const deliveryLabels = {
    standard: "Standard Shipping",
    express: "Express Shipping",
    pickup: "Pickup (Lagos)",
  };
  const addressLine = [
    order.shippingAddress.address,
    order.shippingAddress.address2,
    order.shippingAddress.city,
    order.shippingAddress.state,
    order.shippingAddress.country,
  ]
    .filter(Boolean)
    .join(", ");

  const paymentSection = `<div style="background-color:#F0F7F4;border:1px solid #B7DFD0;border-radius:8px;padding:16px 24px;margin:24px 0;">
    <p style="margin:0;font-size:14px;color:${BRAND.primary};font-weight:600;">✓ Payment via Dodo — we'll confirm once your payment is complete.</p>
  </div>`;

  const trackUrl = `${process.env.FRONTEND_URL || "https://oclabotanicals.com"}/track/${order.orderNumber}`;

  const body = `
    ${heading(`Thank you, ${order.contactFirstName}!`)}
    ${subheading("Your order has been received and is being prepared.")}

    <div style="margin-bottom:20px;">
      ${badge(order.orderNumber)}
    </div>

    ${itemsTable(order.items)}
    ${totalsBlock(order.subtotal, order.deliveryPrice, order.grandTotal)}
    ${divider()}

    ${infoTable(`
      ${infoRow("Estimated Delivery", `<strong>${eta}</strong>`)}
      ${infoRow("Delivery Carrier", order.courierName)}
      ${infoRow("Payment Method", paymentLabels[order.paymentMethod] || order.paymentMethod)}
      ${infoRow("Shipping To", addressLine)}
    `)}

    ${paymentSection}

    <p style="margin:0 0 8px;font-size:14px;color:${BRAND.textMuted};">Track your order status anytime:</p>
    ${button("Track My Order", trackUrl)}

    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.textMuted};">
      If you have any questions about your order, reply to this email and we'll be happy to help.
    </p>
  `;

  return layout(`Order Confirmed — ${order.orderNumber}`, body);
}

function orderShippedTemplate(order) {
  const trackUrl =
    order.trackingUrl ||
    `${process.env.FRONTEND_URL || "https://ocla.com"}/track/${order.orderNumber}`;

  const body = `
    ${heading("Your order is on its way! 🚚")}
    ${subheading(`Great news — ${order.orderNumber} has been handed to ${order.carrier || "our delivery partner"} and is heading your direction.`)}

    ${divider()}

    ${infoTable(`
      ${infoRow("Order Number", badge(order.orderNumber))}
      ${infoRow("Carrier", order.carrier || "Our Delivery Partner")}
      ${infoRow(
        "Delivering To",
        [
          order.shippingAddress.address,
          order.shippingAddress.city,
          order.shippingAddress.state,
        ].join(", "),
      )}
    `)}

    <p style="margin:24px 0 8px;font-size:14px;color:${BRAND.textMuted};">Use the button below to follow your delivery in real time:</p>
    ${button("Track My Delivery", trackUrl)}

    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.textMuted};">
      If you have any questions, simply reply to this email.
    </p>
  `;

  return layout(`Your Order Has Shipped — ${order.orderNumber}`, body);
}

function orderDeliveredTemplate(order) {
  const reviewUrl = `${process.env.FRONTEND_URL || "https://ocla.com"}/products`;

  const body = `
    ${heading("Order Delivered! ✅")}
    ${subheading(`Your order <strong>${order.orderNumber}</strong> has been successfully delivered. We hope you love your OCLA Botanical products!`)}

    ${divider()}

    ${itemsTable(order.items)}

    ${divider()}

    <div style="text-align:center;padding:16px 0;">
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:${BRAND.text};">Enjoying your order?</p>
      <p style="margin:0 0 16px;font-size:14px;color:${BRAND.textMuted};">Your feedback helps other customers and supports our small business.</p>
      ${button("Leave a Review", reviewUrl)}
    </div>

    <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};text-align:center;">
      Thank you for choosing OCLA Botanical. We can't wait to serve you again.
    </p>
  `;

  return layout(`Delivered — ${order.orderNumber}`, body);
}

function newOrderAdminTemplate(order) {
  const adminUrl = `${process.env.FRONTEND_URL || "https://ocla.com"}/admin/orders`;

  const body = `
    ${heading("New Order Received")}
    ${subheading(`A new order has just been placed and needs your attention.`)}

    <div style="margin-bottom:20px;">
      ${badge(order.orderNumber)} &nbsp; ${badge(order.paymentMethod.toUpperCase(), order.paymentMethod === "card" ? BRAND.primaryLight : "#F59E0B")}
    </div>

    ${divider()}

    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Customer</p>
    ${infoTable(`
      ${infoRow("Name", `${order.contactFirstName} ${order.contactLastName}`)}
      ${infoRow("Email", order.contactEmail)}
      ${infoRow("Phone", order.contactPhone)}
    `)}

    ${divider()}

    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Order</p>
    ${itemsTable(order.items)}
    ${totalsBlock(order.subtotal, order.deliveryPrice, order.grandTotal)}

    ${divider()}

    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Delivery</p>
    ${infoTable(`
      ${infoRow("Carrier", order.courierName)}
      ${infoRow(
        "Address",
        [
          order.shippingAddress.address,
          order.shippingAddress.address2,
          order.shippingAddress.city,
          order.shippingAddress.state,
          order.shippingAddress.country,
        ]
          .filter(Boolean)
          .join(", "),
      )}
    `)}

    ${button("View Order in Dashboard", adminUrl)}
  `;

  return layout(`New Order — ${order.orderNumber}`, body);
}

function contactMessageTemplate({ name, email, subject, message }) {
  const body = `
    ${heading("New Contact Form Submission")}
    ${subheading(subject)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:${BRAND.textMuted};width:100px;">From</td>
        <td style="padding:8px 0;font-size:14px;color:${BRAND.text};font-weight:600;">${name}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:${BRAND.textMuted};">Email</td>
        <td style="padding:8px 0;font-size:14px;"><a href="mailto:${email}" style="color:${BRAND.primary};text-decoration:none;">${email}</a></td>
      </tr>
    </table>
    ${divider()}
    <p style="margin:16px 0 0;font-size:15px;color:${BRAND.text};line-height:1.7;white-space:pre-line;">${message}</p>
  `;
  return layout(subject, body);
}

function contactAutoReplyTemplate({ name }) {
  const body = `
    ${heading(`Hi ${name},`)}
    ${subheading("Thanks for reaching out to OCLA Botanical!")}
    <p style="font-size:15px;color:${BRAND.text};line-height:1.7;margin:0 0 16px;">
      We've received your message and our team will get back to you within 1–2 business days.
    </p>
    <p style="font-size:15px;color:${BRAND.textMuted};line-height:1.7;margin:0;">
      In the meantime, feel free to browse our collection at
      <a href="${process.env.FRONTEND_URL || "https://ocla.com"}" style="color:${BRAND.primary};text-decoration:none;">${process.env.FRONTEND_URL || "https://ocla.com"}</a>.
    </p>
  `;
  return layout("We received your message", body);
}

module.exports = {
  orderConfirmationTemplate,
  orderShippedTemplate,
  orderDeliveredTemplate,
  newOrderAdminTemplate,
  contactMessageTemplate,
  contactAutoReplyTemplate,
};
