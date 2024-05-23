const Joi = require('joi');
const ROLES_LIST = require('../config/roles_list');
const phonevalidator = require("libphonenumber-js");

const validPhone = Joi.string().custom((value, helpers) => {
  if (!phonevalidator(value)?.isValid()) {
    return helpers.message("Phone number must be a valid international number");
  }
  return value;
}, "Phone number validation");

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9#$%^&*()_+!]{8,30}$')).required(),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().label('Confirm password').messages({'any.only': 'Passwords do not match'}),
    name: Joi.string().min(3).max(30).required(),
    role: Joi.number().valid(ROLES_LIST.Admin, ROLES_LIST.User),
    phone: validPhone.required().messages({
        "string.empty": "Phone number is required",
      }),
    DOB: Joi.date().iso().max(new Date(new Date().setFullYear(new Date().getFullYear() - 11))),  //allow users above 11 years old
    eventEndTime: Joi.string().required(),
    eventStartTime: Joi.string().required(),
    eventType: Joi.string().required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9#$%^&*()_+!]{8,30}$')).required()
});

const updateMyUser = Joi.object({
    name: Joi.string().min(3).max(30),
    phone: validPhone.required().messages({
        "string.empty": "Phone number is required",
      }),
    DOB: Joi.date().iso()
});

// for route: /forgotPassword and /deleteUser_ADMIN
const emailSchema = Joi.object({
    email: Joi.string().email().required()
});

// for route: /forgotPassword:token 
const resetPasswordSchema = Joi.object({
    token: Joi.string().length(40).required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9#$%^&*()_+!]{8,30}$')).required()
});

// for route: /verifyEmail/:token
const tokenSchema = Joi.object({
    token: Joi.string().length(40).required()
});

module.exports = {
    userSchema,
    updateMyUser,
    emailSchema,
    resetPasswordSchema,
    tokenSchema,
    loginSchema
}