import React from "react";
import { BiLoaderAlt } from "react-icons/bi";
import { useGetUserDetailsQuery } from "../../../../features/admin/adminApiSlice";

const ExpandedUserDetails = ({ data, onEditClick }) => {
  // Fetch detailed user data when expanded
  const {
    data: userDetails,
    isLoading,
    isError,
  } = useGetUserDetailsQuery(data._id, {
    skip: !data._id,
  });

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center text-gray-500">
        <BiLoaderAlt className="animate-spin mr-2" />
        Loading user details...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-600">
        Error loading user details. Please try again.
      </div>
    );
  }

  const user = userDetails || data;

  // Function to format date as "11 May 2025 (11:02 PM)"
  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";

    const date = new Date(dateString);
    const options = {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };

    return date.toLocaleDateString("en-US", options);
  };

  // Function to calculate age from DOB
  const calculateAge = (dob) => {
    if (!dob) return null;

    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  return (
    <div className="p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">User Details</h3>
        {/* Edit button removed as requested */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Personal Information
          </h4>
          <div className="bg-white p-3 rounded-md border border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="py-2 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  {user.name}
                </dd>
              </div>
              <div className="py-2 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  <a
                    href={`mailto:${user.email}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {user.email}
                  </a>
                </dd>
              </div>
              <div className="py-2 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  {user.phone ? (
                    <a
                      href={`tel:${user.phone}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {user.phone}
                    </a>
                  ) : (
                    "Not provided"
                  )}
                </dd>
              </div>
              <div className="py-2 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500">
                  Date of Birth
                </dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  {user.DOB
                    ? `${formatDate(user.DOB)}${
                        calculateAge(user.DOB)
                          ? ` (${calculateAge(user.DOB)} years)`
                          : ""
                      }`
                    : "Not provided"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            Account Information
          </h4>
          <div className="bg-white p-3 rounded-md border border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="py-2 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </dd>
              </div>
              <div className="py-2 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500">
                  Email Verified
                </dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      user.emailVerified?.state
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.emailVerified?.state ? "Verified" : "Not Verified"}
                  </span>
                </dd>
              </div>
              <div className="py-2 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500">Joined</dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
              <div className="py-2 grid grid-cols-3">
                <dt className="text-sm font-medium text-gray-500">
                  Last Login
                </dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedUserDetails;
