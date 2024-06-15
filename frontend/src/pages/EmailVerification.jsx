import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useVerifyEmailMutation,
  useResendEmailVerificationMutation,
} from "../features/users/usersApiSlice";
import Joi from "joi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle } from "react-icons/fa";

const tokenSchema = Joi.object({
  token: Joi.string().length(40).required(),
});

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const token = query.get("token");
  const [validationError, setValidationError] = useState(false);
  const hasRun = useRef(false);

  const [
    verifyEmail,
    { isLoading: verifying, isError: errorVerifying, isSuccess: verified },
  ] = useVerifyEmailMutation();

  const [
    resendVerificationLink,
    { isLoading: sending, isError: errorSending, isSuccess: sent },
  ] = useResendEmailVerificationMutation();

  //Email verification request
  useEffect(() => {
    if (hasRun.current) {
      //ensure only runs once
      return;
    }
    if (!token) {
      setValidationError(true);
      return;
    }
    const { error } = tokenSchema.validate({ token });
    if (error) {
      setValidationError(true);
      toast.error("Invalid or missing token.");
      return;
    }
    verifyEmail(token);

    hasRun.current = true;
  }, []);
  useEffect(() => {
    if (errorVerifying) {
      toast.error(
        "An Error occured. Please check your internet connection and try again later."
      );
    }
  }, [errorVerifying]);

  //send token to backend. Backend will send verification email by searching token in db
  async function resendLink() {
    try {
      const result = await resendVerificationLink({ token: token });
      if (errorSending) {
        toast.error("Error sending! Please try logging in again.");
      } else {
        toast.success("Verification email sent successfully!");
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <ToastContainer />
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        Email Verification
      </h1>
      {verifying ? (
        //if verifying load spinner
        <div className="flex justify-center items-center space-x-2">
          <div className="animate-bounce h-5 w-5 bg-blue-500 rounded-full"></div>
          <div className="animate-bounce h-5 w-5 bg-blue-500 rounded-full"></div>
        </div>
      ) : errorVerifying ? (
        <div className="mt-4">
          <button
            className="py- px-3 bg-[#262424] text-white h-[40px] w-[130px] border-white rounded-[20px]
                    hover:bg-[#2c2c2c]"
            onClick={() => resendLink(token)}
          >
            {sending ? (
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
              "Resend Link"
            )}
          </button>
        </div>
      ) : validationError ? (
        <div className="mt-4">
          <button
            className="py- px-3 bg-[#262424] text-white h-[40px] w-[130px] border-white rounded-[20px]
                    hover:bg-[#2c2c2c]"
            onClick={() => resendLink(token)}
          >
            {sending ? (
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
              "Resend Link"
            )}
          </button>
        </div>
      ) : verified ? (
        <div className="flex items-center justify-center text-green-500 space-x-2">
          <FaCheckCircle size={32} />
          <p className="text-xl font-semibold">
            Email verification successful!
          </p>
          {setTimeout(() => navigate("/signin"), 2000)}
        </div>
      ) : null}
    </div>
  );
};

export default VerifyEmail;
