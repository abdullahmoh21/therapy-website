import {
    createSelector,
    createEntityAdapter
} from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice"

const usersAdapter = createEntityAdapter({})

const initialState = usersAdapter.getInitialState()

export const usersApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getAllUsers: builder.query({
            query: () => '/users',
            validateStatus: (response, result) => {
                return response.status === 200 && !result.isError
            },
            transformResponse: responseData => {
                const loadedUsers = responseData.map(user => {
                    user.id = user._id
                    return user
                });
                const temp = usersAdapter.setAll(initialState, loadedUsers)
                console.log(`in transfromResponse: ${JSON.stringify(temp)}`)
                return temp
            },
            providesTags: (result, error, arg) => {
                if (result?.ids) {
                    return [
                        { type: 'User', id: 'LIST' },
                        ...result.ids.map(id => ({ type: 'User', id }))
                    ]
                } else return [{ type: 'User', id: 'LIST' }]
            }
        }),
        getMyUser: builder.query({
            query: () => '/users/me',
            validateStatus: (response, result) => {
                return response.status === 200 && !result.isError
            },
            transformResponse: (responseData) => {
                const MyUser = { ...responseData, id: responseData._id };
                return usersAdapter.setOne(initialState, MyUser);
            },
            providesTags: (result, error, arg) => {
                if (result?.id) {
                    return [
                    { type: 'User', id: result.id }
                    ]
                } else return []
            }
        }),
        resendEmailVerification: builder.mutation({
            query: () => 'users/verifyemail',
            validateStatus: (response, result) => {
                return response.status === 200 && !result.isError
            },
        }),
        verifyEmail: builder.mutation({
            query: (token) => `users/verifyemail/${token}`,
            validateStatus: (response, result) => {
                return response.status === 200 && !result.isError
            },
        }),
        updateMyUser: builder.mutation({
            query: initialUserData => ({
                url: '/users/me',
                method: 'PATCH',
                body: {
                    ...initialUserData,
                }
            }),
        }),
        deleteUser: builder.mutation({
            query: (email) => ({
                url: `/users`,
                method: 'DELETE',
                body: { email}
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'User', id: arg.email }
            ]
        }),
    }),
})

export const {
    useGetAllUsersQuery,
    useDeleteUserMutation,
    useGetMyUserQuery,
    useResendEmailVerificationMutation,
    useVerifyEmailMutation,
    useUpdateMyUserMutation
} = usersApiSlice

export const selectMyUser = usersApiSlice.endpoints.getMyUser.select()

// returns the query result object
export const selectUsersResult = usersApiSlice.endpoints.getAllUsers.select()

// creates memoized selector
const selectUsersData = createSelector(
    selectUsersResult,
    usersResult => usersResult.data // normalized state object with ids & entities
)

//getSelectors creates these selectors and we rename them with aliases using destructuring
export const {
    selectAll: selectAllUsers,
    selectById: selectUserById,
    selectIds: selectUserIds
    // Pass in a selector that returns the users slice of state
} = usersAdapter.getSelectors(state => selectUsersData(state) ?? initialState)