const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
const logger = require("../logs/logger");

// Setup nodemailer
const transporter = nodemailer.createTransport({
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

module.exports = { transporter };
