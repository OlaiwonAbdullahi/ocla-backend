const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Story", storySchema);
