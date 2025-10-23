import { apiSlice } from "../../app/api/apiSlice";
import { createEntityAdapter } from "@reduxjs/toolkit";

// Create entity adapters
const usersAdapter = createEntityAdapter({
  selectId: (user) => user._id,
});

const bookingsAdapter = createEntityAdapter({
  selectId: (booking) => booking._id,
});

const paymentsAdapter = createEntityAdapter({
  selectId: (payment) => payment._id,
});

// Initial states
const usersInitialState = usersAdapter.getInitialState();
const bookingsInitialState = bookingsAdapter.getInitialState();
const paymentsInitialState = paymentsAdapter.getInitialState();

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------- USER ENDPOINTS --------------------
    getAdminUsers: builder.query({
      query: (params) => ({
        url: "/admin/users",
        method: "GET",
        params,
      }),
      transformResponse: (response) => {
        return {
          users: response.users || [],
          pagination: {
            totalUsers: response.totalUsers || 0,
            currentPage: response.page || 1,
            totalPages: response.totalPages || 1,
          },
        };
      },
      providesTags: ["User"],
    }),

    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: "DELETE",
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 || response.status === 204;
      },
      invalidatesTags: ["User"],
    }),

    updateUser: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/admin/users/${userId}`,
        method: "PATCH",
        body: data,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 || response.status === 204;
      },
      invalidatesTags: ["User"],
    }),

    // Set a user as recurring
    setUserRecurring: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/admin/users/${userId}/recurring`,
        method: "POST",
        body: data,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200;
      },
      invalidatesTags: ["User", "Booking"],
    }),

    // Stop recurring for a user
    stopUserRecurring: builder.mutation({
      query: (userId) => ({
        url: `/admin/users/${userId}/recurring`,
        method: "DELETE",
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200;
      },
      invalidatesTags: ["User", "Booking"],
    }),

    inviteUser: builder.mutation({
      query: (userData) => ({
        url: "/admin/invite",
        method: "POST",
        body: userData,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 || response.status === 201;
      },
      invalidatesTags: ["User"],
    }),

    resendInvitation: builder.mutation({
      query: (email) => ({
        url: "/admin/resendInvitation",
        method: "POST",
        body: { email },
      }),
    }),

    // -------------------- BOOKING ENDPOINTS --------------------
    getAdminBookings: builder.query({
      query: (params) => {
        /* URL‑encode everything (handles dates, arrays, etc.) */
        const searchParams = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;

          if (Array.isArray(value)) {
            // e.g. ?status=Active&status=Cancelled
            value.forEach((v) =>
              v !== undefined && v !== null && v !== ""
                ? searchParams.append(key, v)
                : null
            );
          } else {
            searchParams.append(key, value);
          }
        });

        return {
          url: `/admin/bookings?${searchParams.toString()}`, // encoded query‑string
          method: "GET",
        };
      },
      validateStatus: (response, result) => {
        // Allow 204 No Content status
        if (response.status === 204) return true;
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response, meta) => {
        // Handle 204 No Content
        if (meta?.response?.status === 204) {
          return {
            bookings: [],
            pagination: { totalBookings: 0, currentPage: 1, totalPages: 1 },
          };
        }
        // Handle regular response
        return {
          bookings: response.bookings || [],
          pagination: {
            totalBookings: response.totalBookings || 0,
            currentPage: response.page || 1,
            totalPages: response.totalPages || 1,
          },
        };
      },
      providesTags: (result) =>
        result && result.bookings // Check if result and result.bookings exist
          ? [
              { type: "Booking", id: "LIST" },
              ...result.bookings.map((booking) => ({
                type: "Booking",
                id: booking._id,
              })),
            ]
          : [{ type: "Booking", id: "LIST" }],
    }),

    // New endpoint for creating a booking
    createAdminBooking: builder.mutation({
      query: (bookingData) => ({
        url: "/admin/bookings",
        method: "POST",
        body: bookingData,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 201 && !result.isError;
      },
      invalidatesTags: [{ type: "Booking", id: "LIST" }],
    }),

    updateAdminBooking: builder.mutation({
      query: ({ bookingId, ...data }) => ({
        url: `/admin/bookings/${bookingId}`,
        method: "PATCH",
        body: data,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: (result, error, arg) => [
        { type: "Booking", id: arg.bookingId },
      ],
    }),

    deleteAdminBooking: builder.mutation({
      query: (bookingId) => ({
        url: `/admin/bookings/${bookingId}`,
        method: "DELETE",
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: [{ type: "Booking", id: "LIST" }],
    }),

    cancelAdminBooking: builder.mutation({
      query: ({ bookingId, reason, notifyUser }) => ({
        url: `/admin/bookings/${bookingId}/cancel`,
        method: "PATCH",
        body: { reason, notifyUser },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: (result, error, arg) => [
        { type: "Booking", id: "LIST" },
        { type: "Booking", id: arg.bookingId },
      ],
    }),

    // New endpoint for canceling a specific instance of a booking
    cancelBookingInstance: builder.mutation({
      query: ({ bookingId, instanceData }) => ({
        url: `/admin/bookings/${bookingId}/cancel-instance`,
        method: "PATCH",
        body: instanceData,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: (result, error, arg) => [
        { type: "Booking", id: "LIST" },
        { type: "Booking", id: arg.bookingId },
      ],
    }),

    getBookingTimeline: builder.query({
      query: () => "/admin/bookings/timeline",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
    }),

    // Single booking details - only fetched when needed
    getAdminBookingDetail: builder.query({
      query: (bookingId) => ({
        url: `/admin/bookings/${bookingId}`,
        method: "GET",
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: (result, error, arg) => [{ type: "Booking", id: arg }],
    }),

    // -------------------- PAYMENT ENDPOINTS --------------------
    getAdminPayments: builder.query({
      query: (params) => ({
        url: "/admin/payments",
        method: "GET",
        params,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response) => {
        return {
          payments: response.payments || [],
          pagination: {
            totalPayments: response.totalPayments || 0,
            currentPage: response.page || 1,
            totalPages: response.totalPages || 1,
          },
        };
      },
      providesTags: ["Payment"],
    }),

    updateAdminPayment: builder.mutation({
      query: ({ paymentId, ...data }) => ({
        url: "/admin/payments",
        method: "PATCH",
        body: { paymentId, ...data },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: ["Payment"],
    }),

    markPaymentAsPaid: builder.mutation({
      query: (paymentId) => ({
        url: `/admin/payments/${paymentId}/paid`,
        method: "PATCH", // Changed from POST to PATCH
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: (result, error, arg) => {
        // If the backend returns the associated bookingId in the response
        const bookingId = result?.bookingId;

        return [
          { type: "Booking", id: "LIST" },
          { type: "Payment", id: "LIST" },
          { type: "Payment", id: arg },
          // If we have a bookingId in the result, invalidate that specific booking
          ...(bookingId ? [{ type: "Booking", id: bookingId }] : []),
          // Also invalidate any existing booking detail queries
          { type: "Booking", id: undefined },
        ];
      },
    }),

    // -------------------- METRICS ENDPOINTS --------------------

    getMonthlyMetrics: builder.query({
      query: () => "/admin/metrics/month",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: ["MonthlyMetrics"],
    }),

    getYearlyMetrics: builder.query({
      query: () => "/admin/metrics/year",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: ["YearlyMetrics"],
    }),

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

    // -------------------- SYSTEM HEALTH & CONFIG ENDPOINTS --------------------
    getSystemHealth: builder.query({
      query: () => "/admin/system-health",
      providesTags: ["SystemHealth"], // Tag for caching
    }),

    // New endpoint for getting all configurations
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
      invalidatesTags: ["Configurations"], // Invalidate configs cache on update
    }),

    // -------------------- INVITATION ENDPOINTS --------------------
    getInvitedUsers: builder.query({
      query: (params) => {
        /* URL‑encode everything (handles dates, arrays, etc.) */
        const searchParams = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;

          if (Array.isArray(value)) {
            value.forEach((item) => searchParams.append(key, item));
          } else {
            searchParams.append(key, value);
          }
        });

        return {
          url: `/admin/invitations?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Invitation"],
    }),

    inviteUser: builder.mutation({
      query: (userData) => ({
        url: "/admin/invitations",
        method: "POST",
        body: userData,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 || response.status === 201;
      },
      invalidatesTags: ["User"],
    }),

    deleteInvitation: builder.mutation({
      query: (invitationId) => ({
        url: `/admin/invitations/${invitationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Invitation"],
    }),

    resendInvitation: builder.mutation({
      query: (invitationId) => ({
        url: `/admin/invitations/${invitationId}/resend`,
        method: "POST",
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Get user details - fetch a single user's full details
    getUserDetails: builder.query({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: "GET",
      }),
      validateStatus: (response, result) => {
        return response.status === 200 && !result?.error;
      },
      providesTags: (result, error, arg) => [{ type: "User", id: arg }],
    }),

    searchUsers: builder.query({
      query: (searchQuery) => ({
        url: `/admin/users/search`,
        method: "GET",
        params: { q: searchQuery, limit: 10 },
      }),
      validateStatus: (response, result) => {
        return response.status === 200 && !result?.error;
      },
    }),

    // -------------------- GOOGLE CALENDAR ENDPOINTS --------------------
    getGoogleCalendarStatus: builder.query({
      query: () => ({
        url: "/admin/google-calendar/status",
        method: "GET",
      }),
      providesTags: ["GoogleCalendar"],
    }),

    getGoogleCalendarAuthUrl: builder.query({
      query: () => ({
        url: "/admin/google-calendar/auth-url",
        method: "GET",
      }),
    }),

    handleGoogleCalendarCallback: builder.mutation({
      query: (code) => ({
        url: "/admin/google-calendar/callback",
        method: "POST",
        body: { code },
      }),
      invalidatesTags: ["GoogleCalendar"],
    }),

    testGoogleCalendarConnection: builder.mutation({
      query: () => ({
        url: "/admin/google-calendar/test",
        method: "POST",
      }),
      invalidatesTags: ["GoogleCalendar"],
    }),

    disconnectGoogleCalendar: builder.mutation({
      query: () => ({
        url: "/admin/google-calendar/disconnect",
        method: "POST",
      }),
      invalidatesTags: ["GoogleCalendar"],
    }),
  }),
});

export const {
  // User endpoints
  useGetAdminUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useSetUserRecurringMutation,
  useStopUserRecurringMutation,
  useInviteUserMutation,
  useResendInvitationMutation,
  useGetUserDetailsQuery,
  useLazySearchUsersQuery,

  // Booking endpoints
  useGetAdminBookingsQuery,
  useGetBookingTimelineQuery,
  useUpdateAdminBookingMutation,
  useDeleteAdminBookingMutation,
  useGetAdminBookingDetailQuery,
  useCreateAdminBookingMutation, // New hook
  useCancelAdminBookingMutation, // New hook
  useCancelBookingInstanceMutation, // New hook

  // Payment endpoints
  useGetAdminPaymentsQuery,
  useUpdateAdminPaymentMutation,
  useMarkPaymentAsPaidMutation,

  // Metrics endpoints
  useGetMonthlyMetricsQuery,
  useGetYearlyMetricsQuery,
  useGetGeneralMetricsQuery,

  // System Health & Config endpoints
  useGetSystemHealthQuery,
  useGetAllConfigsQuery,
  useUpdateConfigMutation,

  // Invitation endpoints
  useGetInvitedUsersQuery,
  useDeleteInvitationMutation,

  // Google Calendar endpoints
  useGetGoogleCalendarStatusQuery,
  useGetGoogleCalendarAuthUrlQuery,
  useLazyGetGoogleCalendarAuthUrlQuery,
  useHandleGoogleCalendarCallbackMutation,
  useTestGoogleCalendarConnectionMutation,
  useDisconnectGoogleCalendarMutation,
} = adminApiSlice;
