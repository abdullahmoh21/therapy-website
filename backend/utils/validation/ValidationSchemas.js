const Joi = require('joi');
const ROLES_LIST = require('../../config/roles_list');
const phonevalidator = require("libphonenumber-js");

const validPhone = Joi.string().custom((value, helpers) => {
  if (!phonevalidator(value)?.isValid()) {
    return helpers.message("Phone number must be a valid international number");
  }
  return value;
}, "Phone number validation");

//for route: /auth/register
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

//for route /auth
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9#$%^&*()_+!]{8,30}$')).required()
});

// for route: /users/updateMyUser
const updateMyUser = Joi.object({
    name: Joi.string().min(3).max(30),
    phone: validPhone.messages({
        "string.empty": "Phone number is required",
      }),
    DOB: Joi.date().iso()
});

// for route: /forgotPassword and /deleteUser_ADMIN
const emailSchema = Joi.object({
    email: Joi.string().email().required()
});


// for route: /users/verifyEmail
const tokenOrEmailSchema = Joi.alternatives().try(
  Joi.object({ token: Joi.string().length(40).required() }).unknown(),
  Joi.object({ email: Joi.string().email().required() }).unknown()
);

const tokenSchema = Joi.object({
  token: Joi.string().length(40).required()
});

const passwordSchema = Joi.object({
  password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9#$%^&*()_+!]{8,30}$')).required(),
  confirmPassword: Joi.any().valid(Joi.ref('password')).required().label('Confirm password').messages({'any.only': 'Passwords do not match'}),
});

// for route: /contactMe
const ContactMeSchema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    phone: validPhone,
    message: Joi.string().min(10).max(500).required(),
    type: Joi.string().required()
});

module.exports = {
    userSchema,
    updateMyUser,
    emailSchema,
    passwordSchema,
    tokenSchema,
    tokenOrEmailSchema,
    loginSchema,
    ContactMeSchema
}