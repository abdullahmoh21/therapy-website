import EditProfile from "./EditProfile";
import MyBookings from "./MyBookings";
import Billing from "./Billing";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGetMyUserQuery } from "../../features/users/usersApiSlice";
import { useLogoutMutation } from "../../features/auth/authApiSlice";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("myBookings"); // Set MyBookings as the default tab
  const { data, isLoading, refetch } = useGetMyUserQuery();
  const [userData, setUserData] = useState(null);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const navigate = useNavigate();

  useEffect(() => {
    if (data) {
      const entities = data.entities;
      const fetchedUser = entities && entities[Object.keys(entities)[0]];

      const dob = new Date(fetchedUser.DOB);
      const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;
      setUserData({ ...fetchedUser, DOB: formattedDob });
    }
  }, [data]);

  const handleUserUpdate = () => {
    refetch();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out: ", error);
    }
  };

  const renderTab = () => {
    if (isLoading) {
      return <div>Loading...</div>;
    }
    switch (activeTab) {
      case "editProfile":
        return <EditProfile onUserUpdate={handleUserUpdate} />;
      case "myBookings":
        return <MyBookings />;
      case "Billing":
        return <Billing />;
      default:
        return <MyBookings />;
    }
  };

  return (
    <div className="dashboard flex flex-col md:flex-row relative">
      <div className="navbar md:h-full w-full md:w-1/4 p-4 flex md:flex-col">
        <button
          className="mb-2 w-full py-2 px-4 bg-blue-500 text-white rounded"
          onClick={() => setActiveTab("myBookings")}
        >
          My Bookings
        </button>
        <button
          className="mb-2 w-full py-2 px-4 bg-blue-500 text-white rounded"
          onClick={() => setActiveTab("editProfile")}
        >
          Edit Profile
        </button>
        <button
          className="w-full py-2 px-4 bg-blue-500 text-white rounded"
          onClick={() => setActiveTab("Billing")}
        >
          Billing
        </button>
      </div>
      <div className="tab-content w-full md:w-3/4 p-4">{renderTab()}</div>
      <button
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 absolute top-0 right-0 m-4" // Position the logout button at the top right
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
