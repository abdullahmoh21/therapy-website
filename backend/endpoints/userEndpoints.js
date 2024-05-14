const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyJWT = require('../middleware/verifyJWT');
const expressJoiValidation = require('express-joi-validation').createValidator({})

// Import validation schemas
const { userSchema, updateUser, emailSchema, resetPasswordSchema, tokenSchema } = require('../validation/usersValidation');

//open routes
router.route('/verifyEmail/:token')
    .get(expressJoiValidation.params(tokenSchema), userController.verifyEmail)             //Tested
    
router.route('/forgotPassword/:token')           
    .post(expressJoiValidation.params(resetPasswordSchema), userController.resetPassword)  //Tested

router.route('/forgotPassword')                  
    .post(expressJoiValidation.body(emailSchema), userController.forgotPassword)           //Tested

router.route('/')
    .post(expressJoiValidation.body(userSchema), userController.createNewUser)           //Tested

router.use(verifyJWT)   

//protected routes
router.route('/')
    .get(userController.getAllUsers_ADMIN)        //Tested
    .delete(expressJoiValidation.body(emailSchema), userController.deleteUser_ADMIN)      //Tested

    
router.route('/me')
    .get(userController.getMyData)        //Tested
    .patch(expressJoiValidation.body(updateUser), userController.updateMyUser)   //Tested


module.exports = router;