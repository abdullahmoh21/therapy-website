import {
    createSelector,
    createEntityAdapter
} from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice"

const bookingsAdapter = createEntityAdapter({})

const initialState = bookingsAdapter.getInitialState()

export const bookingsApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getBookings: builder.query({
            query: () => '/bookings',
            validateStatus: (response, result) => {
                return response.status === 200 && !result.isError
            },
            transformResponse: responseData => {
                const loadedBookings = responseData.map(booking => {
                    booking.id = booking._id
                    return booking
                });
                return bookingsAdapter.setAll(initialState, loadedBookings)
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
        addNewBooking: builder.mutation({
            query: initialBookingData => ({
                url: '/bookings',
                method: 'POST',
                body: {
                    ...initialBookingData,
                }
            }),
            invalidatesTags: [
                { type: 'Booking', id: "LIST" }
            ]
        }),
        updateBooking: builder.mutation({
            query: initialBookingData => ({
                url: '/bookings',
                method: 'PATCH',
                body: {
                    ...initialBookingData,
                }
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Booking', id: arg.id }
            ]
        }),
        deleteBooking: builder.mutation({
            query: ({ id }) => ({
                url: `/bookings`,
                method: 'DELETE',
                body: { id }
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Booking', id: arg.id }
            ]
        }),
    }),
})

export const {
    useGetBookingsQuery,
    useAddNewBookingMutation,
    useUpdateBookingMutation,
    useDeleteBookingMutation,
} = bookingsApiSlice

// returns the query result object
export const selectBookingsResult = bookingsApiSlice.endpoints.getBookings.select()

// creates memoized selector
const selectBookingsData = createSelector(
    selectBookingsResult,
    bookingsResult => bookingsResult.data // normalized state object with ids & entities
)

//getSelectors creates these selectors and we rename them with aliases using destructuring
export const {
    selectAll: selectAllBookings,
    selectById: selectBookingById,
    selectIds: selectBookingIds
    // Pass in a selector that returns the bookings slice of state
} = bookingsAdapter.getSelectors(state => selectBookingsData(state) ?? initialState)