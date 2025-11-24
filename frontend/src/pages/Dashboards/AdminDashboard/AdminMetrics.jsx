import React, { useState } from "react";
import {
  useGetDashboardMetricsQuery,
  useGetGeneralMetricsQuery,
} from "../../../features/admin";
import {
  BiLineChart,
  BiDollar,
  BiGroup,
  BiRefresh,
  BiCheckCircle,
  BiXCircle,
  BiMessageDetail,
  BiUserCircle,
  BiStats,
  BiTime,
} from "react-icons/bi";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Custom Skeleton components
const MetricCardSkeleton = () => (
  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 animate-pulse">
    <div className="flex items-center mb-2">
      <div className="w-10 h-10 bg-gray-200 rounded-md" />
      <div className="ml-3 h-4 bg-gray-200 rounded w-24" />
    </div>
    <div className="h-8 bg-gray-200 rounded w-32 mt-2" />
  </div>
);

const SectionSkeleton = ({ cardCount = 3 }) => (
  <div className="mb-6">
    <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${
        cardCount >= 3 ? "lg:grid-cols-3" : ""
      } gap-4`}
    >
      {[...Array(cardCount)].map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
    <div className="h-64 bg-gray-100 rounded w-full" />
  </div>
);

const TIMEFRAME_OPTIONS = [
  { key: "last_7d", label: "Last 7 days" },
  { key: "last_30d", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "all_time", label: "All time" },
];

const Metrics = () => {
  const [timeFrame, setTimeFrame] = useState("last_30d");

  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    isError: isErrorDashboard,
    error: errorDashboard,
    refetch: refetchDashboard,
  } = useGetDashboardMetricsQuery(timeFrame);

  const {
    data: generalData,
    isLoading: isLoadingGeneral,
    isError: isErrorGeneral,
    error: errorGeneral,
    refetch: refetchGeneral,
  } = useGetGeneralMetricsQuery();

  const refetchAll = () => {
    refetchDashboard();
    refetchGeneral();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("ur-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const hasErrors = isErrorDashboard || isErrorGeneral;
  const errorMessage =
    errorDashboard?.data?.message ||
    errorGeneral?.data?.message ||
    "Failed to load metrics data.";

  const timeFrameLabel =
    TIMEFRAME_OPTIONS.find((opt) => opt.key === timeFrame)?.label ||
    "Selected period";

  const sessionsCompleted = dashboardData?.timeFiltered?.sessionsCompleted || 0;
  const cancellations = dashboardData?.timeFiltered?.cancellations || 0;
  const newUsers = dashboardData?.timeFiltered?.newUsers || 0;
  const estimatedRevenue = dashboardData?.timeFiltered?.estimatedRevenue || 0;
  const inquiriesInPeriod = dashboardData?.timeFiltered?.inquiries || 0;

  const upcomingSessionsNext7d =
    dashboardData?.snapshot?.upcomingSessionsNext7d || 0;
  const unpaidSessions = dashboardData?.snapshot?.unpaidSessions || 0;
  const activeClientsLast60d =
    dashboardData?.snapshot?.activeClientsLast60d || 0;
  const recurringClientsCount =
    dashboardData?.snapshot?.recurringClientsCount || 0;

  const totalUsers = generalData?.users?.totalCount || 0;
  const averageAge = Math.round(generalData?.users?.averageAge || 0);
  const mostActiveUsers = generalData?.userActivity?.mostActiveUsers || [];

  const sessionChartData = {
    labels: ["Completed sessions", "Cancelled sessions"],
    datasets: [
      {
        data: [sessionsCompleted, cancellations],
        backgroundColor: [
          "rgba(34, 197, 94, 0.6)", // green
          "rgba(239, 68, 68, 0.6)", // red
        ],
        borderColor: ["rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Business Dashboard</h1>
        <p className="mt-2 text-gray-600">
          A quick view of how your therapy practice is doing.
        </p>
      </header>

      {/* Error Banner */}
      {hasErrors && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{errorMessage}</span>
          <button
            onClick={refetchAll}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
          >
            <BiRefresh className="inline-block mr-1" /> Retry
          </button>
        </div>
      )}

      {/* Time Frame Selector */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-700 flex items-center">
              <BiLineChart className="text-[#DF9E7A] mr-2" />
              Time Period
            </h2>
            <p className="text-sm text-gray-500">
              Metrics shown for:{" "}
              <span className="font-medium">{timeFrameLabel}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex shadow-sm rounded-md overflow-hidden">
              {TIMEFRAME_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTimeFrame(opt.key)}
                  className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border border-gray-300 ${
                    timeFrame === opt.key
                      ? "bg-[#DF9E7A] text-white border-[#DF9E7A]"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } transition-colors first:rounded-l-md last:rounded-r-md`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={refetchAll}
              className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              title="Refresh data"
            >
              <BiRefresh />
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {isLoadingDashboard ? (
        <SectionSkeleton cardCount={4} />
      ) : (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <BiStats className="text-[#DF9E7A] mr-2" />
            Key Metrics – {timeFrameLabel}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-green-100 text-green-500 rounded-md">
                  <BiDollar className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  Estimated Revenue
                </h3>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(estimatedRevenue)}
                </span>
              </div>
            </div>

            {/* Sessions Completed */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-blue-100 text-blue-500 rounded-md">
                  <BiCheckCircle className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  Completed Sessions
                </h3>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {sessionsCompleted}
                </span>
              </div>
            </div>

            {/* New Users */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-500 rounded-md">
                  <BiGroup className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  New Users
                </h3>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {newUsers}
                </span>
              </div>
            </div>

            {/* Cancellations */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-red-100 text-red-500 rounded-md">
                  <BiXCircle className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  Cancellations
                </h3>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {cancellations}
                </span>
              </div>
            </div>
          </div>

          {/* Inquiries as a full-width card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-yellow-100 text-yellow-500 rounded-md">
                  <BiMessageDetail className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  Inquiries this period
                </h3>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {inquiriesInPeriod}
                </span>
              </div>
            </div>

            {/* Session distribution chart */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Sessions vs Cancellations
              </h3>
              <div className="h-64 flex items-center justify-center">
                {sessionsCompleted === 0 && cancellations === 0 ? (
                  <p className="text-gray-400 text-sm">
                    Not enough data for this chart yet.
                  </p>
                ) : isLoadingDashboard ? (
                  <ChartSkeleton />
                ) : (
                  <Pie data={sessionChartData} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Operations Snapshot */}
      {isLoadingDashboard ? (
        <SectionSkeleton cardCount={4} />
      ) : (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <BiTime className="text-[#DF9E7A] mr-2" />
            Current Operations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Upcoming sessions */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-blue-100 text-blue-500 rounded-md">
                  <BiCheckCircle className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  Upcoming (next 7 days)
                </h3>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {upcomingSessionsNext7d}
              </div>
            </div>

            {/* Active clients */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-purple-100 text-purple-500 rounded-md">
                  <BiUserCircle className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  Active clients (last 60 days)
                </h3>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {activeClientsLast60d}
              </div>
            </div>

            {/* Recurring clients */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-green-100 text-green-500 rounded-md">
                  <BiStats className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  Recurring clients
                </h3>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {recurringClientsCount}
              </div>
            </div>

            {/* Unpaid sessions */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="p-2 bg-red-100 text-red-500 rounded-md">
                  <BiDollar className="text-xl" />
                </div>
                <h3 className="ml-3 text-gray-500 text-sm font-medium">
                  Unpaid sessions
                </h3>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {unpaidSessions}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Overview & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User overview */}
        {isLoadingGeneral ? (
          <SectionSkeleton cardCount={1} />
        ) : (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <BiUserCircle className="text-[#DF9E7A] mr-2" />
              User Overview
            </h2>
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-100 text-purple-500 rounded-md mr-3">
                <BiGroup className="text-2xl" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {totalUsers}
                </div>
                <div className="text-sm text-gray-500">
                  Total users (avg. age: {averageAge || 0})
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              These are lifetime numbers across your entire practice.
            </p>
          </div>
        )}

        {/* Most active users */}
        {isLoadingGeneral ? (
          <SectionSkeleton cardCount={1} />
        ) : (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <BiGroup className="text-[#DF9E7A] mr-2" />
              Most Active Clients
            </h2>
            {mostActiveUsers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No booking history yet to show top clients.
              </p>
            ) : (
              <ul className="space-y-3">
                {mostActiveUsers.map((user) => (
                  <li
                    key={user.userId}
                    className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.name || "Unknown user"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.email || "No email"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {user.bookingCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        total sessions
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Metrics;
