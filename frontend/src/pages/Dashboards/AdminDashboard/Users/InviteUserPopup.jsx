import React, { useState, useEffect } from "react";
import { BiX, BiCopy, BiLoaderAlt, BiErrorCircle } from "react-icons/bi";
import { toast } from "react-toastify";
import { useInviteUserMutation } from "../../../../features/admin/adminApiSlice";

const InviteUserPopup = ({ isOpen, onClose, onSuccess }) => {
  console.log("InviteUserPopup being rendered with isOpen:", isOpen);

  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  const [emailError, setEmailError] = useState("");

  // Form state
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    confirmEmail: "",
    role: "user",
    accountType: "domestic",
  });

  // API hooks
  const [inviteUser] = useInviteUserMutation();

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setUserData({
        name: "",
        email: "",
        confirmEmail: "",
        role: "user",
        accountType: "domestic",
      });
      setInvitationLink("");
      setEmailError("");
      setShowAdminWarning(false);
    }
  }, [isOpen]);

  const validateEmailMatch = (email, confirmEmail) => {
    const currentEmail = email || userData.email;
    const currentConfirmEmail = confirmEmail || userData.confirmEmail;

    // Only show error if both fields have content
    if (!currentEmail || !currentConfirmEmail) {
      setEmailError("");
      return true;
    }

    if (
      currentEmail.trim().toLowerCase() !==
      currentConfirmEmail.trim().toLowerCase()
    ) {
      setEmailError("Emails do not match");
      return false;
    }

    setEmailError("");
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email confirmation
    if (!validateEmailMatch()) {
      return;
    }

    // Check if this is a new admin invite
    if (userData.role === "admin") {
      setShowAdminWarning(true);
      return;
    }

    await processInvitation();
  };

  // Process the invitation
  const processInvitation = async () => {
    setIsSubmitting(true);
    try {
      const response = await inviteUser({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        accountType: userData.accountType,
      }).unwrap();

      // Handle already invited case
      if (response?.alreadyInvited) {
        toast.warning(response.message || "User has already been invited");
      } else {
        // If there's an invitation link, show it
        if (response.link) {
          setInvitationLink(response.link);
        } else {
          // Otherwise just close the modal
          onClose();
          // Reset form state after closing
          setUserData({
            name: "",
            email: "",
            confirmEmail: "",
            role: "user",
            accountType: "domestic",
          });
        }

        toast.success("Invitation sent successfully");
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error("Error inviting user:", err);
      toast.error(err.data?.message || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle admin warning confirmation
  const handleAdminConfirm = () => {
    setShowAdminWarning(false);
    processInvitation();
  };

  // Copy invitation link to clipboard
  const copyInvitationLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast.success("Invitation link copied to clipboard!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-xs sm:max-w-md w-full mx-auto max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Invite New User
          </h2>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => {
              onClose();
              setInvitationLink("");
            }}
          >
            <BiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {showAdminWarning ? (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <BiErrorCircle className="text-yellow-600 text-lg mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Admin Access Warning
                  </h4>
                  <p className="text-gray-700 text-sm mb-3">
                    You're about to invite <strong>{userData.email}</strong> as
                    an admin. Admins have full access to the system including:
                  </p>
                  <ul className="list-disc pl-5 mb-4 text-gray-700 text-sm space-y-1">
                    <li>All user details and personal information</li>
                    <li>All booking data and history</li>
                    <li>All payment records and financial data</li>
                    <li>System settings and configurations</li>
                  </ul>
                  <p className="text-gray-700 text-sm mb-4">
                    Are you sure you want to proceed with this admin invitation?
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAdminWarning(false)}
                      className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminConfirm}
                      className="px-4 py-2 text-white bg-[#DF9E7A] rounded-lg hover:bg-[#DF9E7A]/90 transition-colors"
                    >
                      Yes, Invite as Admin
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : invitationLink ? (
            <div>
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium text-gray-700">
                    Invitation Link
                  </label>
                  <button
                    type="button"
                    onClick={copyInvitationLink}
                    className="text-[#DF9E7A] hover:text-[#DF9E7A]/80 flex items-center text-sm"
                  >
                    <BiCopy className="mr-1" /> Copy
                  </button>
                </div>
                <div className="text-sm text-gray-600 break-all bg-white p-3 rounded-lg border border-gray-200">
                  {invitationLink}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  The user has already been emailed with an invitation. You can
                  also share this link manually if needed.
                </p>
              </div>
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  className="px-4 py-2 bg-[#DF9E7A] text-white rounded-lg hover:bg-[#DF9E7A]/90 transition-colors"
                  onClick={() => {
                    onClose();
                    setInvitationLink("");
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={userData.name}
                    onChange={(e) =>
                      setUserData({ ...userData, name: e.target.value })
                    }
                    placeholder="Enter user's name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    onChange={(e) => {
                      const newEmail = e.target.value;
                      setUserData({ ...userData, email: newEmail });
                      validateEmailMatch(newEmail, userData.confirmEmail);
                    }}
                    placeholder="Enter user's email"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Email
                  </label>
                  <input
                    type="email"
                    value={userData.confirmEmail}
                    onChange={(e) => {
                      const newConfirmEmail = e.target.value;
                      setUserData({
                        ...userData,
                        confirmEmail: newConfirmEmail,
                      });
                      validateEmailMatch(userData.email, newConfirmEmail);
                    }}
                    placeholder="Confirm email address"
                    className={`w-full px-3 py-2 border rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-colors ${
                      emailError ? "border-red-300" : "border-gray-200"
                    }`}
                    required
                  />
                  {emailError && (
                    <p className="text-red-600 text-sm mt-1">{emailError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={userData.role}
                    onChange={(e) =>
                      setUserData({ ...userData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Type
                  </label>
                  <select
                    value={userData.accountType}
                    onChange={(e) =>
                      setUserData({ ...userData, accountType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-colors"
                  >
                    <option value="domestic">Domestic</option>
                    <option value="international">International</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-6 space-x-3 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    onClose();
                    setInvitationLink("");
                    setEmailError("");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-[#DF9E7A] text-white rounded-lg hover:bg-[#DF9E7A]/90 flex items-center justify-center min-w-[120px] transition-colors ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <BiLoaderAlt className="animate-spin mr-2" />
                      Inviting...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteUserPopup;
