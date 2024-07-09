const winston = require('winston');
const path = require('path');

// Define custom logging levels including 'http'
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    success: 4, 
    http: 5,    // for HTTP requests
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'magenta',
    debug: 'blue',
    success: 'green',
    http: 'cyan', // Added color for 'http' level
  },
};

// Custom format for HTTP requests
const httpLogFormat = winston.format.printf(({ level, message, timestamp }) => {
  if (level === 'http') {
    const [method, origin, url, statusCode, responseTime] = message.split(' ');
    // Padding the method to 7 characters wide, and origin to the length of the longest origin
    const methodPadded = method.padEnd(7, ' ');
    const originPadded = origin.padEnd(30, ' '); // Adjust based on your longest origin
    const urlPadded = url.padEnd(25, ' '); // Adjust based on your longest URL path
    const statusCodePadded = statusCode.padEnd(3, ' ');
    const responseTimeWithMs = `${responseTime}ms`.padEnd(8, ' '); // Assuming 'XXXXms' as the longest response time format
    return `${timestamp}\t${methodPadded}\t${originPadded}\t${urlPadded}\t${statusCodePadded}\t${responseTimeWithMs}`;
  }
  return `${timestamp} [${level}]: ${message}`;
});

const httpOnlyFilter = winston.format((info, opts) => {
  return info.level === 'http' ? info : false;
});


const logger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    httpLogFormat // Apply the custom HTTP log format
  ),
  transports: [

    // Console transport with custom format
    new winston.transports.Console({
      level: 'success',
      format: winston.format.combine(
        winston.format.colorize(),
      )
    }),

    // Separate Request log file transport for 'http' level with custom format
    new winston.transports.File({ 
      filename: 'logs/requests.log', 
      level: 'http',
      format: winston.format.combine(
        httpOnlyFilter(), // Filter to include only 'http' level messages
        httpLogFormat 
      )
    }),
    // Error log file transport
    new winston.transports.File({ filename: 'logs/errors.log', level: 'error' })
  ]
});

// Add colors to console output
winston.addColors(customLevels.colors);

module.exports = logger;