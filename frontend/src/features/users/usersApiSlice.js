import { createSelector, createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice";

const usersAdapter = createEntityAdapter({});

const initialState = usersAdapter.getInitialState();

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyUser: builder.query({
      query: () => "/user",
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
          return [{ type: "User", id: result.id }];
        } else return [];
      },
    }),
    updateMyUser: builder.mutation({
      query: (initialUserData) => ({
        url: "/user",
        method: "PATCH",
        body: {
          ...initialUserData,
        },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false; // Treat as an error
        }
        return response.status === 200 && !result.isError;
      },
    }),
    resendEmailVerification: builder.mutation({
      query: (body) => ({
        url: "users/resendEmailVerification",
        method: "POST",
        body,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false; // Treat as an error
        }
        return response.status === 200 && !result.isError;
      },
    }),
    verifyEmail: builder.mutation({
      query: (token) => ({
        url: "users/verifyEmail",
        method: "POST",
        body: { token },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false; // Treat as an error
        }
        return response.status === 200 && !result.isError;
      },
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({
        url: "/users/forgotPassword",
        method: "POST",
        body: { email },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false; // Treat as an error
        }
        return response.status === 200 && !result.isError;
      },
    }),
    resetPassword: builder.mutation({
      query: (request) => ({
        url: `/users/resetPassword?token=${request.token}`,
        method: "POST",
        body: {
          password: request.password,
          confirmPassword: request.confirmPassword,
        },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false; // Treat as an error
        }
        return response.status === 200 && !result.isError;
      },
    }),
    contactMe: builder.mutation({
      query: (body) => ({
        url: "/contactMe",
        method: "POST",
        body,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false; // Treat as an error
        }
        return response.status === 200 && !result.isError;
      },
    }),
  }),
});

export const {
  useGetMyUserQuery,
  useUpdateMyUserMutation,
  useResendEmailVerificationMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useContactMeMutation,
} = usersApiSlice;

const selectRawUser = (state) =>
  usersApiSlice.endpoints.getMyUser.select()(state);

export const selectMyUser = createSelector(
  //return a memoized selector
  [selectRawUser],
  (rawUser) => {
    if (!rawUser?.data) return null;

    const entities = rawUser.data.entities;
    const fetchedUser = entities && entities[Object.keys(entities)[0]];

    if (!fetchedUser) return null;

    // If DOB exists, format it
    let formattedDob = null;
    if (fetchedUser.DOB) {
      const dob = new Date(fetchedUser.DOB);
      formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;
      return { ...fetchedUser, DOB: formattedDob };
    }

    return fetchedUser;
  }
);

// These selectors for multiple users are not used since there's no getAllUsers endpoint
// To avoid errors, we'll just use the adapter functions directly with the initial state
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
} = usersAdapter.getSelectors(() => initialState);
