const logger = require("../logs/logger");
const allowedOrigins = require("../config/allowedOrigins");

const credentials = (req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,PUT,POST,DELETE,PATCH,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin,X-Requested-With,Content-Type,Accept,Authorization"
    );
  } else if (origin) {
    logger.debug(`Credentials middleware: Origin ${origin} is NOT allowed`);
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
};

module.exports = credentials;
