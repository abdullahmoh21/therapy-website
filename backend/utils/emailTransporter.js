// In emailTransporter.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 10,
    host: 'smtp.resend.com',
    secure: true,
    port: 465,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_API_KEY,
    },
});

module.exports = transporter;