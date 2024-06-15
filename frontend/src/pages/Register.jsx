import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Joi from "joi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRegisterMutation } from "../features/auth/authApiSlice";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useLocation } from "react-router-dom";

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
  eventEndTime: Joi.string().required().messages({
    "string.empty":
      "Are you sure you booked a consultation bofore signing up?w",
  }),
  eventStartTime: Joi.string().required().messages({
    "string.empty": "Are you sure you booked a consultation bofore signing up?",
  }),
  eventType: Joi.string().required().messages({
    "string.empty":
      "Are you sure you booked a consultation bofore signing up? ",
  }),
});

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    DOB: "",
    eventEndTime: "",
    eventStartTime: "",
    eventType: "",
  });
  const [bookingDetails, setBookingDetails] = useState({
    BookingId: "",
    eventEndTime: "",
    eventStartTime: "",
    eventType: "",
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
  const name = urlParams.get("invitee_full_name");
  const email = urlParams.get("invitee_email");
  const phone = urlParams.get("answer_1");
  const eventEndTime = urlParams.get("event_end_time");
  const eventStartTime = urlParams.get("event_start_time");
  const eventType = urlParams.get("event_type_name");

  //on component mount, set the form values to the query params
  useEffect(() => {
    if (name && email && phone) {
      setForm({
        ...form,
        name,
        email,
        phone: phone.replace(/\s/g, ""),
        eventEndTime,
        eventStartTime,
        eventType,
      });
    } else {
      //redirect to booking page if query params are missing?
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
      toast.success("Registration successful. Please sign in.");
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

  if (!name || !email || !phone) {
    return (
      <div>
        <h1>How to create an account</h1>
        <p>Follow the instructions...</p>
        <a href="https://calendly.com/your-booking-link">Book a consultation</a>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-gray-200">
      <ToastContainer />
      <div className="bg-white p-10 rounded-lg shadow-md w-96">
        <h2 className="text-2xl mb-4">
          {/* Your free consultation is booked for{" "}
          {format(new Date(eventStartTime), "do MMMM yyyy, h:mm a")} */}
          Please create an Account to confirm your booking
        </h2>
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
          />
          <input
            type="hidden"
            name="eventEndTime"
            value={form.eventEndTime}
            autoComplete="off"
          />
          <input
            type="hidden"
            name="eventStartTime"
            value={form.eventStartTime}
            autoComplete="off"
          />
          <input
            type="hidden"
            name="eventType"
            value={form.eventType}
            autoComplete="off"
          />
          <input type="hidden" name="eventType" value={form.eventType} />
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
