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

    // -------------------- METRICS ENDPOINT --------------------
    getMetrics: builder.query({
      query: () => "/admin/statistics",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: ["Metrics"],
      transformResponse: (response) => {
        // Transform backend statistics into the format expected by the frontend
        return {
          userMetrics: {
            totalUsers: response.totalUsers || 0,
            totalAdmins: response.totalAdmins || 0,
            newClients: response.newClients || 0,
          },
          taskMetrics: {
            thirtyDays: {
              totalTasks_30d: response.totalBookingsLast30Days || 0,
              completedTasks_30d: response.completedBookingsLast30Days || 0,
              incompleteTasks_30d:
                response.totalBookingsLast30Days -
                (response.completedBookingsLast30Days || 0),
              tasksByPriority: {
                high: response.highPriorityBookings_30d || 0,
                medium: response.mediumPriorityBookings_30d || 0,
                low: response.lowPriorityBookings_30d || 0,
              },
            },
            allTime: {
              lockedTasks: 0, // These don't apply to bookings but are used in the UI
              overDueTasks: 0, // These don't apply to bookings but are used in the UI
              totalTasks: response.totalBookings || 0,
              completedTasks: response.completedBookings || 0,
              incompleteTasks:
                response.totalBookings - (response.completedBookings || 0),
              highPriorityTasks: response.highPriorityBookings || 0,
              mediumPriorityTasks: response.mediumPriorityBookings || 0,
              lowPriorityTasks: response.lowPriorityBookings || 0,
            },
          },
          financialMetrics: {
            totalRevenue: response.totalRevenue || 0,
            totalProfit: response.totalProfit || 0,
          },
          topUsersByCompletedTasks_30d: [], // This would need to be added to the backend
        };
      },
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
  }),
});

export const {
  // User endpoints
  useGetAdminUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useInviteUserMutation,
  useResendInvitationMutation,

  // Booking endpoints
  useGetAdminBookingsQuery,
  useUpdateAdminBookingMutation,
  useDeleteAdminBookingMutation,

  // Payment endpoints
  useGetAdminPaymentsQuery,
  useUpdateAdminPaymentMutation,

  // Metrics endpoint
  useGetMetricsQuery,

  // System Health & Config endpoints
  useGetSystemHealthQuery,
  useUpdateConfigMutation,

  // Invitation endpoints
  useGetInvitedUsersQuery,
  useDeleteInvitationMutation,
} = adminApiSlice;
