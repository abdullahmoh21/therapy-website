import { createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice";
import { getStatusDisplay } from "../../pages/Dashboards/UserDashboard/Billing/billingUtils";

const bookingsAdapter = createEntityAdapter({
  selectId: (booking) => booking._id,
});
const pastBookingsAdapter = createEntityAdapter({
  selectId: (booking) => booking._id,
});

const initialState = bookingsAdapter.getInitialState();
const initialPastBookingsState = pastBookingsAdapter.getInitialState();

// Helper functions for formatting
const formatDateTime = (dateString, includeTime = false) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const optionsDate = { year: "numeric", month: "short", day: "numeric" };
  const optionsTime = { hour: "2-digit", minute: "2-digit", hour12: true };
  let formatted = date.toLocaleDateString("en-US", optionsDate);
  if (includeTime) {
    formatted += ", " + date.toLocaleTimeString("en-US", optionsTime);
  }
  return formatted;
};

export const bookingsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBooking: builder.query({
      query: (id) => `/bookings/${id}`,
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: (result, error, id) => [{ type: "Booking", id }],
    }),
    getPastBookings: builder.query({
      query: (params) => ({ url: "/bookings/all", params }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response) => {
        try {
          const rawBookings = response.bookings || [];
          const processedBookings = rawBookings.map((booking) => {
            // Determine event name based on source
            let eventName = "Session";

            if (booking.source === "calendly" && booking.calendly?.eventName) {
              eventName = booking.calendly.eventName;
            } else if (
              booking.source === "system" &&
              booking.recurring?.state
            ) {
              // Format recurring booking name
              const intervals = {
                weekly: "Weekly",
                biweekly: "Bi-weekly",
                monthly: "Monthly",
              };
              const intervalLabel =
                intervals[booking.recurring.interval] || "Recurring";
              eventName = `${intervalLabel} Session`;
            } else if (booking.source === "admin") {
              eventName = "Admin Scheduled Session";
            }

            return {
              ...booking,
              payment: booking.payment || {},
              formattedEventStartTime: formatDateTime(
                booking.eventStartTime,
                true
              ),
              customerBookingId: booking.bookingId,
              eventName, // Add computed event name
            };
          });

          return {
            bookings: pastBookingsAdapter.setAll(
              initialPastBookingsState,
              processedBookings
            ),
            pagination: {
              totalBookings: response.totalBookings || 0,
              currentPage: response.page || 1,
              totalPages: response.totalPages || 1,
            },
          };
        } catch (error) {
          console.error("Error in transformResponse:", error);
          return {
            bookings: pastBookingsAdapter.getInitialState(),
            pagination: {
              totalBookings: 0,
              currentPage: 1,
              totalPages: 1,
            },
          };
        }
      },
      providesTags: (result) => {
        if (!result?.bookings?.ids) {
          return [{ type: "PastBookings", id: "LIST" }];
        }
        return [
          { type: "PastBookings", id: "LIST" },
          ...result.bookings.ids.map((id) => ({ type: "PastBookings", id })),
        ];
      },
    }),
    getNoticePeriod: builder.query({
      query: () => "/config/noticePeriod",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          return false;
        }
        return response.status === 200 && !result.isError;
      },
    }),
    getMyActiveBookings: builder.query({
      query: () => "/bookings",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          return false;
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (responseData) => {
        // Backend now returns simple array of one-off bookings
        if (responseData && Array.isArray(responseData)) {
          return bookingsAdapter.setAll(initialState, responseData);
        }
        return initialState;
      },
      providesTags: (result, error, arg) => {
        return [{ type: "Booking", id: "LIST" }];
      },
    }),
    getNewBookingLink: builder.query({
      query: () => "/bookings/calendly",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          return false;
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response) => {
        return response;
      },
    }),
    getCancellationUrl: builder.query({
      query: (bookingId) => ({
        url: "/bookings/cancellation",
        body: { bookingId },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          return false;
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response, meta, arg) => {
        return response.link;
      },
    }),
    getSessionPrice: builder.query({
      query: () => "/config/sessionPrice",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          return false;
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response) => response.sessionPrice,
    }),
    getIntlSessionPrice: builder.query({
      query: () => "/config/intlSessionPrice",
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          return false;
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response) => response.sessionPrice,
    }),
    cancelMyBooking: builder.mutation({
      query: ({ bookingId, reason }) => ({
        url: `/bookings/${bookingId}/cancel`,
        method: "PUT",
        body: { reason },
      }),
      invalidatesTags: (result, error, { bookingId }) => [
        { type: "Booking", id: "LIST" },
        { type: "Booking", id: bookingId },
        { type: "PastBookings", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetBookingQuery,
  useGetPastBookingsQuery,
  useGetNoticePeriodQuery,
  useGetMyActiveBookingsQuery,
  useGetNewBookingLinkQuery,
  useGetCancellationUrlQuery,
  useGetSessionPriceQuery,
  useGetIntlSessionPriceQuery,
  useCancelMyBookingMutation,
} = bookingsApiSlice;
