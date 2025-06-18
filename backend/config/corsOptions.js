// Cross Origin Resource Sharing
const allowedOrigins = require("./allowedOrigins");
const logger = require("../logs/logger");

// Get environment-specific origins
const getOrigins = () => {
  // Clone the base allowed origins
  const origins = [...allowedOrigins];
  // Add development server only in development mode
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:5173");
  }

  return origins;
};

const corsOptions = {
  origin: function (origin, callback) {
    const currentAllowedOrigins = getOrigins();

    // For debugging - log every CORS request

    // Allow requests with no origin (like mobile apps, curl requests, etc)
    if (!origin) {
      return callback(null, true);
    }

    if (currentAllowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};

module.exports = { corsOptions, getOrigins };
