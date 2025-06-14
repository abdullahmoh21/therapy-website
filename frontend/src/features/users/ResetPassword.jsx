import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useResetPasswordMutation } from "./usersApiSlice";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Joi from "joi";
import logo from "../../assets/images/logo.webp";

const tokenSchema = Joi.object({
  token: Joi.string().length(40).required(), //making sure length is 40. Validation done in backend
});

const passwordSchema = Joi.object({
  //8 to 30 characters, containing at least one uppercase letter, one lowercase letter, one number, and one special character
  password: Joi.string()
    .min(8)
    .required()
    //splitting schema for user friendly error messages
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
});

const toastWithLink = () => (
  <div>
    <p>
      Invalid or expired token. Please request a new link{" "}
      <Link to="/forgotPassword" className="text-blue-500 underline">
        here.
      </Link>
    </p>
  </div>
);

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const token = query.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  // Validate token on component mount
  useEffect(() => {
    const { error } = tokenSchema.validate({ token });
    if (error || !token) {
      navigate("/forgotPassword");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error: passwordError } = passwordSchema.validate({
      password,
      confirmPassword,
    });
    if (passwordError) {
      toast.error(passwordError.details[0].message);
      return;
    }

    try {
      await resetPassword({ token, password, confirmPassword }).unwrap();
      toast.success("Password reset successful!");
      setTimeout(() => {
        navigate("/signin");
      }, 2000); // Delay of 2 seconds
    } catch (error) {
      console.log(error);
      if (error.status === 400) {
        toast.error(toastWithLink);
      } else if (error.status === 500) {
        toast.error(`An error occurred. Please try again later.`);
      } else {
        toast.error(
          `Could not connect. Please check your internet and try again.`
        );
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFEEE8] lg:pb-14">
      <img src={logo} alt="Logo" className="mb-6 w-32" />
      <p className="mb-4 text-center text-[#E09E7C]">
        Enter your new password below
      </p>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-80 bg-white p-6 rounded-lg shadow-lg"
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
          autoComplete="new-password"
          className="w-full px-3 py-2 mb-4 text-textColor border border-[#E09E7C] rounded-lg focus:outline-none focus:shadow-outline"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          className="w-full px-3 py-2 mb-4 text-textColor border border-[#E09E7C] rounded-lg focus:outline-none focus:shadow-outline"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-3 py-2 text-white bg-[#E09E7C] rounded-lg hover:bg-[#E27A82] focus:outline-none focus:shadow-outline"
        >
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
