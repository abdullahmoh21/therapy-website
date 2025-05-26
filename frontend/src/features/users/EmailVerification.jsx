import React, { useState, useEffect, useRef } from "react";
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
  const hasRun = useRef(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const [
    verifyEmail,
    {
      isLoading: verifying,
      isError: errorVerifying,
      isSuccess: verified,
      error: verificationError,
    },
  ] = useVerifyEmailMutation();

  const [
    resendVerificationLink,
    { isLoading: sending, isError: errorSending, isSuccess: sent },
  ] = useResendEmailVerificationMutation();

  // Initialize cooldown from localStorage if exists
  useEffect(() => {
    const cooldownEndTime = localStorage.getItem("verificationCooldownEnd");

    if (cooldownEndTime) {
      const endTime = parseInt(cooldownEndTime, 10);
      const now = Date.now();

      if (endTime > now) {
        // Calculate remaining time in seconds
        const remainingSeconds = Math.ceil((endTime - now) / 1000);
        setCooldown(remainingSeconds);

        // Start the countdown
        timerRef.current = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              localStorage.removeItem("verificationCooldownEnd");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Cooldown has expired, clear it
        localStorage.removeItem("verificationCooldownEnd");
      }
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Function to check if token has already failed verification
  const hasTokenFailed = (token) => {
    const failedTokens = JSON.parse(
      localStorage.getItem("failedVerificationTokens") || "[]"
    );
    return failedTokens.includes(token);
  };

  // Function to mark a token as failed
  const markTokenAsFailed = (token) => {
    const failedTokens = JSON.parse(
      localStorage.getItem("failedVerificationTokens") || "[]"
    );
    if (!failedTokens.includes(token)) {
      failedTokens.push(token);
      localStorage.setItem(
        "failedVerificationTokens",
        JSON.stringify(failedTokens)
      );
    }
  };

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
      toast.error("Invalid or expired token.", { autoClose: false });
      return;
    }

    // Check if this token has already failed verification
    if (hasTokenFailed(token)) {
      console.log("Token previously failed verification, skipping request");
      setValidationError(true);
      toast.error("Verification link has expired or is invalid.", {
        autoClose: false,
      });
      return;
    }

    // Proceed with verification if token hasn't failed before
    verifyEmail(token);
    hasRun.current = true;
  }, []);

  useEffect(() => {
    if (errorVerifying) {
      const statusCode =
        verificationError?.status ||
        verificationError?.originalStatus ||
        verificationError?.data?.status ||
        (verificationError?.status === "FETCH_ERROR" ? "NETWORK_ERROR" : null);

      if (statusCode === 400) {
        toast.error("Verification link has expired or is invalid.");
        setValidationError(true);
        // Store this token as failed
        markTokenAsFailed(token);
      } else if (statusCode === "NETWORK_ERROR") {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error(
          "An error occurred during verification. Please try again later."
        );
      }
    }
  }, [errorVerifying, verificationError]);

  //send token to backend. Backend will send verification email by searching token in db
  async function resendLink() {
    try {
      // Don't allow resending if cooldown is active
      if (cooldown > 0) return;

      const result = await resendVerificationLink({ token: token });

      if (errorSending) {
        toast.error("Error sending! Please try logging in again.");
      } else {
        toast.success(
          "If we find an account with this token, a verification email will be sent to your inbox. Please check your email (including spam folder)."
        );

        // Set cooldown time (60 seconds)
        setCooldown(60);

        // Store the end time in localStorage
        const endTime = Date.now() + 60 * 1000;
        localStorage.setItem("verificationCooldownEnd", endTime.toString());

        // Start cooldown timer
        timerRef.current = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              localStorage.removeItem("verificationCooldownEnd");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Modify the button rendering to show cooldown
  const renderResendButton = () => {
    let buttonText = "Resend Verification Link";
    let isDisabled = sending || cooldown > 0;

    if (sending) {
      return (
        <div className="flex justify-center items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
          <span>Sending...</span>
        </div>
      );
    }

    if (cooldown > 0) {
      buttonText = `Try again in ${cooldown}s`;
    }

    return (
      <button
        className={`py-3 px-8 bg-orangeButton text-buttonTextBlack border-2 border-black font-semibold rounded-full 
                  transition-all duration-300 shadow-md ${
                    isDisabled
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-lightPink transform hover:scale-105"
                  }`}
        onClick={resendLink}
        disabled={isDisabled}
      >
        {buttonText}
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
        ) : verified ? (
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
