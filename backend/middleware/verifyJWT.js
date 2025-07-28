const jwt = require("jsonwebtoken");
const logger = require("../logs/logger");

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = decoded.user;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  verifyJWT(req, res, () => {
    if (req.user.role === "admin") {
      next();
    } else {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }
  });
};

module.exports = { verifyJWT, verifyAdmin };
