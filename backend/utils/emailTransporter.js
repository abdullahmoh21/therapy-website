const nodemailer = require('nodemailer');
const path = require('path');
const logger = require('../logs/logger');
const handlebars = require('nodemailer-express-handlebars');

// Create a Nodemailer transporter
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

// Configure Handlebars for Nodemailer
const handlebarOptions = {
  viewEngine: {
      extName: '.hbs',
      partialsDir: path.resolve('./views/email'),
      defaultLayout: '',
  },
  viewPath: path.resolve(__dirname, 'emailTemplates'),
  extName: '.hbs',
};

transporter.use('compile', handlebars(handlebarOptions));

function sendAdminAlert(type, options = {}) {
  let body = '';
  let subject = '';

  switch(type) {
    case 'redisThresholdReached': 
      body = options.times 
        ? `REDIS SERVER DOWN. 24 hour threshold reached. Further retries will be attempted every 24 hours. Please check the Redis server to ensure that caching and queueing services are operational.`
        : `REDIS SERVER DOWN. This is the ${options.times} attempt. Please fix the Redis server to ensure that caching and queueing services are operational.`;
      subject = '[URGENT] Redis Server Down';
      break;

    case 'redisDisconnectedInitial': 
      body = `REDIS SERVER DISCONNECTED. Will retry with an exponential backoff for 24 hours. Please check the Redis server to ensure that caching and queueing services are operational.`;
      subject = '[URGENT] Redis Server Disconnected';
      break;

    case 'redisReconnected': 
      body = `The Redis client has reconnected to the Redis server. Please check the Redis server to ensure that caching and queueing services are operational.`;
      subject = '[INFO] Redis Server Reconnected';
      break;

    case 'serverDown': 
      body = `The server is down. This can be because of a variety of reasons (MongoDB could be down, Calendly webhook or some other reason). Please check the server to ensure that all services are operational.`;
      subject = '[URGENT] Server Down';
      break;

    default:
      throw new Error('Invalid alert type');
  }

  const mailOptions = {
    from: 'admin@fatimanaqvi.com',
    to: process.env.DEV_EMAIL,
    subject,
    text: body,
  };

  logger.debug('Sending email alert to admin:', body);
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      logger.error("Error sending email alert:", error);
    } else {
      logger.info('Message sent:', info.messageId);
    }
  });
}


module.exports = {transporter, sendAdminAlert};