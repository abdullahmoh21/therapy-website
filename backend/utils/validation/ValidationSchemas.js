const Joi = require("joi");
const phonevalidator = require("libphonenumber-js");

const validPhone = Joi.string().custom((value, helpers) => {
  if (!phonevalidator(value)?.isValid()) {
    return helpers.message("Phone number must be a valid international number");
  }
  return value;
}, "Phone number validation");

//for route: /auth/register
const baseSchema = {
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .required()
    .messages({
      "string.base": "Email must be a string",
      "string.empty": "Email is required",
      "string.email": "Email must be a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string()
    .pattern(new RegExp("^[a-zA-Z0-9#$%^&*()_+!]{8,30}$"))
    .required()
    .messages({
      "string.base": "Password must be a string",
      "string.empty": "Password is required",
      "string.pattern.base":
        "Password must be 8 to 30 characters long and can only include letters, numbers, and allowed special characters (#, $, %, ^, &, *, (, ), _, +, !)",
      "any.required": "Password is required",
    }),
  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .optional()
    .label("Confirm password")
    .messages({
      "any.only": "Passwords do not match",
    }),
  name: Joi.string().min(3).max(30).required().messages({
    "string.base": "Name must be a string",
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters",
    "string.max": "Name must be at most 30 characters",
    "any.required": "Name is required",
  }),
  role: Joi.string().valid("user", "admin").messages({
    "any.only": "Role must be one of the allowed values",
  }),
  phone: validPhone.required().messages({
    "string.base": "Phone number must be a string",
    "string.empty": "Phone number is required",
    "any.required": "Phone number is required",
  }),
  DOB: Joi.date()
    .required()
    .iso()
    .max(new Date(new Date().setFullYear(new Date().getFullYear() - 11)))
    .messages({
      "date.base": "DOB must be a valid date",
      "date.empty": "DOB is required",
      "any.required": "DOB is required",
      "date.format": "DOB must be in ISO 8601 format",
      "date.max": "You must be at least 11 years old",
    }), // Allow users above 11 years old
};

const schemaWithToken = Joi.object({
  ...baseSchema,
  token: Joi.string().length(40).required().messages({
    "string.base": "Token must be a string",
    "string.empty": "Token is required",
    "any.required": "Token is required",
    "string.length": "Token must be exactly 40 characters",
  }),
});

const schemaWithEvents = Joi.object({
  ...baseSchema,
  eventEndTime: Joi.string().required().messages({
    "string.base": "Event end time must be a string",
    "string.empty": "Event end time is required",
    "any.required": "Event end time is required",
  }),
  eventStartTime: Joi.string().required().messages({
    "string.base": "Event start time must be a string",
    "string.empty": "Event start time is required",
    "any.required": "Event start time is required",
  }),
  eventType: Joi.string().required().messages({
    "string.base": "Event type must be a string",
    "string.empty": "Event type is required",
    "any.required": "Event type is required",
  }),
});

const userSchema = Joi.alternatives().try(schemaWithToken, schemaWithEvents);

//for route /auth
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .required(),
  password: Joi.string().required(),
});

// for route: /users/updateMyUser
const updateMyUser = Joi.object({
  name: Joi.string().min(3).max(30),
  phone: validPhone.messages({
    "string.empty": "Phone number is required",
  }),
  DOB: Joi.date().iso(),
});

// for route: /forgotPassword and /deleteUser_ADMIN
const emailSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .required(),
});

// for route: /users/verifyEmail
const tokenOrEmailSchema = Joi.alternatives().try(
  Joi.object({ token: Joi.string().length(40).required() }).unknown(),
  Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
  }).unknown()
);

const tokenSchema = Joi.object({
  token: Joi.string().length(40).required(),
});

const passwordSchema = Joi.object({
  password: Joi.string()
    .pattern(new RegExp("^[a-zA-Z0-9#$%^&*()_+!]{8,30}$"))
    .required(),
  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .label("Confirm password")
    .messages({ "any.only": "Passwords do not match" }),
});

// for route: /contactMe
const ContactMeSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .required(),
  phone: validPhone,
  message: Joi.string().min(10).max(500).required(),
  type: Joi.string().required(),
});

module.exports = {
  userSchema,
  updateMyUser,
  emailSchema,
  passwordSchema,
  tokenSchema,
  tokenOrEmailSchema,
  loginSchema,
  ContactMeSchema,
};
