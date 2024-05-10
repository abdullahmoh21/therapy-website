const express = require('express');
const router = express.Router();
const forgotPasswordController = require('../controllers/forgotPasswordController');

router.post('/', forgotPasswordController.handleForgottenPwd);

router.post('/:token', forgotPasswordController.handleResetPwd);

module.exports = router;