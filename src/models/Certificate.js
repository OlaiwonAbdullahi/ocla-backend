const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    imageLink: { type: String, required: true },
    description: { type: String, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Certificate", certificateSchema);
