const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyJWT = require('../middleware/verifyJWT');
const expressJoiValidation = require('express-joi-validation').createValidator({})

// Import validation schemas
const { updateMyUser, emailSchema, passwordSchema, tokenOrEmailSchema, tokenSchema } = require('../utils/validationSchemas');

//open routes
router.route(`/resendEmailVerification`)
    .post(expressJoiValidation.body(tokenOrEmailSchema), userController.resendEvLink)

router.route('/verifyEmail')//?token=tokenString
    .get(expressJoiValidation.query(tokenSchema), userController.verifyEmail)            
    
router.route('/resetPassword')//?token=tokenString            
    .post(
        expressJoiValidation.body(passwordSchema),  //password is in the body
        expressJoiValidation.query(tokenSchema),   //token is in the URL
        userController.resetPassword)  

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