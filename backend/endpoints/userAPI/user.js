const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/userController.js');

router.route('/me')
    .get(usersController.getMyData)
    .put(usersController.updateMyData);

module.exports = router;