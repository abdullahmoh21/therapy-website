import React, { useState, useEffect } from "react";
import { BiX, BiLoaderAlt, BiErrorCircle } from "react-icons/bi";
import { toast } from "react-toastify";

const EditUserPopup = ({
  isOpen,
  onClose,
  editingUser,
  onSuccess,
  updateUser,
}) => {
  console.log("EditUserPopup being rendered with isOpen:", isOpen);

  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [showBillingWarning, setShowBillingWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({
    adminRoleChange: false,
    billingTypeChange: false,
  });
  // Track original user data for accurate change detection
  const [originalUserData, setOriginalUserData] = useState(null);

  // Form state
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "user",
    accountType: "domestic",
  });

  // Load user data when editing user changes
  useEffect(() => {
    if (editingUser) {
      const initialUserData = {
        name: editingUser.name || "",
        email: editingUser.email || "",
        role: editingUser.role || "user",
        accountType: editingUser.accountType || "domestic",
      };

      setUserData(initialUserData);
      setOriginalUserData(initialUserData);
    }
    setShowAdminWarning(false);
    setShowBillingWarning(false);
    setPendingChanges({
      adminRoleChange: false,
      billingTypeChange: false,
    });
  }, [editingUser, isOpen]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset pending changes
    const changes = {
      adminRoleChange: false,
      billingTypeChange: false,
    };

    // Check for admin role change
    if (originalUserData.role !== "admin" && userData.role === "admin") {
      changes.adminRoleChange = true;
    }

    // Only check for billing type changes if the user is not an admin
    // And only if the billing type has actually changed from its original value
    if (
      userData.role !== "admin" &&
      originalUserData.accountType !== userData.accountType
    ) {
      changes.billingTypeChange = true;
    }

    // Update pending changes state
    setPendingChanges(changes);

    // Show warnings or process update
    if (changes.adminRoleChange) {
      setShowAdminWarning(true);
    } else if (changes.billingTypeChange) {
      setShowBillingWarning(true);
    } else {
      await processUserUpdate();
    }
  };

  // Process the actual user update
  const processUserUpdate = async () => {
    setIsSubmitting(true);
    try {
      // Create an object with only the fields that have been changed
      const updatedFields = {};
      if (userData.name !== originalUserData.name) {
        updatedFields.name = userData.name;
      }
      if (userData.email !== originalUserData.email) {
        updatedFields.email = userData.email;
      }
      if (userData.role !== originalUserData.role) {
        updatedFields.role = userData.role;
      }
      if (userData.accountType !== originalUserData.accountType) {
        updatedFields.accountType = userData.accountType;
      }

      // Only send the request if there are actually changes
      if (Object.keys(updatedFields).length > 0 && updateUser) {
        const result = await updateUser({
          userId: editingUser._id,
          ...updatedFields,
        }).unwrap();

        // Close modal before showing success toast
        onClose();
        toast.success(result?.message || "User updated successfully");
        if (onSuccess) onSuccess();
      } else {
        // No changes detected
        toast.warning("No changes detected");
        onClose();
      }
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error(err.data?.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle admin warning confirmation
  const handleAdminConfirm = () => {
    setShowAdminWarning(false);

    // Check if billing warning also needs to be shown
    if (pendingChanges.billingTypeChange) {
      setShowBillingWarning(true);
    } else {
      processUserUpdate();
    }
  };

  // Handle billing warning confirmation
  const handleBillingConfirm = () => {
    setShowBillingWarning(false);
    processUserUpdate();
  };

  if (!isOpen || !editingUser || !originalUserData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-xs sm:max-w-md w-full mx-auto max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Edit User
          </h2>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            onClick={onClose}
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
                  <p className="text-gray-700 text-sm mb-4">
                    You're about to change <strong>{userData.email}</strong>'s
                    role to admin. Admins have full access to the system
                    including:
                  </p>
                  <ul className="list-disc pl-5 mb-4 text-gray-700 text-sm space-y-1">
                    <li>All user details and personal information</li>
                    <li>All booking data and history</li>
                    <li>All payment records and financial data</li>
                    <li>System settings and configurations</li>
                  </ul>
                  <p className="text-gray-700 text-sm mb-4">
                    Are you sure you want to proceed with this change?
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
                      Yes, Change to Admin
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : showBillingWarning ? (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <BiErrorCircle className="text-blue-600 text-lg mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Billing Type Change Warning
                  </h4>
                  <p className="text-gray-700 text-sm mb-3">
                    You're about to change <strong>{userData.email}</strong>'s
                    billing type from
                    <strong>
                      {" "}
                      {editingUser.accountType === "domestic"
                        ? "Domestic"
                        : "International"}
                    </strong>{" "}
                    to
                    <strong>
                      {" "}
                      {userData.accountType === "domestic"
                        ? "Domestic"
                        : "International"}
                    </strong>
                    .
                  </p>
                  <p className="text-gray-700 text-sm mb-3">
                    This user will now be charged in{" "}
                    <strong>
                      {userData.accountType === "domestic"
                        ? "PKR (Pakistani Rupees)"
                        : "USD (US Dollars)"}
                    </strong>
                    .
                  </p>
                  <p className="text-gray-700 text-sm mb-4">
                    This change will only apply to{" "}
                    <strong>future bookings</strong>. Any existing bookings will
                    continue with their original rates and currency.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowBillingWarning(false)}
                      className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBillingConfirm}
                      className="px-4 py-2 text-white bg-[#DF9E7A] rounded-lg hover:bg-[#DF9E7A]/90 transition-colors"
                    >
                      Yes, Change Billing Type
                    </button>
                  </div>
                </div>
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
                    }}
                    placeholder="Enter user's email"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={userData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      // If changing to admin, reset accountType to domestic
                      if (newRole === "admin") {
                        setUserData({
                          ...userData,
                          role: newRole,
                          accountType: "domestic",
                        });
                      } else {
                        setUserData({ ...userData, role: newRole });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Only show billing dropdown if role is not admin */}
                {userData.role !== "admin" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Billing Type
                    </label>
                    <select
                      value={userData.accountType}
                      onChange={(e) =>
                        setUserData({
                          ...userData,
                          accountType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-[#DF9E7A] focus:ring-1 focus:ring-[#DF9E7A] transition-colors"
                    >
                      <option value="domestic">Domestic</option>
                      <option value="international">International</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 space-x-3 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={onClose}
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
                      Updating...
                    </>
                  ) : (
                    "Update User"
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

export default EditUserPopup;
