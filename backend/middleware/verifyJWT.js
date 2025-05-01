const jwt = require("jsonwebtoken");
const Joi = require("joi");
const logger = require("../logs/logger");

const schema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid("user", "admin").required(),
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401); //unauthorized

  const token = authHeader.split(" ")[1]; //take out jwt
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Invalid JWT payload. Access Denied" });
    }
    const { error } = schema.validate(decoded.user);
    if (error) {
      logger.error(`JWT payload validation error: ${error.message}`);
      return res
        .status(403)
        .json({ message: "Invalid JWT payload. Access Denied" });
    }
    req.user = decoded.user;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  verifyJWT(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== "admin") {
      logger.warn(`Unauthorized access attempt by user: ${req.email}`);
      return res.sendStatus(403); // Forbidden
    }
    next();
  });
};

module.exports = { verifyJWT, verifyAdmin };
