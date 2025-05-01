const logger = require("../logs/logger");

const requireHttps = (req, res, next) => {
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    next();
  } else {
    // Log the redirect attempt
    logger.info(
      `Redirecting ${req.method} request from HTTP to HTTPS: ${req.hostname}${req.url}`
    );

    // For GET requests, a 301/302 redirect works fine
    if (req.method === "GET") {
      return res.redirect(301, "https://" + req.hostname + req.url);
    }
    // For other methods (POST, PUT, PATCH, DELETE), browsers don't preserve the method or body
    // Send a proper response with instructions
    else {
      return res.status(400).json({
        error: "HTTPS Required",
        message:
          "This API requires secure HTTPS connections. Please use HTTPS protocol instead.",
        redirectUrl: "https://" + req.hostname + req.url,
      });
    }
  }
};

module.exports = requireHttps;
