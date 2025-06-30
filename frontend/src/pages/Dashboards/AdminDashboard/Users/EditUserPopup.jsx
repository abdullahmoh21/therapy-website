import React, { useState, useEffect } from "react";
import { BiX, BiLoaderAlt, BiErrorCircle } from "react-icons/bi";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Edit User</h2>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={onClose}
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
                    You're about to change <strong>{userData.email}</strong>'s
                    role to admin. Admins have full access to the system
                    including:
                  </p>
                  <ul className="list-disc pl-5 mb-6 text-gray-700 space-y-1">
                    <li>All user details and personal information</li>
                    <li>All booking data and history</li>
                    <li>All payment records and financial data</li>
                    <li>System settings and configurations</li>
                  </ul>
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to proceed with this change?
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
                      Yes, Change to Admin
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : showBillingWarning ? (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <BiErrorCircle className="text-blue-500 text-xl mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">
                    Billing Type Change Warning
                  </h4>
                  <p className="text-gray-700 mb-4">
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
                  <p className="text-gray-700 mb-4">
                    This user will now be charged in{" "}
                    <strong>
                      {userData.accountType === "domestic"
                        ? "PKR (Pakistani Rupees)"
                        : "USD (US Dollars)"}
                    </strong>
                    .
                  </p>
                  <p className="text-gray-700 mb-4">
                    This change will only apply to{" "}
                    <strong>future bookings</strong>. Any existing bookings will
                    continue with their original rates and currency.
                  </p>
                  <p className="text-gray-700 mb-6">
                    Are you sure you want to proceed with this change?
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowBillingWarning(false)}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBillingConfirm}
                      className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                    >
                      Yes, Change Billing Type
                    </button>
                  </div>
                </div>
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
                      }}
                      placeholder="Enter user's email"
                      className="w-full p-inputtext-lg"
                      required
                    />
                  </span>
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
                    onChange={(e) => {
                      const newRole = e.value;
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

                {/* Only show billing dropdown if role is not admin */}
                {userData.role !== "admin" && (
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
                )}

                <div className="flex justify-end pt-4 space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-200"
                    onClick={onClose}
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
                        Updating...
                      </>
                    ) : (
                      "Update User"
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

export default EditUserPopup;
