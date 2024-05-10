const express = require('express');
const router = express.Router();
const verifyEmailController = require('../controllers/verifyEmailController');

router.get('/:token', verifyEmailController.handleVerification);

module.exports = router;