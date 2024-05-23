const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyJWT = require('../middleware/verifyJWT');
const expressJoiValidation = require('express-joi-validation').createValidator({})

// Import validation schemas
const { userSchema, updateMyUser, emailSchema, resetPasswordSchema, tokenSchema } = require('../validation/usersValidation');

//open routes
router.route(`/resendEmailVerification`)
    .get(expressJoiValidation.body(emailSchema), userController.resendEmailVerification)
router.route('/verifyEmail/:token')
    .get(expressJoiValidation.params(tokenSchema), userController.verifyEmail)            
    
router.route('/forgotPassword/:token')           
    .post(expressJoiValidation.params(resetPasswordSchema), userController.resetPassword)  

router.route('/forgotPassword')                  
    .post(expressJoiValidation.body(emailSchema), userController.forgotPassword)                 

router.use(verifyJWT)   

//protected routes
router.route('/')
    .get(userController.getAllUsers_ADMIN)        
    .delete(expressJoiValidation.body(emailSchema), userController.deleteUser_ADMIN)      

    
router.route('/me')
    .get(userController.getMyData)        
    .patch(expressJoiValidation.body(updateMyUser), userController.updateMyUser)   


module.exports = router;