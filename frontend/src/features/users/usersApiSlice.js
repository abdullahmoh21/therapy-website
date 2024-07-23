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
            query: () => '/users/admin',
            validateStatus: (response, result) => {
                //if no response from server, throw an error
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
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
        deleteUser: builder.mutation({
            query: (email) => ({
                url: `/users/admin`,
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
                { type: 'User', id: arg.email }
            ]
        }),
        getMyUser: builder.query({
            query: () => '/users',
            validateStatus: (response, result) => {
                if (response.status === undefined) { 
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
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
        updateMyUser: builder.mutation({
            query: initialUserData => ({
                url: '/users',
                method: 'PATCH',
                body: {
                    ...initialUserData,
                }
            }),
            validateStatus: (response, result) => {
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
            },
        }),
        resendEmailVerification: builder.mutation({
            query: (body) => ({
                url: 'users/resendEmailVerification',
                method: 'POST',
                body
            }),
            validateStatus: (response, result) => {
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
            },
        }),
        verifyEmail: builder.mutation({
            query: (token) => `users/verifyEmail?token=${token}`,
            validateStatus: (response, result) => {
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
            },
        }),
        forgotPassword: builder.mutation({
            query: (email) => ({
                url: '/users/forgotPassword',
                method: 'POST',
                body: { email }
            }),
            validateStatus: (response, result) => {
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
            },
        }),
        resetPassword: builder.mutation({
            query: (request) => ({
                url: `/users/resetPassword?token=${request.token}`,
                method: 'POST',
                body: { password: request.password, confirmPassword: request.confirmPassword }
            }),
            validateStatus: (response, result) => {
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
            },
        }),
    }),
})

export const {
    useGetAllUsersQuery,
    useDeleteUserMutation,
    useGetMyUserQuery,
    useUpdateMyUserMutation,
    useResendEmailVerificationMutation,
    useVerifyEmailMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation
} = usersApiSlice

const selectRawUser = (state) => usersApiSlice.endpoints.getMyUser.select()(state);

export const selectMyUser = createSelector( //return a memoized selector
    [selectRawUser],
    (rawUser) => {
      if (!rawUser?.data) return null;
  
      const entities = rawUser.data.entities;
      const fetchedUser = entities && entities[Object.keys(entities)[0]];
  
      if (!fetchedUser) return null;
  
      const dob = new Date(fetchedUser.DOB);
      const formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;
  
      return { ...fetchedUser, DOB: formattedDob };
    }
  );
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