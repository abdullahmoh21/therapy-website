require('dotenv').config();
const express = require('express');
const app = express(); 
const path = require('path');
const fs = require('fs');
const https = require('https'); 
const mongoose = require('mongoose');
const helmet = require('helmet'); // Security middleware
const requestLogger = require('./middleware/requestLogger'); 
const errorHandler  = require('./middleware/errorHandler');
const credentials = require('./middleware/credentials');
const requireHttps = require('./middleware/requireHttps');
const compression = require('compression');
const connectDB = require('./utils/connectDB');
const connectCalendly = require('./utils/connectCalendly');
const conditionalRateLimiter = require('./middleware/rateLimits/fifteenRequestPerMin');
const checkBlocked = require('./middleware/rateLimits/checkBlocked');
const { deleteOldBookingsAndPayments } = require('./controllers/bookingController');
const cron = require('node-cron');
const logger = require('./logs/logger');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 3200;

// SSL/TLS certificate options
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '/config/key.pem')), 
  cert: fs.readFileSync(path.join(__dirname, './config/cert.pem')) 
};

connectDB();

// Security Headers
app.use(helmet.hsts({ // HTTP Strict Transport Security (HSTS)
  maxAge: 15552000, 
  includeSubDomains: true, 
  preload: true
}));

app.use(
  helmet.contentSecurityPolicy({ // CSP configuration ere
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google-analytics.com"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.google-analytics.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
    reportOnly: false,
  })
);


//----------------- MIDDLEWARE ------------------//
app.use(checkBlocked); // exit if ip is blocked
app.use(conditionalRateLimiter);  // Rate limit certain endpoints 
app.use(requireHttps);
app.use(compression());
app.use(express.json({ limit: '10kb' }));  
app.use(express.urlencoded({ extended: true, limit: '10kb' }));  
app.use(cookieParser());  
app.use(requestLogger);
app.use(credentials)
app.use(cors(corsOptions)); 
// ----------------------------------------------//



//----------------- ENDPOINTS------------------//
app.use('/auth', require('./endpoints/authEndpoints'));
app.use('/users', require('./endpoints/userEndpoints'));
app.use('/bookings', require('./endpoints/bookingEndpoints'));
app.use('/payments', require('./endpoints/paymentEndpoints'));
// ---------------------------------------------//


// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't match one above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Error handler
app.use(errorHandler); 

// Will run every Sunday at 3:30 AM
cron.schedule('30 3 * * 0', () => {
  deleteOldBookingsAndPayments();
});

let server;
mongoose.connection.on('open', async () => { // Only listens if db is open and the webhook is live
  try {
    const webhookLive = await connectCalendly(); 
    if (webhookLive) {
      console.log('Mongoose connected and webhook is live');
      // Create HTTPS server
      server = https.createServer(sslOptions, app).listen(PORT, () => {
        console.log(`Server running on port ${PORT} with HTTPS`);
      });
    } else {
      console.error('Webhook is not live. Server startup aborted.');
    }
  } catch (error) {
    console.error('Failed to connect Calendly or check webhook status:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  if (server) {
    server.close(() => {
      logger.info('Received SIGINT. Shutting down gracefully.');
      // Ensure the process exits after the server is closed
      process.exit(0);
    });
  } else {
    logger.info('Server not running.');
    process.exit(0);
  }
});

mongoose.connection.on('error', (err) => {
  console.log(err)
  logger.error(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 'mongoErrLog.txt')
})