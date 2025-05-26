import { createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice";

const bookingsAdapter = createEntityAdapter({
  selectId: (booking) => booking._id,
});

const initialState = bookingsAdapter.getInitialState();

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
    getNoticePeriod: builder.query({
      query: () => "/bookings/noticePeriod",
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
        if (responseData) {
          return bookingsAdapter.setAll(initialState, responseData);
        } else {
          return initialState;
        }
      },
      providesTags: (result, error, arg) => {
        if (result?.id) {
          return [{ type: "Booking", id: result.id }];
        } else return [];
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
      transformResponse: (response, meta, arg) => {
        return response.link;
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
  }),
});

export const {
  useGetBookingQuery,
  useGetNoticePeriodQuery,
  useGetMyActiveBookingsQuery,
  useGetNewBookingLinkQuery,
  useGetCancellationUrlQuery,
} = bookingsApiSlice;
