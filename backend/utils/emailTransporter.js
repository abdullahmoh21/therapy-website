const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
const logger = require("../logs/logger");

let transporter = null;

// Lazy initialization function
function createTransporter() {
  if (transporter) {
    return transporter;
  }

  // Setup nodemailer
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Setup email templates
  const handlebarOptions = {
    viewEngine: {
      extName: ".hbs",
      partialsDir: path.resolve("./utils/emailTemplates"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./utils/emailTemplates"),
    extName: ".hbs",
  };

  // Apply template configuration
  transporter.use("compile", hbs(handlebarOptions));

  return transporter;
}

// Export getter that creates transporter on first access
module.exports = {
  get transporter() {
    return createTransporter();
  },
  createTransporter, // Export for testing
};

