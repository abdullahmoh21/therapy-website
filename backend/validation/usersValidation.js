const Joi = require('joi');

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required(),
    name: Joi.string().min(3).max(30).required(),
    role: Joi.number(),
    phone: Joi.string().regex(/^[0-9]{10}$/).messages({'string.pattern.base': `Phone number must have 10 digits.`}),
    DOB: Joi.date().iso()
});

const updateUser = Joi.object({
    email: Joi.string().email(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).min(8).max(30),
    name: Joi.string().min(3).max(30),
    role: Joi.number(),
    phone: Joi.string().regex(/^[0-9]{10}$/).messages({'string.pattern.base': `Phone number must have 10 digits.`}),
    DOB: Joi.date().iso()
});

// for route: /forgotPassword and /deleteUser_ADMIN
const emailSchema = Joi.object({
    email: Joi.string().email().required()
});

// for route: /forgotPassword:token 
const resetPasswordSchema = Joi.object({
    token: Joi.string().length(40).required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required()
});

// for route: /verifyEmail/:token
const tokenSchema = Joi.object({
    token: Joi.string().length(40).required()
});

module.exports = {
    userSchema,
    updateUser,
    emailSchema,
    resetPasswordSchema,
    tokenSchema
}