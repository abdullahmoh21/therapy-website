import { apiSlice } from "../../app/api/apiSlice";

export const adminBookingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
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
  }),
});

export const {
  // Booking endpoints
  useGetAdminBookingsQuery,
  useGetBookingTimelineQuery,
  useUpdateAdminBookingMutation,
  useDeleteAdminBookingMutation,
  useGetAdminBookingDetailQuery,
  useCreateAdminBookingMutation,
  useCancelAdminBookingMutation,
  useCancelBookingInstanceMutation,
} = adminBookingApiSlice;
