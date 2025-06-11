import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useVerifyEmailMutation,
  useResendEmailVerificationMutation,
} from "./usersApiSlice";
import Joi from "joi";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaCheckCircle, FaEnvelope } from "react-icons/fa";
import { motion } from "framer-motion";

const tokenSchema = Joi.object({
  token: Joi.string().length(40).required(),
});

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const token = query.get("token");

  const [validationError, setValidationError] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  const [
    verifyEmail,
    {
      isLoading: verifying,
      isError: errorVerifying,
      isSuccess: verified,
      error: verificationError,
      data: verificationData,
    },
  ] = useVerifyEmailMutation();

  const [
    resendVerificationLink,
    { isLoading: sending, isError: errorSending },
  ] = useResendEmailVerificationMutation();

  // Send verification request whenever the token in the URL changes
  useEffect(() => {
    if (!token) {
      setValidationError(true);
      toast.error("Invalid or expired token.", { autoClose: false });
      return;
    }

    const { error } = tokenSchema.validate({ token });
    if (error) {
      setValidationError(true);
      toast.error("Invalid or expired token.", { autoClose: false });
      return;
    }

    verifyEmail(token);
  }, [token, verifyEmail]);

  // Check for 204 status in success case
  useEffect(() => {
    if (verified) {
      // If the response has meta.response.status, check if it's 204
      const statusCode = verificationData?.meta?.response?.status;
      if (statusCode === 204) {
        setAlreadyVerified(true);
      }
    }
  }, [verified, verificationData]);

  // Handle other errors from the verification mutation
  useEffect(() => {
    if (errorVerifying) {
      const statusCode =
        verificationError?.status ||
        verificationError?.originalStatus ||
        verificationError?.data?.status ||
        (verificationError?.status === "FETCH_ERROR" ? "NETWORK_ERROR" : null);

      if (statusCode === 400) {
        toast.error("Verification link has expired or is invalid.");
      } else if (statusCode === "NETWORK_ERROR") {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error(
          "An error occurred during verification. Please try again later."
        );
      }
    }
  }, [errorVerifying, verificationError]);

  // Resend verification link with no cooldown
  async function resendLink() {
    if (sending) return;

    try {
      await resendVerificationLink({ token }).unwrap();
      toast.success(
        "If we find an account with this token, a verification email will be sent to your inbox."
      );
    } catch {
      toast.error("Error sending! Please try again later.");
    }
  }

  const renderResendButton = () => {
    if (sending) {
      return (
        <div className="flex justify-center items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
          <span>Sending...</span>
        </div>
      );
    }

    return (
      <button
        className="py-3 px-8 bg-orangeButton text-buttonTextBlack border-2 border-black font-semibold rounded-full
                   transition-all duration-300 shadow-md hover:bg-lightPink transform hover:scale-105"
        onClick={resendLink}
        disabled={sending}
      >
        Resend Verification Link
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-whiteBg py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-lg shadow-panelShadow p-8 max-w-md w-full"
      >
        <h1 className="orelega-one text-3xl font-semibold text-orangeHeader mb-6 text-center">
          Email Verification
        </h1>

        {verifying ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col justify-center items-center space-y-4 py-6"
          >
            <div className="flex space-x-2">
              <div className="animate-bounce h-4 w-4 bg-lightPink rounded-full delay-75"></div>
              <div className="animate-bounce h-4 w-4 bg-orangeBg rounded-full delay-150"></div>
              <div className="animate-bounce h-4 w-4 bg-lightPink rounded-full delay-300"></div>
            </div>
            <p className="text-textColor">Verifying your email...</p>
          </motion.div>
        ) : alreadyVerified ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center space-y-4 py-4"
          >
            <div className="text-lightPink mb-2">
              <FaCheckCircle size={64} />
            </div>
            <p className="text-xl font-semibold text-orangeHeader mb-4">
              Email Already Verified
            </p>
            <p className="text-textColor mb-4">
              This email has already been verified. You can sign in to your
              account now.
            </p>
            <button
              className="py-3 px-8 bg-orangeButton text-buttonTextBlack border-2 border-black font-semibold rounded-full
                         hover:bg-lightPink transition-all duration-300 transform hover:scale-105 shadow-md"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </button>
          </motion.div>
        ) : errorVerifying ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center space-y-4 py-4"
          >
            <div className="text-red-500 mb-2">
              <FaEnvelope size={42} />
            </div>
            <p className="text-textColor mb-4">
              We couldn't verify your email. Please try again or request a new
              verification link.
            </p>
            {renderResendButton()}
          </motion.div>
        ) : validationError ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center space-y-4 py-4"
          >
            <div className="text-red-500 mb-2">
              <FaEnvelope size={42} />
            </div>
            <p className="text-textColor mb-4">
              The verification link appears to be invalid or expired. Please
              request a new one.
            </p>
            {renderResendButton()}
          </motion.div>
        ) : verified && !alreadyVerified ? (
          // Only show success if it's not already verified
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center space-y-4 py-4"
          >
            <div className="text-lightPink mb-2">
              <FaCheckCircle size={64} />
            </div>
            <p className="text-xl font-semibold text-orangeHeader mb-4">
              Email verification successful!
            </p>
            <p className="text-textColor mb-4">
              Your email has been verified. You can now sign in to your account.
            </p>
            <button
              className="py-3 px-8 bg-orangeButton text-buttonTextBlack border-2 border-black font-semibold rounded-full
                         hover:bg-lightPink transition-all duration-300 transform hover:scale-105 shadow-md"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </button>
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
