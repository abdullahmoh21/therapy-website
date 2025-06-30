import React, { useState, useEffect } from "react";
import { BiX, BiCopy, BiLoaderAlt, BiErrorCircle } from "react-icons/bi";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Invite New User
            </h2>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => {
                onClose();
                setInvitationLink("");
              }}
            >
              <BiX size={24} />
            </button>
          </div>

          {showAdminWarning ? (
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <BiErrorCircle className="text-yellow-500 text-xl mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">
                    Admin Access Warning
                  </h4>
                  <p className="text-gray-700 mb-4">
                    You're about to invite <strong>{userData.email}</strong> as
                    an admin. Admins have full access to the system including:
                  </p>
                  <ul className="list-disc pl-5 mb-6 text-gray-700 space-y-1">
                    <li>All user details and personal information</li>
                    <li>All booking data and history</li>
                    <li>All payment records and financial data</li>
                    <li>System settings and configurations</li>
                  </ul>
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to proceed with this admin invitation?
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAdminWarning(false)}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminConfirm}
                      className="px-4 py-2 text-white bg-yellow-500 rounded-md hover:bg-yellow-600"
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
                    className="text-[#c45e3e] hover:text-[#DF9E7A] flex items-center text-sm"
                  >
                    <BiCopy className="mr-1" /> Copy
                  </button>
                </div>
                <div className="text-sm text-gray-600 break-all bg-white p-3 rounded border border-gray-200">
                  {invitationLink}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  The user has already been emailed with an invitation. You can
                  also share this link manually if needed.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-[#DF9E7A] text-white rounded-md hover:bg-[#c45e3e] transition-colors"
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
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <span className="p-input-icon-left w-full">
                    <i className="pi pi-user" />
                    <InputText
                      value={userData.name}
                      onChange={(e) =>
                        setUserData({ ...userData, name: e.target.value })
                      }
                      placeholder="Enter user's name"
                      className="w-full p-inputtext-lg"
                      required
                    />
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <span className="p-input-icon-left w-full">
                    <i className="pi pi-envelope" />
                    <InputText
                      type="email"
                      value={userData.email}
                      onChange={(e) => {
                        const newEmail = e.target.value;
                        setUserData({ ...userData, email: newEmail });
                        validateEmailMatch(newEmail, userData.confirmEmail);
                      }}
                      placeholder="Enter user's email"
                      className="w-full p-inputtext-lg"
                      required
                    />
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Email
                  </label>
                  <span className="p-input-icon-left w-full">
                    <i className="pi pi-check-circle" />
                    <InputText
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
                      className={`w-full p-inputtext-lg ${
                        emailError ? "p-invalid" : ""
                      }`}
                      required
                    />
                  </span>
                  {emailError && (
                    <small className="p-error block mt-1">{emailError}</small>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <Dropdown
                    value={userData.role}
                    options={[
                      { label: "User", value: "user" },
                      { label: "Admin", value: "admin" },
                    ]}
                    onChange={(e) =>
                      setUserData({ ...userData, role: e.value })
                    }
                    placeholder="Select a role"
                    className="w-full p-dropdown-lg"
                    panelClassName="bg-white border shadow-md rounded-md"
                    itemTemplate={(option) => (
                      <div className="flex items-center p-2">
                        <i
                          className={`pi ${
                            option.value === "admin" ? "pi-shield" : "pi-user"
                          } mr-2`}
                        ></i>
                        <span>{option.label}</span>
                      </div>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing
                  </label>
                  <Dropdown
                    value={userData.accountType}
                    options={[
                      { label: "Domestic", value: "domestic" },
                      { label: "International", value: "international" },
                    ]}
                    onChange={(e) =>
                      setUserData({ ...userData, accountType: e.value })
                    }
                    placeholder="Select billing type"
                    className="w-full p-dropdown-lg"
                    panelClassName="bg-white border shadow-md rounded-md"
                    itemTemplate={(option) => (
                      <div className="flex items-center p-2">
                        <i
                          className={`pi ${
                            option.value === "international"
                              ? "pi-globe"
                              : "pi-home"
                          } mr-2`}
                        ></i>
                        <span>{option.label}</span>
                      </div>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-4 space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-200"
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
                    className={`px-4 py-2 bg-[#DF9E7A] text-white rounded-md hover:bg-[#c45e3e] flex items-center justify-center min-w-[120px] transition-all duration-200 ${
                      isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <BiLoaderAlt className="animate-spin mr-2" />{" "}
                        Inviting...
                      </>
                    ) : (
                      "Send Invitation"
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteUserPopup;
