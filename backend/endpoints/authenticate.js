const express = require('express');
const router = express.Router();
const authorizeController = require('../controllers/authenticateController');

router.post('/', authorizeController.handleLogin);

module.exports = router;