import React, { useState } from "react";
import { ProgressSpinner } from "primereact/progressspinner";
import {
  useGetMonthlyMetricsQuery,
  useGetYearlyMetricsQuery,
  useGetGeneralMetricsQuery,
} from "../../../features/admin/adminApiSlice";
import {
  BiLineChart,
  BiDollar,
  BiGroup,
  BiTime,
  BiRefresh,
  BiCheckCircle,
  BiXCircle,
  BiMessageDetail,
  BiUserCircle,
  BiMap,
  BiStats,
} from "react-icons/bi";
import LoadingPage from "../../LoadingPage";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Custom Skeleton components
const MetricCardSkeleton = () => (
  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 animate-pulse">
    <div className="flex items-center mb-2">
      <div className="w-10 h-10 bg-gray-200 rounded-md"></div>
      <div className="ml-3 h-4 bg-gray-200 rounded w-24"></div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-32 mt-2"></div>
  </div>
);

const SectionSkeleton = ({ title, cardCount = 2 }) => (
  <div className="mb-6">
    <div className="flex items-center mb-4">
      <div className="w-6 h-6 bg-gray-200 rounded-full mr-2"></div>
      <div className="h-6 bg-gray-200 rounded w-48"></div>
    </div>
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${
        cardCount > 2 ? "lg:grid-cols-4" : ""
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
    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
    <div className="h-64 bg-gray-100 rounded w-full"></div>
  </div>
);

const Metrics = () => {
  const [timeFrame, setTimeFrame] = useState("lastMonth");

  const {
    data: monthlyData,
    isLoading: isLoadingMonthly,
    isError: isErrorMonthly,
    error: errorMonthly,
    refetch: refetchMonthly,
  } = useGetMonthlyMetricsQuery();

  const {
    data: yearlyData,
    isLoading: isLoadingYearly,
    isError: isErrorYearly,
    error: errorYearly,
    refetch: refetchYearly,
  } = useGetYearlyMetricsQuery();

  const {
    data: generalData,
    isLoading: isLoadingGeneral,
    isError: isErrorGeneral,
    error: errorGeneral,
    refetch: refetchGeneral,
  } = useGetGeneralMetricsQuery();

  // Function to handle refetching all data
  const refetchAll = () => {
    refetchMonthly();
    refetchYearly();
    refetchGeneral();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("ur-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Check if all initial data is loading
  if (isLoadingMonthly && isLoadingYearly && isLoadingGeneral) {
    return <LoadingPage />;
  }

  // Check if there are any errors
  const hasErrors = isErrorMonthly || isErrorYearly || isErrorGeneral;
  if (hasErrors) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">
          {errorMonthly?.data?.message ||
            errorYearly?.data?.message ||
            errorGeneral?.data?.message ||
            "Failed to load metrics data."}
        </span>
        <button
          onClick={refetchAll}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
        >
          <BiRefresh className="inline-block mr-1" /> Retry
        </button>
      </div>
    );
  }

  // Get the current data based on timeFrame
  const currentData = timeFrame === "lastMonth" ? monthlyData : yearlyData;
  const isCurrentDataLoading =
    timeFrame === "lastMonth" ? isLoadingMonthly : isLoadingYearly;

  // Format label text based on time frame
  const timeFrameLabel = timeFrame === "lastMonth" ? "Last Month" : "Last Year";

  // Prepare chart data for meeting types
  const meetingTypeData = {
    labels: ["Online", "In-Person"],
    datasets: [
      {
        data: [
          currentData?.bookings?.meetingTypes?.online || 0,
          currentData?.bookings?.meetingTypes?.inPerson || 0,
        ],
        backgroundColor: ["rgba(54, 162, 235, 0.6)", "rgba(75, 192, 192, 0.6)"],
        borderColor: ["rgba(54, 162, 235, 1)", "rgba(75, 192, 192, 1)"],
        borderWidth: 1,
      },
    ],
  };

  // Prepare monthly profit chart data (for yearly view)
  const profitChartData = yearlyData?.profitChart
    ? {
        labels: yearlyData.profitChart.labels,
        datasets: [
          {
            label: "Monthly Profit",
            data: yearlyData.profitChart.data,
            fill: true,
            backgroundColor: "rgba(223, 158, 122, 0.2)",
            borderColor: "rgba(223, 158, 122, 1)",
            tension: 0.4,
          },
        ],
      }
    : null;

  const profitChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Monthly Profit Trend",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return formatCurrency(value).replace("PKR", "");
          },
        },
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Business Metrics</h1>
        <p className="mt-2 text-gray-600">
          Analytics and insights for your therapy practice
        </p>
      </header>

      {/* Time Frame Selector */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-medium text-gray-700 flex items-center">
              <BiLineChart className="text-[#DF9E7A] mr-2" />
              Time Period
            </h2>
          </div>
          <div className="flex items-center">
            <div className="inline-flex shadow-sm rounded-md">
              <button
                onClick={() => setTimeFrame("lastMonth")}
                className={`px-4 py-2 font-medium text-sm rounded-l-md border ${
                  timeFrame === "lastMonth"
                    ? "bg-[#DF9E7A] text-white border-[#DF9E7A]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                } transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#DF9E7A]`}
              >
                Last Month
              </button>
              <button
                onClick={() => setTimeFrame("lastYear")}
                className={`px-4 py-2 font-medium text-sm rounded-r-md border ${
                  timeFrame === "lastYear"
                    ? "bg-[#DF9E7A] text-white border-[#DF9E7A]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                } transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-[#DF9E7A]`}
              >
                Last Year
              </button>
            </div>
            <button
              onClick={refetchAll}
              className="ml-2 p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              title="Refresh data"
            >
              <BiRefresh />
            </button>
          </div>
        </div>
      </div>

      {/* Profit and Financial Summary */}
      {isCurrentDataLoading ? (
        <SectionSkeleton title="Financial Overview" cardCount={1} />
      ) : (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <BiDollar className="text-[#DF9E7A] mr-2" />
            Financial Overview - {timeFrameLabel}
          </h2>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-2">
              <div className="p-2 bg-green-100 text-green-500 rounded-md">
                <BiDollar className="text-xl" />
              </div>
              <h3 className="ml-3 text-gray-500 text-sm font-medium">
                Total Profit
              </h3>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentData?.profit || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Meeting Type Distribution Chart */}
        {isCurrentDataLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Meeting Type Distribution
            </h3>
            <div className="h-64 flex items-center justify-center">
              <Pie data={meetingTypeData} />
            </div>
          </div>
        )}

        {/* Monthly Profit Chart - only for yearly view */}
        {timeFrame === "lastYear" ? (
          isLoadingYearly ? (
            <ChartSkeleton />
          ) : (
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Monthly Profit Trend
              </h3>
              <div className="h-64">
                {profitChartData && (
                  <Line data={profitChartData} options={profitChartOptions} />
                )}
              </div>
            </div>
          )
        ) : (
          // Show a different chart or content for monthly view
          !isCurrentDataLoading && (
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                Sessions Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900">
                    {currentData?.bookings?.completed || 0}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Completed</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900">
                    {currentData?.bookings?.canceled || 0}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Canceled</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900">
                    {currentData?.bookings?.meetingTypes?.online || 0}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Online</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900">
                    {currentData?.bookings?.meetingTypes?.inPerson || 0}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">In-Person</div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* User Demographics - Simplified */}
        {isLoadingGeneral ? (
          <MetricCardSkeleton />
        ) : (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-2">
              <div className="p-2 bg-purple-100 text-purple-500 rounded-md">
                <BiUserCircle className="text-xl" />
              </div>
              <h3 className="ml-3 text-gray-500 text-sm font-medium">
                Total Users
              </h3>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">
                {generalData?.users?.totalCount || 0}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                (avg. age: {Math.round(generalData?.users?.averageAge || 0)})
              </span>
            </div>
          </div>
        )}

        {/* New Users in Current Period */}
        {isCurrentDataLoading ? (
          <MetricCardSkeleton />
        ) : (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-2">
              <div className="p-2 bg-blue-100 text-blue-500 rounded-md">
                <BiGroup className="text-xl" />
              </div>
              <h3 className="ml-3 text-gray-500 text-sm font-medium">
                New Users
              </h3>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">
                {currentData?.users?.new || 0}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                in {timeFrameLabel.toLowerCase()}
              </span>
            </div>
          </div>
        )}

        {/* Inquiries - Simplified */}
        {isCurrentDataLoading ? (
          <MetricCardSkeleton />
        ) : (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-2">
              <div className="p-2 bg-yellow-100 text-yellow-500 rounded-md">
                <BiMessageDetail className="text-xl" />
              </div>
              <h3 className="ml-3 text-gray-500 text-sm font-medium">
                Inquiries
              </h3>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">
                {currentData?.inquiries?.total || 0}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                total inquiries
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Inquiry Types - Top 3 Only */}
      {!isCurrentDataLoading &&
        Object.keys(currentData?.inquiries?.typeDistribution || {}).length >
          0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Top Inquiry Types
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(currentData.inquiries.typeDistribution).map(
                ([type, count]) => (
                  <div
                    key={type}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <div className="font-medium text-gray-900">{type}</div>
                    <div className="text-2xl font-bold text-[#DF9E7A]">
                      {count}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default Metrics;
