import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import Joi from "joi";
import { useRegisterMutation } from "./authApiSlice";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "../../assets/images/logo.webp";
import wave from "../../assets/images/wave.webp";

/* ------------------------- validation helpers ------------------------- */
const validPhone = Joi.string().custom((value, helpers) => {
  const cleanedValue = value.replace(/[^\d+]/g, "");

  // Ensure it starts with +
  if (!cleanedValue.startsWith("+")) {
    return helpers.message(
      "Phone number must start with + followed by country code"
    );
  }

  // Simple check for reasonable length (international numbers are typically 7-15 digits plus country code)
  if (cleanedValue.length < 8) {
    return helpers.message("Phone number is too short");
  }
  if (cleanedValue.length > 16) {
    return helpers.message("Phone number is too long");
  }

  // Use the library for additional validation if available
  try {
    const phoneNumber = parsePhoneNumberFromString(cleanedValue);
    if (phoneNumber && !phoneNumber.isValid()) {
      return helpers.message(
        "Invalid phone number format. Please check country code and number"
      );
    }
  } catch (error) {
    // If parsing fails, we'll rely on our basic validation
  }

  return cleanedValue;
}, "Phone number validation");

const schema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "Full Name is required",
  }),
  email: Joi.string().email({ tlds: false }).required().messages({
    "string.email": "Invalid Email. Please enter a valid email address",
    "string.empty": "Email is required",
  }),
  phone: validPhone.required().messages({
    "string.empty": "Phone number is required",
  }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.empty": "Password is required",
    })
    .concat(
      Joi.string()
        .pattern(new RegExp("(?=.*[a-z])"), "lowercase")
        .message("Password must contain at least one lowercase letter")
    )
    .concat(
      Joi.string()
        .pattern(new RegExp("(?=.*[A-Z])"), "uppercase")
        .message("Password must contain at least one uppercase letter")
    )
    .concat(
      Joi.string()
        .pattern(new RegExp("(?=.*\\d)"), "digit")
        .message("Password must contain at least one digit")
    )
    .concat(
      Joi.string()
        .pattern(new RegExp("(?=.*[!@#$%*()_+^])"), "special")
        .message("Password must contain at least one special character")
    ),
  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .label("Confirm password")
    .messages({
      "any.only": "Passwords do not match",
      "string.empty": "Please confirm your Password",
    }),
  DOB: Joi.date().less("now").required().messages({
    "date.base": "Date of birth must be a valid date",
    "date.less": "Date of birth must be in the past",
    "string.empty": "DOB is required",
  }),
  token: Joi.string().required().messages({
    "string.empty": "Invitation token is required",
  }),
});

/* ------------------------------ component ----------------------------- */
const SignUp = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    DOB: "",
    token: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [signUp, { isLoading: signUpIsLoading }] = useRegisterMutation();

  const urlParams = new URLSearchParams(location.search);
  const invitationToken = urlParams.get("invitation");
  const email = urlParams.get("email");

  // Reference for the phone input
  const phoneInputRef = useRef(null);

  // Flag to track if the prefix is already showing
  const [phoneHasPrefix, setPhoneHasPrefix] = useState(false);

  /* -------- pre-fill email / token if present in invitation link ------- */
  useEffect(() => {
    if (invitationToken && email) {
      setForm((prev) => ({ ...prev, email, token: invitationToken }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize phone with + prefix only
  useEffect(() => {
    if (!form.phone && !phoneHasPrefix) {
      setForm((prev) => ({ ...prev, phone: "+" }));
      setPhoneHasPrefix(true);
    }
  }, [form.phone, phoneHasPrefix]);

  const validateField = (name, value) => {
    const fieldSchema = schema.extract(name);
    const { error } = fieldSchema.validate(value);
    return error ? error.details[0].message : null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "phone") {
      // Special handling for phone input
      let phoneValue = value;

      // Ensure the + sign remains at the beginning
      if (!phoneValue.startsWith("+")) {
        phoneValue = "+" + phoneValue.replace(/^\+/, "");
      }

      processedValue = phoneValue;
    }

    // Update form state
    setForm((prev) => ({ ...prev, [name]: processedValue }));

    // Clear errors for this field and validate in real-time
    setErrors((prev) => ({ ...prev, [name]: null }));
    setServerError("");

    // Real-time validation for certain fields
    if (name === "confirmPassword" && form.password) {
      if (processedValue !== form.password) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      }
    } else if (name === "password" && form.confirmPassword) {
      if (form.confirmPassword !== processedValue) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: null }));
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let validationValue = value;

    if (name === "phone") {
      validationValue = value.replace(/\s/g, "");
    }

    const error = validateField(name, validationValue);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Special handling for phone input keydown - only protect the + sign
  const handlePhoneKeyDown = (e) => {
    // Prevent deleting the "+" prefix only
    if (
      e.key === "Backspace" &&
      (e.target.selectionStart <= 1 ||
        (e.target.selectionStart === e.target.selectionEnd &&
          e.target.selectionStart <= 1))
    ) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");

    // Clean up phone format before validation
    const submissionForm = {
      ...form,
      phone: form.phone.replace(/\s/g, ""),
    };

    const { error, value } = schema.validate(submissionForm, {
      abortEarly: false,
    });

    if (error) {
      const newErrors = {};
      error.details.forEach((detail) => {
        newErrors[detail.path[0]] = detail.message;
      });
      setErrors(newErrors);
      return;
    }

    const { phone: phoneString } = value;
    try {
      await signUp({ ...submissionForm, phone: phoneString }).unwrap();
      setSuccessMessage(
        "Registration successful! Please check your email to verify your account."
      );
      setTimeout(() => navigate("/signin"), 3000);
    } catch (err) {
      /* -------- map error codes to friendly messages -------- */
      const msg =
        err?.data?.message ||
        {
          400: "Bad request. Please check your information and try again.",
          409: "An account with this email already exists.",
          500: "Server error. Please try again later.",
        }[err?.status] ||
        "Could not connect. Please check your internet connection.";
      setServerError(msg);
    }
  };

  /* ----------------- Invitation missing: show info screen -------------- */
  if (!invitationToken || !email) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-whiteBg overflow-hidden">
        {/* wave background */}
        <img
          src={wave}
          alt="decorative wave"
          className="absolute bottom-0 left-0 w-full h-[260px] object-cover -z-10 pointer-events-none"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px] bg-white p-10 rounded-3xl shadow-xl text-center"
        >
          <img src={logo} alt="logo" height={60} width={135} />
          <h1 className="mb-4 text-2xl font-bold text-orangeText">
            Invitation Required
          </h1>
          <p className="mb-6 text-textColor">
            You need a valid invitation to create an account. Please contact an
            administrator if you believe this is an error.
          </p>
          <button
            onClick={() => navigate("/")}
            className="rounded-full border-2 border-buttonTextBlack bg-orangeButton px-10 py-3 font-semibold text-buttonTextBlack shadow-md transition-transform duration-300 hover:scale-105 hover:bg-lightPink"
          >
            Return Home
          </button>
        </motion.div>
      </div>
    );
  }

  /* ----------------------------- main form ----------------------------- */
  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-gradient-to-b from-[#fff7f4] to-[#ffe5d5] py-8">
      {/* background wave, sent behind content */}
      <img
        src={wave}
        alt="decorative wave"
        className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[260px] w-full object-cover"
      />

      <div className="flex items-center justify-center min-h-full px-4">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-[500px] rounded-3xl bg-white/90 backdrop-blur-sm p-8 shadow-2xl"
        >
          <div className="mb-8 flex flex-col items-center">
            <img src={logo} alt="logo" height={60} width={135} />
            <h1 className="text-center text-2xl pt-2 font-bold leading-tight text-orangeText">
              Create Your Account
            </h1>
          </div>

          {/* Server Error Message */}
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{serverError}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* --- Full Name --- */}
            <label className="flex flex-col text-sm font-medium text-textColor">
              Full Name
              <input
                className={`mt-1 w-full border-b-2 bg-transparent py-2 outline-none transition-colors ${
                  errors.name
                    ? "border-red-500 focus:border-red-500"
                    : "border-textColor focus:border-orangeText"
                }`}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              {errors.name && (
                <span className="mt-1 text-xs text-red-500">{errors.name}</span>
              )}
            </label>

            {/* --- Email --- */}
            <label
              className="flex flex-col text-sm font-medium text-textColor"
              htmlFor="email-field"
            >
              Email
              <input
                id="email-field"
                className="mt-1 w-full cursor-not-allowed border-b-2 border-textColor bg-transparent py-2 outline-none"
                type="email"
                name="email"
                value={form.email}
                readOnly
                autoComplete="username email"
              />
            </label>

            {/* --- Phone --- */}
            <label className="flex flex-col text-sm font-medium text-textColor">
              Phone
              <input
                className={`mt-1 w-full border-b-2 bg-transparent py-2 outline-none transition-colors ${
                  errors.phone
                    ? "border-red-500 focus:border-red-500"
                    : "border-textColor focus:border-orangeText"
                }`}
                type="tel"
                name="phone"
                value={form.phone}
                autoComplete="tel"
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handlePhoneKeyDown}
                ref={phoneInputRef}
                placeholder="+[country code] phone number"
                required
              />
              {errors.phone ? (
                <span className="mt-1 text-xs text-red-500">
                  {errors.phone}
                </span>
              ) : (
                <span className="mt-1 text-xs text-gray-500">
                  Example: +92 for Pakistan, +1 for USA, +44 for UK, etc.
                </span>
              )}
            </label>

            {/* --- Password --- */}
            <label
              className="flex flex-col text-sm font-medium text-textColor"
              htmlFor="password-field"
            >
              Password
              <input
                id="password-field"
                className={`mt-1 w-full border-b-2 bg-transparent py-2 outline-none transition-colors ${
                  errors.password
                    ? "border-red-500 focus:border-red-500"
                    : "border-textColor focus:border-orangeText"
                }`}
                type="password"
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                onPaste={(e) => e.preventDefault()}
                required
              />
              {errors.password && (
                <span className="mt-1 text-xs text-red-500">
                  {errors.password}
                </span>
              )}
            </label>

            {/* --- Confirm Password --- */}
            <label
              className="flex flex-col text-sm font-medium text-textColor"
              htmlFor="confirm-password-field"
            >
              Confirm Password
              <input
                id="confirm-password-field"
                className={`mt-1 w-full border-b-2 bg-transparent py-2 outline-none transition-colors ${
                  errors.confirmPassword
                    ? "border-red-500 focus:border-red-500"
                    : "border-textColor focus:border-orangeText"
                }`}
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                autoComplete="new-password"
                onChange={handleChange}
                onBlur={handleBlur}
                onPaste={(e) => e.preventDefault()}
                required
              />
              {errors.confirmPassword && (
                <span className="mt-1 text-xs text-red-500">
                  {errors.confirmPassword}
                </span>
              )}
            </label>

            {/* --- Date of Birth --- */}
            <label className="flex flex-col text-sm font-medium text-textColor">
              Date of Birth
              <input
                className={`mt-1 w-full border-b-2 bg-transparent py-2 outline-none transition-colors ${
                  errors.DOB
                    ? "border-red-500 focus:border-red-500"
                    : "border-textColor focus:border-orangeText"
                }`}
                type="date"
                name="DOB"
                value={form.DOB}
                data-lpignore="true"
                onChange={handleChange}
                onBlur={handleBlur}
                max={
                  new Date(
                    new Date().setFullYear(new Date().getFullYear() - 11)
                  )
                    .toISOString()
                    .split("T")[0]
                }
                required
              />
              {errors.DOB && (
                <span className="mt-1 text-xs text-red-500">{errors.DOB}</span>
              )}
            </label>

            <input type="hidden" name="token" value={form.token} />

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center rounded-full border-2 border-buttonTextBlack bg-orangeButton py-3 font-semibold text-buttonTextBlack shadow-md transition-transform duration-300 hover:bg-lightPink disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={signUpIsLoading}
            >
              {signUpIsLoading ? (
                <div className="spinner h-5 w-5 animate-spin rounded-full border-4 border-t-transparent" />
              ) : (
                "SignUp"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUp;
