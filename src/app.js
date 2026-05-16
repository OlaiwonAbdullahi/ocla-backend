const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const trackingRoutes = require("./routes/tracking");
const courierRoutes = require("./routes/couriers");
const currencyRoutes = require("./routes/currencies");
const adminRoutes = require("./routes/admin");
const dodoRoutes = require("./routes/dodo");
const contactRoutes = require("./routes/contact");
const contentRoutes = require("./routes/content");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const mongoSanitize = require("./middleware/sanitize");

const app = express();

app.use(helmet());

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [process.env.FRONTEND_URL];
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      process.env.NODE_ENV !== "production"
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Capture raw body for webhook verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(mongoSanitize);
app.use(morgan("dev"));

// Ensure the DB is connected before any API route runs.
// The cached-connection pattern in connectDB makes this a no-op on warm containers.
app.use("/api", (req, res, next) => {
  connectDB().then(() => next()).catch(next);
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/track", trackingRoutes);
app.use("/api/couriers", courierRoutes);
app.use("/api/currencies", currencyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dodo", dodoRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/content", contentRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
