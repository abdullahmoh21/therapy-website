import { apiSlice } from "../../app/api/apiSlice";

export const adminSystemApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------- SYSTEM HEALTH & CONFIG ENDPOINTS --------------------
    getSystemHealth: builder.query({
      query: () => "/admin/system-health",
      providesTags: ["SystemHealth"],
    }),

    // Get all configurations
    getAllConfigs: builder.query({
      query: () => "/config/all",
      providesTags: ["Configurations"],
    }),

    updateConfig: builder.mutation({
      query: ({ key, value }) => ({
        url: `/config/${key}`,
        method: "PATCH",
        body: { value },
      }),
      invalidatesTags: ["Configurations"],
    }),
  }),
});

export const {
  // System Health & Config endpoints
  useGetSystemHealthQuery,
  useGetAllConfigsQuery,
  useUpdateConfigMutation,
} = adminSystemApiSlice;
