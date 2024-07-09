import React, { useState } from "react";
import { useForgotPasswordMutation } from "./usersApiSlice";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <ToastContainer />
      <img
        src="/Users/AbdullahMohsin/Documents/Code/Personal/Fatima Website/frontend/src/assets/images/logo.png"
        alt="Logo"
        className="mb-6"
      />
      <p className="mb-4 text-center text-gray-600">
        Enter the email associated with your account and we'll send you a link
        to reset your password
      </p>
      <form onSubmit={handleSubmit} noValidate className="w-80">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-3 py-2 mb-4 text-gray-700 border rounded-lg focus:outline-none focus:shadow-outline"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-3 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-700 focus:outline-none focus:shadow-outline"
        >
          {isLoading ? "Sending..." : "Continue"}
        </button>
      </form>
      <p className="mt-4 text-center text-gray-500">
        Don't have an account?{" "}
        <Link to="/booknow" className="text-blue-500 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
