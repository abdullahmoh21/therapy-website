const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyJWT = require('../middleware/verifyJWT');



router.route('/verifyEmail/:token')
    .get(userController.verifyEmail)             //Tested

router.route('/forgotPassword')
    .post(userController.forgotPassword)

router.route('/forgotPassword/:token')
    .post(userController.resetPassword)

router.use(verifyJWT)   //all routes below this line require a valid JWT

router.route('/')
    .get(userController.getAllUsers_ADMIN)    //Tested
    .post(userController.createNewUser)       //Tested
    .patch(userController.updateUser_ADMIN)   //
    .delete(userController.deleteUser_ADMIN)  //
    
router.route('/me')
    .get(userController.getMyData)        //Tested
    .patch(userController.updateMyUser)  //Tested


module.exports = router;