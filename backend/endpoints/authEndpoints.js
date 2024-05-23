const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const loginLimiter = require('../middleware/loginLimiter')
const expressJoiValidation = require('express-joi-validation').createValidator({});
const { loginSchema } = require('../validation/usersValidation');
const { userSchema } = require('../validation/usersValidation');


router.route('/')
    //loginLimiter to prevent brute force 
    .post(expressJoiValidation.body(loginSchema),loginLimiter, authController.login) 
router.route('/refresh')
    .get(authController.refresh)              

router.route('/logout')
    .post(authController.logout)

router.route('/register')
.post(expressJoiValidation.body(userSchema), authController.register)      

//formats any joi error into JSON for the client
router.use((err, req, res, next) => {
    if (err?.error?.isJoi) {
        console.log(`In Joi middleware: ${err.error}`)
        return res.status(400).json({
            type: err.type,
            message: err.error.details[0].message,
            context: err.error.details[0].context
        });
    } else {
        next(err);
    }
});
    
module.exports = router