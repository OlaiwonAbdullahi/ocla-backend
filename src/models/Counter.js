const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 10000 },
});

counterSchema.statics.nextSeq = async function (id) {
  const doc = await this.findByIdAndUpdate(
    id,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
