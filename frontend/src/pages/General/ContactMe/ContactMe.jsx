import React from "react";
import { useForm, Controller } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Joi from "joi";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { PrimeIcons } from "primereact/api";
import { useContactMeMutation } from "../../../features/users/usersApiSlice";
import { PhoneInput } from "react-international-phone";
import { isValidNumber } from "libphonenumber-js";
import "react-international-phone/style.css";
import "./ContactMe.css";

const validPhone = Joi.string().custom((value, helpers) => {
  if (!isValidNumber(value)) {
    return helpers.message("Phone number must be a valid international number");
  }
  return value;
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

const ContactMe = () => {
  const [contactMe, { isLoading }] = useContactMeMutation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: joiResolver(schema),
  });

  const requestTypes = [
    { label: "General Inquiry", value: "General" },
    { label: "Support", value: "Support" },
    { label: "Feedback", value: "Feedback" },
  ];

  const onSubmit = async (data) => {
    try {
      await contactMe({
        name: data.name,
        phone: data.phone,
        email: data.email,
        message: data.message,
        type: data.requestType,
      }).unwrap();
      toast.success("Message sent successfully!");
    } catch (error) {
      if (error.status >= 400 && error.status < 500) {
        toast.error("Client error: Failed to send message");
      } else if (error.status >= 500) {
        toast.error("Server error: Failed to send message");
      }
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-whiteBg rounded-md shadow-md">
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
              <PhoneInput
                {...{ onChange, onBlur, value, name }}
                defaultCountry="pk"
                autoComplete="off"
                className={`mt-1 pl-[5px] h-[42px] w-full border rounded bg-white ${
                  errors.phone ? "border-red-500" : "border-gray-300"
                }`}
                style={{
                  "--react-international-phone-border-color": "transparent",
                  "--react-international-phone-font-size": "16px",
                }}
              />
            )}
          />

          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
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
                options={requestTypes}
                className={`w-full p-2 bg-white border rounded ${
                  errors.requestType ? "border-red-500" : "border-gray-300"
                }`}
                itemTemplate={(option) => (
                  <div className="p-2 bg-white text-center shadow-md hover:bg-gray-100">
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
          className={`w-32 p-2 bg-lightPink text-white rounded-full mx-auto block ${
            isLoading ? "pi pi-spin pi-spinner" : ""
          }`}
        >
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
};

export default ContactMe;
