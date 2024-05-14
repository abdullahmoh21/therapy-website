import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { create } from '../../../../backend/models/User';

export const apiSlice =createApi({
    baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:3200" }),
    tagTypes: ['User', 'Booking'],
    endpoints: (builder) => ({
        // User endpoints
        createUser: builder.mutation({
            query: (data) => ({
                url: 'users',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['User'],
        }),
        getUser: builder.query({
            query: (username) => `users/${username}`,
            providesTags: ['User'],
        }),
        updateUser: builder.mutation({
            query: (username, data) => ({
                url: `users/${username}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['User'],
        }),
        getAllUsers: builder.query({
            query: () => `users`,
            providesTags: ['User'],
        }),
        deleteUser: builder.mutation({
            query: (username) => ({
                url: `users/${username}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['User'],
        }),
        // Booking endpoints
        getBookings: builder.query({
            query: () => `bookings/${username}`,
            providesTags: ['Booking'],
        }),
        getAllBookings: builder.query({
            query: () => `bookings`,
            providesTags: ['Booking'],
        }),
        deleteBooking: builder.mutation({
            query: (bookingId) => ({
                url: `bookings/${bookingId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Booking'],
        }),
    }),
})

export const { 
    useGetAllUsersQuery,
    useGetUserQuery, 
    useUpdateUserMutation, 
    useDeleteUserMutation, 
    useGetBookingsQuery,
    useGetAllBookingsQuery,
    useDeleteBookingMutation,
} = apiSlice;

