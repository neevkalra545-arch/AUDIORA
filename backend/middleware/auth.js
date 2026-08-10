const jwt = require("jsonwebtoken");
const db = require("../services/localDb");

module.exports = function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: "Server misconfigured (JWT_SECRET missing)" });
    }

    const decoded = jwt.verify(token, secret);

    const user = db.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    req.user = { id: decoded.id, name: user.name, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

