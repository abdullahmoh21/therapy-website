import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BiLoaderAlt, BiCheckCircle, BiXCircle } from "react-icons/bi";

const GoogleCalendarCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const state = urlParams.get("state");

    // Redirect to system health page with parameters
    if (error) {
      // Redirect with error
      navigate(`/admin/system?error=${encodeURIComponent(error)}`, {
        replace: true,
      });
    } else if (code) {
      // Redirect with success code
      navigate(`/admin/system?code=${encodeURIComponent(code)}`, {
        replace: true,
      });
    } else {
      // No parameters, just redirect
      navigate("/admin/system", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <BiLoaderAlt className="mx-auto h-12 w-12 text-[#DF9E7A] animate-spin" />
          <h2 className="mt-6 text-3xl font-semibold text-gray-900">
            Processing Google Calendar Authorization
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we complete the setup...
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarCallback;
