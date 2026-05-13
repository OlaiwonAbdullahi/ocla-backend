const mongoose = require('mongoose');

// Cache the connection promise on the global object so warm serverless
// containers reuse the existing connection instead of opening a new one.
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');

    // bufferCommands: false surfaces "no connection" errors immediately
    // instead of silently queuing operations until the buffering timeout fires.
    mongoose.set('bufferCommands', false);

    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then((m) => {
        console.log(`MongoDB connected: ${m.connection.host}`);
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset so the next call retries the connection.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

module.exports = connectDB;
