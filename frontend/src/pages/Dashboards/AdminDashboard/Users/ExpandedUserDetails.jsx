import React from "react";
import { BiLoaderAlt, BiCalendarEvent } from "react-icons/bi";
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

  // Function to format date of birth as "21 August 2004" (date only)
  const formatDateOfBirth = (dateString) => {
    if (!dateString) return "Not provided";

    const date = new Date(dateString);
    const options = {
      day: "numeric",
      month: "long",
      year: "numeric",
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
    <div className="p-4 md:p-6 md:pl-[120px]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            Personal Information
          </h4>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">Name: </span>
              <span className="text-gray-900 font-medium">{user.name}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Email: </span>
              <a
                href={`mailto:${user.email}`}
                className="text-[#DF9E7A] hover:text-[#DF9E7A]/80"
              >
                {user.email}
              </a>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Phone: </span>
              {user.phone ? (
                <a
                  href={`tel:${user.phone}`}
                  className="text-[#DF9E7A] hover:text-[#DF9E7A]/80"
                >
                  {user.phone}
                </a>
              ) : (
                <span className="text-gray-400">Not provided</span>
              )}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Date of Birth: </span>
              <span className="text-gray-900">
                {user.DOB
                  ? `${formatDateOfBirth(user.DOB)}${
                      calculateAge(user.DOB)
                        ? ` (${calculateAge(user.DOB)} years)`
                        : ""
                    }`
                  : "Not provided"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-base font-semibold text-gray-800 mb-4">
            Account Information
          </h4>
          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <span className="text-gray-500">Role: </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ml-2 ${
                  user.role === "admin"
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {user.role}
              </span>
            </div>
            {user.role === "user" && (
              <div className="text-sm">
                <span className="text-gray-500">Billing Type: </span>
                <span className="text-gray-900">
                  {user.accountType === "international"
                    ? "International"
                    : "Domestic"}
                </span>
              </div>
            )}
            <div className="flex items-center text-sm">
              <span className="text-gray-500">Email Verified: </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ml-2 ${
                  user.emailVerified?.state
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {user.emailVerified?.state ? "Verified" : "Not Verified"}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Joined: </span>
              <span className="text-gray-900">
                {formatDate(user.createdAt)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Last Login: </span>
              <span className="text-gray-900">
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
              </span>
            </div>
          </div>
        </div>

        {/* Recurring Information Section */}
        {user.recurring?.state && (
          <div className="col-span-1 lg:col-span-2 mt-4 lg:mt-0 pt-4 border-t border-gray-200">
            <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center">
              <BiCalendarEvent className="mr-2 text-[#DF9E7A]" />
              Recurring Session Details
            </h4>
            <div className="bg-[#DF9E7A]/5 border border-[#DF9E7A]/20 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="text-sm">
                  <span className="text-gray-500">Interval: </span>
                  <span className="text-gray-900 capitalize">
                    {user.recurring.interval || "Weekly"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Day: </span>
                  <span className="text-gray-900">
                    {(() => {
                      // Handle both numeric (0-6) and string abbreviation formats
                      const numericDayMap = {
                        0: "Sunday",
                        1: "Monday",
                        2: "Tuesday",
                        3: "Wednesday",
                        4: "Thursday",
                        5: "Friday",
                        6: "Saturday",
                      };

                      const stringDayMap = {
                        Mon: "Monday",
                        Tue: "Tuesday",
                        Wed: "Wednesday",
                        Thu: "Thursday",
                        Fri: "Friday",
                        Sat: "Saturday",
                        Sun: "Sunday",
                      };

                      // Check if it's a numeric day (0-6) or string abbreviation
                      return (
                        numericDayMap[user.recurring.day] ||
                        stringDayMap[user.recurring.day] ||
                        "Not specified"
                      );
                    })()}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Time: </span>
                  <span className="text-gray-900">
                    {(() => {
                      if (!user.recurring.time) return "Not specified";

                      // Convert 24-hour format to 12-hour format
                      const [hours, minutes] = user.recurring.time.split(":");
                      const hour = parseInt(hours);
                      const ampm = hour >= 12 ? "PM" : "AM";
                      const displayHour =
                        hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

                      return `${displayHour}:${minutes} ${ampm}`;
                    })()}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Location: </span>
                  <span className="text-gray-900">
                    {user.recurring.location?.type === "in-person" ? (
                      <>
                        In Person
                        {user.recurring.location.inPersonLocation && (
                          <span className="text-gray-600 block mt-1 ml-0">
                            {user.recurring.location.inPersonLocation}
                          </span>
                        )}
                      </>
                    ) : (
                      "Online"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedUserDetails;
