const logger = require('../logs/logger');

const requireHttps = (req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      next();
    } else {
      res.redirect('https://' + req.hostname + req.url);
    }
}

module.exports = requireHttps;