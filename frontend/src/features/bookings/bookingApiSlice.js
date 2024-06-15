import {
    createEntityAdapter
} from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice"

const bookingsAdapter = createEntityAdapter({
    selectId: (booking) => booking._id
})

const initialState = bookingsAdapter.getInitialState()

export const bookingsApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getAllBookings: builder.query({
            query: () => '/bookings',
            validateStatus: (response, result) => {
                //if no response from server, throw an error
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
            },
            transformResponse: responseData => {
                if (responseData) {
                    const loadedBookings = responseData.map(booking => {
                        return booking;
                    });
                    const temp = bookingsAdapter.setAll(initialState, loadedBookings);
                    return temp;
                } else {
                    return initialState;
                }
            },
            providesTags: (result, error, arg) => {
                if (result?.ids) {
                    return [
                        { type: 'Booking', id: 'LIST' },
                        ...result.ids.map(id => ({ type: 'Booking', id }))
                    ]
                } else return [{ type: 'Booking', id: 'LIST' }]
            }
        }),
        getMyBookings: builder.query({
            query: () => '/bookings',
            validateStatus: (response, result) => {
                if (response.status === undefined) { 
                    return fasle
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
                    return [
                    { type: 'Booking', id: result.id }
                    ]
                } else return []
            }
        }),
        newBookingLink : builder.query({
            query: () => '/bookings/calendly',
            validateStatus: (response, result) => {
                if (response.status === undefined) { 
                    return false;
                }
                return response.status === 200 && !result.isError;
            },
            transformResponse: (response, meta, arg) => {
                // Assuming the response is { link: "http://example.com" }
                return response.link; // Directly return the link for ease of use
            },
        }),
        deleteBooking: builder.mutation({
            query: (email) => ({
                url: `/bookings`,
                method: 'DELETE',
                body: { email}
            }),
            validateStatus: (response, result) => {
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
            },
            invalidatesTags: (result, error, arg) => [
                { type: 'Booking', id: arg.email }
            ]
        }),
    }),
})

export const {
    useGetAllBookingsQuery,
    useDeleteBookingMutation,
    useGetMyBookingsQuery,
    useNewBookingLinkQuery
} = bookingsApiSlice
