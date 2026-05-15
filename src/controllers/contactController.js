const { sendContactMessage } = require("../utils/email");

async function submitContact(req, res, next) {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "name, email, and message are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address." });
    }

    if (message.length > 2000) {
      return res.status(400).json({ message: "Message must be 2000 characters or fewer." });
    }

    await sendContactMessage({ name, email, subject: subject || "Contact Form Submission", message });

    res.status(200).json({ message: "Your message has been sent. We'll get back to you shortly." });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitContact };
