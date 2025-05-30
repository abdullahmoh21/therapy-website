import React, { useState, useEffect } from "react";
// import { useGetAllBookingsQuery } from "../../../features/admin/adminApiSlice";
import {
  BiCalendar,
  BiTime,
  BiVideo,
  BiMap,
  BiCheckCircle,
  BiXCircle,
  BiInfoCircle,
  BiDollarCircle,
  BiLoaderAlt,
} from "react-icons/bi";
import { ProgressSpinner } from "primereact/progressspinner";
import LoadingPage from "../../../pages/LoadingPage";

// Mock data for development/testing
const mockTodayBookings = [
  {
    _id: "t1",
    bookingId: "BK-20231201-001",
    userName: "John Smith",
    eventName: "Therapy Session",
    eventStartTime: new Date(new Date().setHours(10, 0, 0)).toISOString(),
    eventEndTime: new Date(new Date().setHours(11, 0, 0)).toISOString(),
    transactionStatus: "Completed",
    amount: 150,
    currency: "USD",
    sessionType: "online",
    zoomLink: "https://zoom.us/j/123456789?pwd=abcdefgh",
  },
  {
    _id: "t2",
    bookingId: "BK-20231201-002",
    userName: "Sarah Johnson",
    eventName: "15 Minute Consultation",
    eventStartTime: new Date(new Date().setHours(13, 0, 0)).toISOString(),
    eventEndTime: new Date(new Date().setHours(13, 15, 0)).toISOString(),
    transactionStatus: "NA",
    sessionType: "in-person",
    location: "123 Therapy St, Suite 101",
  },
  {
    _id: "t3",
    bookingId: "BK-20231201-003",
    userName: "Michael Brown",
    eventName: "Therapy Session",
    eventStartTime: new Date(new Date().setHours(15, 30, 0)).toISOString(),
    eventEndTime: new Date(new Date().setHours(16, 30, 0)).toISOString(),
    transactionStatus: "Pending",
    amount: 150,
    currency: "USD",
    sessionType: "online",
    zoomLink: "https://zoom.us/j/987654321?pwd=zyxwvuts",
  },
];

const mockUpcomingBookings = [
  {
    _id: "u1",
    bookingId: "BK-20231202-001",
    userName: "Emma Wilson",
    eventName: "Therapy Session",
    eventStartTime: new Date(
      new Date().setDate(new Date().getDate() + 1)
    ).toISOString(),
    eventEndTime:
      new Date(new Date().setDate(new Date().getDate() + 1))
        .toISOString()
        .split("T")[0] + "T11:00:00.000Z",
    transactionStatus: "Completed",
    amount: 150,
    currency: "USD",
    sessionType: "in-person",
    location: "123 Therapy St, Suite 101",
  },
  {
    _id: "u2",
    bookingId: "BK-20231203-001",
    userName: "David Lee",
    eventName: "Therapy Session",
    eventStartTime: new Date(
      new Date().setDate(new Date().getDate() + 2)
    ).toISOString(),
    eventEndTime:
      new Date(new Date().setDate(new Date().getDate() + 2))
        .toISOString()
        .split("T")[0] + "T14:00:00.000Z",
    transactionStatus: "Completed",
    amount: 150,
    currency: "USD",
    sessionType: "online",
    zoomLink: "https://zoom.us/j/555666777?pwd=meeting123",
  },
  {
    _id: "u3",
    bookingId: "BK-20231204-001",
    userName: "Jennifer Garcia",
    eventName: "15 Minute Consultation",
    eventStartTime: new Date(
      new Date().setDate(new Date().getDate() + 3)
    ).toISOString(),
    eventEndTime:
      new Date(new Date().setDate(new Date().getDate() + 3))
        .toISOString()
        .split("T")[0] + "T10:15:00.000Z",
    transactionStatus: "NA",
    sessionType: "online",
    zoomLink: "https://zoom.us/j/111222333?pwd=consult987",
  },
  {
    _id: "u4",
    bookingId: "BK-20231205-001",
    userName: "Robert Martinez",
    eventName: "Therapy Session",
    eventStartTime: new Date(
      new Date().setDate(new Date().getDate() + 4)
    ).toISOString(),
    eventEndTime:
      new Date(new Date().setDate(new Date().getDate() + 4))
        .toISOString()
        .split("T")[0] + "T16:00:00.000Z",
    transactionStatus: "Failed",
    amount: 150,
    currency: "USD",
    sessionType: "in-person",
    location: "123 Therapy St, Suite 101",
  },
  {
    _id: "u5",
    bookingId: "BK-20231206-001",
    userName: "Jessica Thompson",
    eventName: "Therapy Session",
    eventStartTime: new Date(
      new Date().setDate(new Date().getDate() + 5)
    ).toISOString(),
    eventEndTime:
      new Date(new Date().setDate(new Date().getDate() + 5))
        .toISOString()
        .split("T")[0] + "T13:00:00.000Z",
    transactionStatus: "Pending",
    amount: 150,
    currency: "USD",
    sessionType: "online",
    zoomLink: "https://zoom.us/j/444555666?pwd=therapy456",
  },
];

// Helper to format date/time
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

// Configuration for status indicators
const statusConfig = {
  Completed: {
    color: "#10B981",
    icon: <BiCheckCircle className="text-green-500" />,
    label: "Payment Collected",
  },
  Pending: {
    color: "#F59E0B",
    icon: <BiInfoCircle className="text-amber-500" />,
    label: "Pending Payment",
  },
  Failed: {
    color: "#EF4444",
    icon: <BiXCircle className="text-red-500" />,
    label: "Payment Failed",
  },
  NA: {
    color: "#6B7280",
    icon: <BiCheckCircle className="text-gray-500" />,
    label: "Free Session",
  },
};

const UpcomingBookings = () => {
  const [activeTab, setActiveTab] = useState("today");
  const [todayBookings, setTodayBookings] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);

  const { data: bookingData, isLoading, isError } = useGetAllBookingsQuery();

  useEffect(() => {
    setTodayBookings(mockTodayBookings);
    setUpcomingBookings(mockUpcomingBookings);
  }, [bookingData]);

  const bookingsToRender =
    activeTab === "today" ? todayBookings : upcomingBookings;

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isError) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">
          Failed to load booking data. Please try again later.
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Booking Timeline</h1>
        <p className="mt-2 text-gray-600">
          Manage upcoming therapy sessions and consultations
        </p>
      </header>

      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-gray-100 rounded-full">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-6 py-2 font-medium rounded-full transition-all ${
              activeTab === "today"
                ? "bg-white text-[#c45e3e] shadow"
                : "bg-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-6 py-2 font-medium rounded-full transition-all ${
              activeTab === "upcoming"
                ? "bg-white text-[#c45e3e] shadow"
                : "bg-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      {bookingsToRender.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <BiInfoCircle className="mx-auto text-gray-400 text-4xl mb-3" />
          <h3 className="text-xl font-medium text-gray-700">
            No Bookings Found
          </h3>
          <p className="text-gray-500 mt-2">
            {activeTab === "today"
              ? "There are no sessions scheduled for today."
              : "There are no upcoming sessions scheduled at the moment."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookingsToRender.map((booking) => {
            const { date: bDate, time: bTime } = formatDateTime(
              booking.eventStartTime
            );
            const { time: endTime } = formatDateTime(booking.eventEndTime);
            const status =
              statusConfig[booking.transactionStatus] || statusConfig["NA"];
            const isOnline = booking.sessionType === "online";
            const isConsultation = booking.eventName.includes("Consultation");

            return (
              <div
                key={booking._id}
                className="bg-white p-5 rounded-lg shadow-sm border-l-4 flex flex-col md:flex-row overflow-hidden"
                style={{ borderColor: status.color }}
              >
                <div className="flex-grow space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        {booking.userName}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {booking.eventName} (#
                        {booking.bookingId.split("-").pop()})
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
                      {bDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center text-gray-600">
                      <BiTime className="mr-2 text-[#DF9E7A]" />
                      <span>{`${bTime} - ${endTime}`}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      {isOnline ? (
                        <>
                          <BiVideo className="mr-2 text-[#DF9E7A]" />
                          <span>Online Session</span>
                        </>
                      ) : (
                        <>
                          <BiMap className="mr-2 text-[#DF9E7A]" />
                          <span>In-person Session</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center">
                      {status.icon}
                      <span
                        className={`ml-2 font-medium`}
                        style={{ color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    {!isConsultation && (
                      <div className="flex items-center text-gray-600">
                        <BiDollarCircle className="mr-2 text-[#DF9E7A]" />
                        <span>
                          {booking.amount} {booking.currency}
                        </span>
                      </div>
                    )}
                  </div>

                  {isOnline && booking.zoomLink && (
                    <div className="mt-4">
                      <a
                        href={booking.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <BiVideo className="mr-1" />
                        Join Zoom Meeting
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingBookings;
