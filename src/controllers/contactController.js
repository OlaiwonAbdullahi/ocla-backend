const Contact = require("../models/Contact");
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

    const resolvedSubject = subject || "Contact Form Submission";

    await Contact.create({ name, email, subject: resolvedSubject, message });

    sendContactMessage({ name, email, subject: resolvedSubject, message }).catch(console.error);

    res.status(200).json({ message: "Your message has been sent. We'll get back to you shortly." });
  } catch (err) {
    next(err);
  }
}

async function listContactMessages(req, res, next) {
  try {
    const { read, page = 1, limit = 20 } = req.query;
    const filter = read !== undefined ? { read: read === "true" } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [messages, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Contact.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
}

async function markContactRead(req, res, next) {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true },
    );
    if (!contact) return res.status(404).json({ message: "Message not found." });
    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitContact, listContactMessages, markContactRead };
