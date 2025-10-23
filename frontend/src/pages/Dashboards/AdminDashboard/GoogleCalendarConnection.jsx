import React, { useState, useEffect } from "react";
import {
  BiCheckCircle,
  BiXCircle,
  BiLoaderAlt,
  BiLinkExternal,
  BiTestTube,
  BiUnlink,
} from "react-icons/bi";
import { FaGoogle } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useGetGoogleCalendarStatusQuery,
  useLazyGetGoogleCalendarAuthUrlQuery,
  useHandleGoogleCalendarCallbackMutation,
  useTestGoogleCalendarConnectionMutation,
  useDisconnectGoogleCalendarMutation,
} from "../../../features/admin/adminApiSlice";

const GoogleCalendarConnection = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Queries and mutations
  const {
    data: connectionStatus,
    isLoading: isCheckingStatus,
    error: statusError,
    refetch: refetchStatus,
  } = useGetGoogleCalendarStatusQuery();

  const [getAuthUrl, { isLoading: isGettingAuthUrl }] =
    useLazyGetGoogleCalendarAuthUrlQuery();

  const [handleCallback, { isLoading: isHandlingCallback }] =
    useHandleGoogleCalendarCallbackMutation();

  const [testConnection, { isLoading: isTesting }] =
    useTestGoogleCalendarConnectionMutation();

  const [disconnectCalendar, { isLoading: isDisconnecting }] =
    useDisconnectGoogleCalendarMutation();

  // Check for OAuth callback in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      toast.error(`Google Calendar authorization failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      handleGoogleCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleCallback = async (code) => {
    try {
      const result = await handleCallback(code).unwrap();
      toast.success(
        "Google Calendar connected successfully! Tokens saved securely."
      );
      refetchStatus();
    } catch (error) {
      console.error("Google Calendar callback error:", error);
      toast.error(error.data?.message || "Failed to connect Google Calendar");
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const result = await getAuthUrl().unwrap();
      if (result.authUrl) {
        // Redirect to Google OAuth
        window.location.href = result.authUrl;
      }
    } catch (error) {
      console.error("Error getting auth URL:", error);
      toast.error(error.data?.message || "Failed to get authorization URL");
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection().unwrap();
      toast.success("Google Calendar connection test successful!");
    } catch (error) {
      console.error("Connection test failed:", error);
      toast.error(error.data?.message || "Connection test failed");
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      await disconnectCalendar().unwrap();
      toast.success("Google Calendar disconnected successfully!");
      refetchStatus();
      setShowDisconnectModal(false);
    } catch (error) {
      console.error("Disconnect failed:", error);
      toast.error(
        error.data?.message || "Failed to disconnect Google Calendar"
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        {/* Left side - Google Calendar info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <FaGoogle className="text-[#4285F4] text-xl" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Google Calendar
              </h3>
              {connectionStatus?.userEmail && (
                <p className="text-sm text-gray-600">
                  {connectionStatus.userEmail}
                </p>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {isCheckingStatus ? (
              <BiLoaderAlt className="animate-spin text-gray-500" />
            ) : connectionStatus?.connected ? (
              <BiCheckCircle
                className="text-green-500 text-xl"
                title="Connected"
              />
            ) : (
              <BiXCircle
                className="text-red-500 text-xl"
                title="Not Connected"
              />
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {connectionStatus?.connected && (
            <>
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
              >
                {isTesting ? (
                  <BiLoaderAlt className="animate-spin" />
                ) : (
                  <BiTestTube />
                )}
                Test
              </button>

              <button
                onClick={() => setShowDisconnectModal(true)}
                disabled={isDisconnecting}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Disconnect Google Calendar"
              >
                <BiUnlink className="text-lg" />
              </button>
            </>
          )}

          {(connectionStatus?.needsAuth || !connectionStatus?.connected) && (
            <button
              onClick={handleConnectGoogleCalendar}
              disabled={isGettingAuthUrl}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4285F4] text-white font-medium rounded-lg hover:bg-[#3367d6] disabled:opacity-50 transition-colors text-sm"
            >
              {isGettingAuthUrl ? (
                <BiLoaderAlt className="animate-spin" />
              ) : (
                <BiLinkExternal />
              )}
              {isGettingAuthUrl ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {statusError && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2">
            <BiXCircle className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">
              {statusError.data?.message ||
                statusError.message ||
                "Connection error occurred"}
            </p>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <BiUnlink className="text-red-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Disconnect Google Calendar
                  </h3>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to disconnect Google Calendar? This will
                  have the following effects:
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <ul className="space-y-2 text-sm text-yellow-800">
                    <li className="flex items-start gap-2">
                      <BiXCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span>
                        All new recurring bookings will not be synced to your
                        Google Calendar
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BiXCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span>
                        Admin-created bookings will not appear in your calendar
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BiXCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <span>
                        Existing calendar events will remain but won't be
                        managed by the system
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDisconnectModal(false)}
                  disabled={isDisconnecting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnectCalendar}
                  disabled={isDisconnecting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDisconnecting ? (
                    <>
                      <BiLoaderAlt className="animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <BiUnlink />
                      Disconnect
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarConnection;
