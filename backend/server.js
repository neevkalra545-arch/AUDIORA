const dotenv = require("dotenv");
dotenv.config({ path: require('path').join(__dirname, '.env') });

const express = require("express");
const cors = require("cors");
const path = require("path");

// Security middleware
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import Routes
const searchRoutes = require("./routes/search");
const lyricsRoutes = require("./routes/lyrics");
const lyricsSearchRoutes = require("./routes/lyricsSearch");
const authRoutes = require("./routes/auth");
const playlistRoutes = require("./routes/Playlist");
const likedSongsRoutes = require("./routes/likedSongs");
const searchHistoryRoutes = require("./routes/searchHistory");

const app = express();

// ── CORS Configuration ────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://www.youtube.com",
          "https://s.ytimg.com",
          "https://www.gstatic.com",
          "https:"
        ],

        frameSrc: [
          "'self'",
          "https://www.youtube.com"
        ],

        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "https://www.youtube.com",
          "https://*.googlevideo.com",
          "https:"
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:"
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https:"
        ],

        fontSrc: [
          "'self'",
          "https:",
          "data:"
        ],

        mediaSrc: [
          "'self'",
          "blob:",
          "https:"
        ]
      }
    }
  })
);
// ── Body Parser ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ── Global API Rate Limiting ──────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // max requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later."
    });
  }
});
app.use("/api", apiLimiter);

// ── Auth Rate Limiting (Stricter) ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: "Too many auth attempts. Please wait and try again."
    });
  }
});
app.use("/api/auth", authLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api", searchRoutes);
app.use("/api", lyricsRoutes);
app.use("/api/lyrics", lyricsSearchRoutes);
app.use("/api", playlistRoutes);
app.use("/api", likedSongsRoutes);
app.use("/api", searchHistoryRoutes);


// ── Health Check Endpoint ────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mongodb: "disabled (running without MongoDB)",
    timestamp: new Date().toISOString()
  });
});

// ── Serve Frontend Static Files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../Frontend")));

// ── SPA Fallback ──────────────────────────────────────────────────────────────
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// ── Error Handling Middleware ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🎵 Audiora Server Started");
  console.log("=".repeat(60));
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? "✅ Configured" : "❌ Not configured"}`);
  console.log(`📧 Email Service: ${process.env.EMAIL_USER !== "your.gmail@gmail.com" ? "✅ Configured" : "⚠️  Not configured"}`);
  console.log("🎨 Allowed Origins:", allowedOrigins);
  console.log("=".repeat(60));
  console.log("\nPress Ctrl+C to stop the server\n");
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("📌 SIGTERM received. Closing server gracefully...");
  server.close(() => {
    console.log("🛑 Server closed");
    process.exit(0);
  });
});

module.exports = app;

