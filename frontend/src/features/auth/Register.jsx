import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Joi from "joi";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRegisterMutation } from "./authApiSlice";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "../../assets/images/logo.webp";
import wave from "../../assets/images/wave.webp";

/* ------------------------- validation helpers ------------------------- */
const validPhone = Joi.string().custom((value, helpers) => {
  const phoneNumber = parsePhoneNumberFromString(value, "PK");
  let phoneString = value;
  if (!phoneNumber) {
    return helpers.message("Invalid phone number. Format: +9234567890");
  }
  if (!phoneNumber.isValid()) {
    return helpers.message("Invalid phone number. Format: +9234567890");
  }
  if (!value.startsWith("+")) {
    phoneString = value.replace(/^0/, "");
    phoneString = "+92" + phoneString;
  }
  return phoneString;
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
const Register = () => {
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

  const [register, { isLoading: registerIsLoading }] = useRegisterMutation();

  const urlParams = new URLSearchParams(location.search);
  const invitationToken = urlParams.get("invitation");
  const email = urlParams.get("email");

  /* -------- pre-fill email / token if present in invitation link ------- */
  useEffect(() => {
    if (invitationToken && email) {
      setForm((prev) => ({ ...prev, email, token: invitationToken }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? value.replace(/\s/g, "") : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error, value } = schema.validate(form);
    if (error?.details[0]?.message) {
      toast.error(error.details[0].message);
      return;
    }
    const { phone: phoneString } = value;
    try {
      await register({ ...form, phone: phoneString }).unwrap();
      toast.success(
        "Registration successful. Please check your email to verify your account."
      );
      setTimeout(() => navigate("/signin"), 3000);
    } catch (err) {
      /* -------- map error codes to friendly messages -------- */
      const msg =
        err?.data?.message ||
        {
          400: "Bad request",
          409: "Conflict",
          500: "Server error. Please try again later.",
        }[err?.status] ||
        "Could not connect. Please check your internet connection.";
      toast.error(msg);
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
          <Link to="/" className="mb-6 inline-block">
            <img src={logo} alt="logo" height={60} width={135} />
          </Link>
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
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#fff7f4] to-[#ffe5d5] flex items-center justify-center">
      {/* background wave, sent behind content */}
      <img
        src={wave}
        alt="decorative wave"
        className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[260px] w-full object-cover"
      />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-[92%] max-w-[500px] rounded-3xl bg-white/90 backdrop-blur-sm p-8 shadow-2xl"
      >
        <div className="mb-8 flex flex-col items-center">
          <Link to="/" className="mb-4 inline-block">
            <img src={logo} alt="logo" height={60} width={135} />
          </Link>
          <h1 className="text-center text-2xl font-bold leading-tight text-orangeText">
            Create Your Account
          </h1>
        </div>

        {/* make the form scroll if screen is tiny */}
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-1"
        >
          {/* --- Full Name --- */}
          <label className="flex flex-col text-sm font-medium text-textColor">
            Full Name
            <input
              className="mt-1 w-full border-b-2 border-textColor bg-transparent py-2 outline-none transition-colors focus:border-orangeText"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          {/* --- Email --- */}
          <label className="flex flex-col text-sm font-medium text-textColor">
            Email
            <input
              className="mt-1 w-full cursor-not-allowed border-b-2 border-textColor bg-transparent py-2 outline-none"
              type="email"
              name="email"
              value={form.email}
              readOnly
            />
          </label>

          {/* --- Phone --- */}
          <label className="flex flex-col text-sm font-medium text-textColor">
            Phone
            <input
              className="mt-1 w-full border-b-2 border-textColor bg-transparent py-2 outline-none transition-colors focus:border-orangeText"
              type="tel"
              name="phone"
              value={form.phone}
              autoComplete="tel"
              onChange={handleChange}
              required
            />
          </label>

          {/* --- Password --- */}
          <label className="flex flex-col text-sm font-medium text-textColor">
            Password
            <input
              className="mt-1 w-full border-b-2 border-textColor bg-transparent py-2 outline-none transition-colors focus:border-orangeText"
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              onPaste={(e) => e.preventDefault()}
              required
            />
          </label>

          {/* --- Confirm Password --- */}
          <label className="flex flex-col text-sm font-medium text-textColor">
            Confirm Password
            <input
              className="mt-1 w-full border-b-2 border-textColor bg-transparent py-2 outline-none transition-colors focus:border-orangeText"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              autoComplete="new-password"
              onChange={handleChange}
              onPaste={(e) => e.preventDefault()}
              required
            />
          </label>

          {/* --- Date of Birth --- */}
          <label className="flex flex-col text-sm font-medium text-textColor">
            Date of Birth
            <input
              className="mt-1 w-full border-b-2 border-textColor bg-transparent py-2 outline-none transition-colors focus:border-orangeText"
              type="date"
              name="DOB"
              value={form.DOB}
              data-lpignore="true"
              onChange={handleChange}
              max={
                new Date(new Date().setFullYear(new Date().getFullYear() - 11))
                  .toISOString()
                  .split("T")[0]
              }
              required
            />
          </label>

          <input type="hidden" name="token" value={form.token} />

          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center rounded-full border-2 border-buttonTextBlack bg-orangeButton py-3 font-semibold text-buttonTextBlack shadow-md transition-transform duration-300 hover:bg-lightPink"
          >
            {registerIsLoading ? (
              <div className="spinner h-5 w-5 animate-spin rounded-full border-4 border-t-transparent" />
            ) : (
              "Register"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;
