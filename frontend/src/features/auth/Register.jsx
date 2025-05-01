import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Joi from "joi";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRegisterMutation } from "./authApiSlice";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useLocation, useNavigate } from "react-router-dom";

//Data validation
const validPhone = Joi.string().custom((value, helpers) => {
  //default pakistan if no country code is provided
  const phoneNumber = parsePhoneNumberFromString(value, "PK");
  let phoneString = value;
  if (!phoneNumber) {
    return helpers.message("Invalid phone number. Format: +9234567890");
  }
  if (!phoneNumber.isValid()) {
    return helpers.message("Invalid phone number. Format: +9234567890");
  }
  // add +92. 03082182121 => +923082182121
  if (!value.startsWith("+")) {
    //remove leading 0
    phoneString = value.replace(/^0/, "");
    phoneString = "+92" + phoneString;
  }
  console.log(`phone no: ${value}`);
  return phoneString;
}, "Phone number validation");

const schema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "Full Name is required",
  }),
  //joi browser does not support tlds so we set it to false
  email: Joi.string().email({ tlds: false }).required().messages({
    "string.email": "Invalid Email. Please enter a valid email address",
    "string.empty": "Email is required",
  }),
  phone: validPhone.required().messages({
    "string.empty": "Phone number is required",
  }),
  //password with at least 8 characters, one lowercase, one uppercase, one digit, and one special character
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

  const [
    register,
    {
      isSuccess: registered,
      error: registerError,
      isLoading: registerIsLoading,
      status: registerStatus,
    },
  ] = useRegisterMutation();

  const urlParams = new URLSearchParams(location.search);
  const invitationToken = urlParams.get("invitation");
  const email = urlParams.get("email");

  //on component mount, check for invitation token
  useEffect(() => {
    if (invitationToken && email) {
      setForm({
        ...form,
        email,
        token: invitationToken,
      });
    } else {
      // Redirect if no invitation token is present
      toast.error("Valid invitation is required to register.");
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevState) => ({
      ...prevState,
      [name]: name === "phone" ? value.replace(/\s/g, "") : value, // Remove whitespace from phone number
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submit
    //data validation
    const { error, value } = schema.validate(form);
    if (error?.details[0]?.message) {
      toast.error(error.details[0].message);
      return;
    }
    const { phone: phoneString } = value;
    console.log(`phoneString in handleSubmit: ${phoneString}`);
    try {
      // Send to backend
      await register({ ...form, phone: phoneString }).unwrap(); //replace phone with correctly formatted phone number
      toast.success(
        "Registration successful. Please check your email to verify your account."
      );
      setTimeout(() => {
        navigate("/signin");
      }, 3000);
    } catch (err) {
      console.log(err);
      if (err.status === 400) {
        toast.error(err.data.message);
      } else if (err.status === 500) {
        toast.error("An error occurred. Please try again later.");
      } else if (err.status === 409) {
        //could be phone or email so message is set in the backend
        toast.error(err.data.message);
      } else {
        toast.error(
          "Could not connect to the server. Please check your internet connection and try again."
        );
      }
    }
  };

  if (!invitationToken || !email) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-200">
        <div className="bg-white p-10 rounded-lg shadow-md w-96 text-center">
          <h1 className="text-2xl mb-4">Invalid Invitation</h1>
          <p className="mb-4">
            You need a valid invitation to create an account.
          </p>
          <p className="mb-4">
            Please contact an administrator if you believe this is an error.
          </p>
          <button
            className="bg-blue-500 text-white p-2 rounded-md"
            onClick={() => navigate("/")}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gray-200">
      <div className="bg-white p-10 rounded-lg shadow-md w-96">
        <h2 className="text-2xl mb-4">Create your account</h2>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            className="border border-gray-300 p-2 w-full mb-3 rounded-md"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            className="border border-gray-300 p-2 w-full mb-3 rounded-md"
            type="email"
            name="email"
            value={form.email}
            autoComplete="email"
            onChange={handleChange}
            readOnly
          />
          <label className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            className="border border-gray-300 p-2 w-full mb-3 rounded-md"
            type="tel"
            name="phone"
            value={form.phone}
            autoComplete="tel"
            onChange={handleChange}
            required
          />
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            className="border border-gray-300 p-2 w-full mb-3 rounded-md"
            type="password"
            name="password"
            value={form.password}
            autoComplete="new-password"
            onChange={handleChange}
            onPaste={(e) => e.preventDefault()}
            required
          />
          <label className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            className="border border-gray-300 p-2 w-full mb-3 rounded-md"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            autoComplete="new-password"
            onChange={handleChange}
            onPaste={(e) => e.preventDefault()}
            required
          />
          <label className="block text-sm font-medium text-gray-700">
            Date of Birth
          </label>
          <input
            className="border border-gray-300 p-2 w-full mb-3 rounded-md lp-ignore"
            type="date"
            name="DOB"
            value={form.DOB}
            autoComplete="off"
            data-lpignore="true"
            onChange={handleChange}
            max={
              //  DOB's above 11 years old
              new Date(new Date().setFullYear(new Date().getFullYear() - 11))
                .toISOString()
                .split("T")[0]
            }
            required
          />
          <input type="hidden" name="token" value={form.token} />
          <button
            className="bg-blue-500 text-white p-2 w-full rounded-md"
            type="submit"
          >
            {registerIsLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div className="spinner"></div>
              </div>
            ) : (
              "Register"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
