import { apiSlice } from "../../app/api/apiSlice";

export const adminMetricsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------- METRICS ENDPOINTS --------------------
    getGeneralMetrics: builder.query({
      query: () => "/admin/metrics/general",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: ["GeneralMetrics"],
    }),

    getDashboardMetrics: builder.query({
      query: (period = "last_30d") => `/admin/metrics/?period=${period}`,
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: ["DashboardMetrics"],
    }),
  }),
});

export const {
  // Metrics endpoints
  useGetGeneralMetricsQuery,
  useGetDashboardMetricsQuery,
} = adminMetricsApiSlice;
