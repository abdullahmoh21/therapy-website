import React, { useState } from "react";
import { useForgotPasswordMutation } from "./usersApiSlice";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from "../../assets/images/logo.webp";
import Joi from "joi";

const emailSchema = Joi.object({
  email: Joi.string().email({ tlds: false }).required(),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = emailSchema.validate({ email });
    if (error) {
      return toast.error("Invalid email.");
    }

    try {
      await forgotPassword(email).unwrap();
      toast.success("Password reset email sent!");
    } catch (error) {
      console.log(error);
      if (error.status === 400) {
        toast.error(`No user with this email.`);
      } else {
        toast.error(`Failed to send password reset email.`);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFEEE8] lg:pb-14">
      <Link to="/">
        <img
          src={logo}
          alt="Logo"
          className="mb-6 w-32" // Adjust size as needed
        />
      </Link>
      <p className="mb-4 text-center text-[#E09E7C]">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-80 bg-white p-6 rounded-lg shadow-lg"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-3 py-2 mb-4 text-textColor border border-[#E09E7C] rounded-lg focus:outline-none focus:shadow-outline"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-3 py-2 text-white bg-[#E09E7C] rounded-lg hover:bg-[#E27A82] focus:outline-none focus:shadow-outline"
        >
          {isLoading ? "Sending..." : "Continue"}
        </button>
      </form>
      <div className="mt-4 text-center text-textColor">
        <p className="mb-2">
          <Link to="/signin" className="text-[#c45e3e] underline">
            Back to Sign In
          </Link>
        </p>
        <p>
          Don't have an account?{" "}
          <Link to="/consultation" className="text-[#c45e3e] underline">
            Book a free consultation
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
