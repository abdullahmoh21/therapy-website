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

    updateAdminBooking: builder.mutation({
      query: ({ bookingId, ...data }) => ({
        url: "/admin/bookings",
        method: "PATCH",
        body: { bookingId, ...data },
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
        url: "/admin/bookings",
        method: "DELETE",
        body: { bookingId },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: (result, error, arg) => [
        { type: "Booking", id: "LIST" },
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
        method: "POST",
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

    updateConfig: builder.mutation({
      query: ({ key, value }) => ({
        url: `/admin/config/${key}`,
        method: "PATCH",
        body: { value },
      }),
      invalidatesTags: ["SystemHealth"], // Invalidate health cache on update
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

    deleteInvitation: builder.mutation({
      query: (invitationId) => ({
        url: `/admin/invitations/${invitationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Invitation"],
    }),

    resendInvitation: builder.mutation({
      query: (inviteId) => ({
        url: `/admin/invite/${inviteId}/resend`,
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
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: (result, error, arg) => [{ type: "User", id: arg }],
    }),
  }),
});

export const {
  // User endpoints
  useGetAdminUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useInviteUserMutation,
  useResendInvitationMutation,
  useGetUserDetailsQuery,

  // Booking endpoints
  useGetAdminBookingsQuery,
  useGetBookingTimelineQuery,
  useUpdateAdminBookingMutation,
  useDeleteAdminBookingMutation,
  useGetAdminBookingDetailQuery,

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
  useUpdateConfigMutation,

  // Invitation endpoints
  useGetInvitedUsersQuery,
  useDeleteInvitationMutation,
} = adminApiSlice;
