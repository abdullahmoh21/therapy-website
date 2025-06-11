import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Joi from "joi";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { useContactMeMutation } from "../../../features/users/usersApiSlice";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import "./ContactMe.css";

const validPhone = Joi.string().custom((value, helpers) => {
  // Remove any spaces or non-digit characters except +
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

  // Use the library for additional validation
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
  name: Joi.string().min(3).max(30).required().messages({
    "string.base": "Name must be a string",
    "string.empty": "Name cannot be empty",
    "string.min": "Name must be at least {#limit} characters long",
    "string.max": "Name must be less than {#limit} characters long",
    "any.required": "Name is a required field",
  }),
  phone: validPhone.required().messages({
    "string.empty": "Phone number is required",
    "any.required": "Phone number is a required field",
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Email must be a valid email address",
      "string.empty": "Email cannot be empty",
      "any.required": "Email is a required field",
    }),
  message: Joi.string().min(10).max(500).required().messages({
    "string.empty": "Message cannot be empty",
    "string.min": "Message must be at least {#limit} characters long",
    "string.max": "Message must be less than {#limit} characters long",
    "any.required": "Message is a required field",
  }),
  requestType: Joi.string()
    .valid("General", "Support", "Feedback")
    .required()
    .messages({
      "any.only": "Request type must be one of General, Support, Feedback",
      "any.required": "Request type is a required field",
    }),
});

const ContactMe = ({ closePopup }) => {
  const [contactMe, { isLoading }] = useContactMeMutation();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: joiResolver(schema),
    defaultValues: {
      phone: "+92", // Default to Pakistan country code
    },
  });

  // Reference for the phone input
  const phoneInputRef = useRef(null);

  // Flag to track if the prefix is already showing
  const [phoneHasPrefix, setPhoneHasPrefix] = useState(false);

  // Initialize phone with +92 prefix if not already set
  useEffect(() => {
    if (!phoneHasPrefix) {
      setValue("phone", "+92");
      setPhoneHasPrefix(true);
    }
  }, [setValue, phoneHasPrefix]);

  // Handle phone input to prevent deleting the + sign
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

  const requestTypes = [
    { label: "General Inquiry", value: "General" },
    { label: "Support", value: "Support" },
    { label: "Feedback", value: "Feedback" },
  ];

  const onSubmit = async (data) => {
    try {
      // Using await here to catch any errors
      const response = await contactMe({
        name: data.name,
        phone: data.phone,
        email: data.email,
        message: data.message,
        type: data.requestType,
      }).unwrap();

      // Display success message
      toast.success("Message sent successfully!");

      // Reset the form
      reset();

      // Close the popup if closePopup function is provided
      if (typeof closePopup === "function") {
        closePopup();
      }
    } catch (error) {
      if (error.status >= 400 && error.status < 500) {
        toast.error("Client error: Failed to send message");
      } else if (error.status >= 500) {
        toast.error("Server error: Failed to send message");
      }
    }
  };

  return (
    <div className="w-full h-full bg-whiteBg md:p-6 md:max-w-lg md:mx-auto md:rounded-md">
      <h2 className="orelega-one text-[30px] text-center mb-4 text-lightPink">
        Contact Me
      </h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label
            className="block text-sm font-semibold text-orangeHeader"
            htmlFor="name"
          >
            Name
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <InputText
                id="name"
                {...field}
                className={`w-full p-2 border rounded ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
              />
            )}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>
        <div className="mb-4">
          <label
            className="block text-sm font-semibold text-orangeHeader"
            htmlFor="phone"
          >
            Phone
          </label>
          <Controller
            name="phone"
            control={control}
            render={({ field: { onChange, onBlur, value, name } }) => (
              <input
                id="phone"
                type="tel"
                value={value}
                onChange={(e) => {
                  // Ensure the + sign remains at the beginning
                  let phoneValue = e.target.value;
                  if (!phoneValue.startsWith("+")) {
                    phoneValue = "+" + phoneValue.replace(/^\+/, "");
                  }
                  onChange(phoneValue);
                }}
                onBlur={onBlur}
                name={name}
                onKeyDown={handlePhoneKeyDown}
                ref={phoneInputRef}
                placeholder="+92 XXX XXXXXXX"
                className={`w-full p-2 border rounded ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
              />
            )}
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
          <span className="text-xs text-gray-500 mt-1">
            Format: +[country code] phone number (e.g. +92 for Pakistan)
          </span>
        </div>
        <div className="mb-4">
          <label
            className="block text-sm mb-2 font-semibold text-orangeHeader"
            htmlFor="email"
          >
            Email
          </label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <InputText
                id="email"
                {...field}
                className={`w-full p-2 border rounded ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
              />
            )}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        <div className="mb-4">
          <label
            className="block text-sm mb-2 font-semibold text-orangeHeader"
            htmlFor="requestType"
          >
            Type of Request
          </label>
          <Controller
            name="requestType"
            control={control}
            render={({ field }) => (
              <Dropdown
                id="requestType"
                {...field}
                x
                options={requestTypes}
                className={`w-full p-2 bg-white border rounded z-[810] ${
                  errors.requestType ? "border-red-500" : "border-gray-300"
                }`}
                itemTemplate={(option) => (
                  <div className="p-2 bg-white text-center hover:bg-gray-100">
                    {option.label}
                  </div>
                )}
              />
            )}
          />
          {errors.requestType && (
            <p className="text-red-500 text-sm mt-1">
              {errors.requestType.message}
            </p>
          )}
        </div>
        <div className="mb-4">
          <label
            className="block text-sm mb-2 font-semibold text-orangeHeader"
            htmlFor="message"
          >
            Message
          </label>
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <textarea
                id="message"
                {...field}
                className={`w-full p-2 border rounded ${
                  errors.message ? "border-red-500" : "border-gray-300"
                }`}
                rows="1"
                style={{ height: "42px" }}
              />
            )}
          />
          {errors.message && (
            <p className="text-red-500 text-sm mt-1">
              {errors.message.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || isSubmitting}
          className={`w-32 p-2 bg-lightPink text-white rounded-full mx-auto block ${
            isLoading ? "pi pi-spin pi-spinner opacity-70" : ""
          }`}
          style={{ marginBottom: "1.5rem" }}
        >
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
};

export default ContactMe;
