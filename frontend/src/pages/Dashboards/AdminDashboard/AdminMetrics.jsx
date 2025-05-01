import React, { useState, useEffect } from "react";
import { Chart } from "primereact/chart";
import { Calendar } from "primereact/calendar";
import { ProgressSpinner } from "primereact/progressspinner";
import { TabView, TabPanel } from "primereact/tabview";
import { useGetMetricsQuery } from "../../../features/admin/adminApiSlice";
import {
  BiCalendar,
  BiLineChart,
  BiDollar,
  BiGroup,
  BiTime,
  BiRefresh,
} from "react-icons/bi";

const Metrics = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dateRange, setDateRange] = useState([
    new Date(new Date().setDate(new Date().getDate() - 30)),
    new Date(),
  ]);

  const {
    data: metricsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetMetricsQuery({
    startDate: dateRange[0]?.toISOString().split("T")[0],
    endDate: dateRange[1]?.toISOString().split("T")[0],
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Revenue data for chart
  const getRevenueChartData = () => {
    if (!metricsData?.revenueData) return null;

    const revenueData = [...metricsData.revenueData].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return {
      labels: revenueData.map((item) =>
        new Date(item.date).toLocaleDateString()
      ),
      datasets: [
        {
          label: "Revenue",
          data: revenueData.map((item) => item.amount),
          fill: false,
          borderColor: "#DF9E7A",
          tension: 0.4,
          backgroundColor: "rgba(223, 158, 122, 0.2)",
        },
      ],
    };
  };

  // Bookings data for chart
  const getBookingsChartData = () => {
    if (!metricsData?.bookingsData) return null;

    const bookingsData = [...metricsData.bookingsData].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return {
      labels: bookingsData.map((item) =>
        new Date(item.date).toLocaleDateString()
      ),
      datasets: [
        {
          label: "Paid Sessions",
          data: bookingsData.map((item) => item.paidSessions),
          backgroundColor: "#10B981",
        },
        {
          label: "Free Consultations",
          data: bookingsData.map((item) => item.freeConsultations),
          backgroundColor: "#6366F1",
        },
        {
          label: "Cancelled",
          data: bookingsData.map((item) => item.cancelled),
          backgroundColor: "#F43F5E",
        },
      ],
    };
  };

  // User acquisition data for chart
  const getUsersChartData = () => {
    if (!metricsData?.userData) return null;

    const userData = [...metricsData.userData].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return {
      labels: userData.map((item) => new Date(item.date).toLocaleDateString()),
      datasets: [
        {
          label: "New Users",
          data: userData.map((item) => item.newUsers),
          fill: true,
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          borderColor: "#6366F1",
          tension: 0.4,
        },
      ],
    };
  };

  // Prepare chart options
  const chartOptions = {
    maintainAspectRatio: false,
    aspectRatio: 1.5,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            family: "Inter, sans-serif",
          },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            family: "Inter, sans-serif",
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          font: {
            family: "Inter, sans-serif",
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        beginAtZero: true,
      },
    },
  };

  const revenueChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <ProgressSpinner
          style={{ width: "50px", height: "50px" }}
          strokeWidth="8"
          fill="var(--surface-ground)"
          animationDuration=".5s"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">
          {error?.data?.message || "Failed to load metrics data."}
        </span>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
        >
          <BiRefresh className="inline-block mr-1" /> Retry
        </button>
      </div>
    );
  }

  const { summary, revenueData, bookingsData, userData, conversionRates } =
    metricsData || {};

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Business Metrics</h1>
        <p className="mt-2 text-gray-600">
          Analytics and insights for your therapy practice
        </p>
      </header>

      {/* Date Range Selector */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-medium text-gray-700 flex items-center">
              <BiCalendar className="text-[#DF9E7A] mr-2" />
              Date Range
            </h2>
          </div>
          <div className="flex items-center">
            <Calendar
              value={dateRange}
              onChange={(e) => setDateRange(e.value)}
              selectionMode="range"
              readOnlyInput
              showIcon
              maxDate={new Date()}
              className="w-full sm:w-auto"
            />
            <button
              onClick={() => refetch()}
              className="ml-2 p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              title="Refresh data"
            >
              <BiRefresh />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-500 rounded-md">
              <BiDollar className="text-xl" />
            </div>
            <h3 className="ml-3 text-gray-500 text-sm font-medium">
              Total Revenue
            </h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary?.totalRevenue || 0)}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-2">
            <div className="p-2 bg-green-100 text-green-500 rounded-md">
              <BiTime className="text-xl" />
            </div>
            <h3 className="ml-3 text-gray-500 text-sm font-medium">
              Paid Sessions
            </h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {summary?.paidSessions || 0}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-2">
            <div className="p-2 bg-blue-100 text-blue-500 rounded-md">
              <BiGroup className="text-xl" />
            </div>
            <h3 className="ml-3 text-gray-500 text-sm font-medium">
              Free Consultations
            </h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {summary?.freeConsultations || 0}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-2">
            <div className="p-2 bg-purple-100 text-purple-500 rounded-md">
              <BiGroup className="text-xl" />
            </div>
            <h3 className="ml-3 text-gray-500 text-sm font-medium">
              New Clients
            </h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {summary?.newUsers || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mb-8">
        <TabView
          activeIndex={activeIndex}
          onTabChange={(e) => setActiveIndex(e.index)}
        >
          <TabPanel
            header={
              <div className="flex items-center">
                <BiDollar className="mr-2" />
                <span>Revenue</span>
              </div>
            }
          >
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                Revenue Over Time
              </h3>
              <div className="h-[400px]">
                {getRevenueChartData() ? (
                  <Chart
                    type="line"
                    data={getRevenueChartData()}
                    options={revenueChartOptions}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      No revenue data available for the selected period
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabPanel>

          <TabPanel
            header={
              <div className="flex items-center">
                <BiTime className="mr-2" />
                <span>Bookings</span>
              </div>
            }
          >
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                Booking Distribution
              </h3>
              <div className="h-[400px]">
                {getBookingsChartData() ? (
                  <Chart
                    type="bar"
                    data={getBookingsChartData()}
                    options={chartOptions}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      No booking data available for the selected period
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabPanel>

          <TabPanel
            header={
              <div className="flex items-center">
                <BiGroup className="mr-2" />
                <span>Users</span>
              </div>
            }
          >
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                New User Acquisitions
              </h3>
              <div className="h-[400px]">
                {getUsersChartData() ? (
                  <Chart
                    type="line"
                    data={getUsersChartData()}
                    options={chartOptions}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      No user acquisition data available for the selected period
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabPanel>
        </TabView>
      </div>

      {/* Conversion Metrics */}
      {conversionRates && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <BiLineChart className="text-[#DF9E7A] mr-2" />
            Conversion Metrics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-gray-50">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Consultation to Paid Session
              </h4>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {conversionRates.consultationToPaid}%
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Percentage of free consultations that convert to paid sessions
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Repeat Booking Rate
              </h4>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {conversionRates.repeatBookingRate}%
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Percentage of clients who book more than one session
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50">
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Avg. Sessions Per Client
              </h4>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                  {conversionRates.averageSessionsPerClient}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Average number of sessions booked per client
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Metrics;
