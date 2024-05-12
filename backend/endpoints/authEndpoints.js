const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const loginLimiter = require('../middleware/loginLimiter')

router.route('/')
    //loginLimiter to prevent brute force 
    .post(loginLimiter, authController.login) //tested
router.route('/refresh')
    .get(authController.refresh)              //tested

router.route('/logout')
    .post(authController.logout)

module.exports = router