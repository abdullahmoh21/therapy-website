import { createSelector, createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice";
import pagination from "../../components/pagination";
import { getStatusDisplay } from "../../pages/Dashboards/UserDashboard/Billing/billingUtils";

const usersAdapter = createEntityAdapter({});
const pastBookingsAdapter = createEntityAdapter({
  selectId: (booking) => booking._id,
});

const initialState = usersAdapter.getInitialState();
const initialPastBookingsState = pastBookingsAdapter.getInitialState();

// Helper functions for booking data formatting
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
    getPastBookings: builder.query({
      query: (params) => ({ url: "/user/bookings", params }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response) => {
        const rawBookings = response.bookings || [];
        // Backend now sorts and provides all necessary fields.
        // Frontend processing focuses on formatting for display if still needed.
        const processedBookings = rawBookings.map((booking) => ({
          ...booking,
          payment: booking.payment || {},
          formattedEventStartTime: formatDateTime(booking.eventStartTime, true),
          transactionStatusDisplay: getStatusDisplay(
            booking.payment?.transactionStatus
          ),
          customerBookingId: booking.bookingId, // Already provided as bookingId by backend
          // 'status' is booking's own status, directly from backend
        }));
        // Removed client-side .sort() - relying on backend sort

        return {
          bookings: pastBookingsAdapter.setAll(
            initialPastBookingsState,
            processedBookings
          ),
          pagination: {
            totalBookings: response.totalBookings || 0,
            currentPage: response.page || 1, // Assuming backend returns 1-indexed page
            totalPages: response.totalPages || 1,
          },
        };
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
          return false;
        }
        return response.status === 200 && !result.isError;
      },
    }),
    resendEmailVerification: builder.mutation({
      query: (body) => ({
        url: "user/resendEmailVerification",
        method: "POST",
        body,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false;
        }
        return response.status === 200 && !result.isError;
      },
    }),
    verifyEmail: builder.mutation({
      query: (token) => ({
        url: "user/verifyEmail",
        method: "POST",
        body: { token },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false;
        }
        return response.status === 200 && !result.isError;
      },
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({
        url: "/user/forgotPassword",
        method: "POST",
        body: { email },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false;
        }
        return response.status === 200 && !result.isError;
      },
    }),
    resetPassword: builder.mutation({
      query: (request) => ({
        url: `/user/resetPassword?token=${request.token}`,
        method: "POST",
        body: {
          password: request.password,
          confirmPassword: request.confirmPassword,
        },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          console.error("Response status is undefined", response);
          return false;
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
          return false;
        }
        return response.status === 200 && !result.isError;
      },
    }),
  }),
});

export const {
  useGetMyUserQuery,
  useGetPastBookingsQuery,
  useUpdateMyUserMutation,
  useResendEmailVerificationMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useContactMeMutation,
} = usersApiSlice;

// Selectors for user data
const selectRawUser = (state) =>
  usersApiSlice.endpoints.getMyUser.select()(state);

export const selectMyUser = createSelector([selectRawUser], (rawUser) => {
  if (!rawUser?.data) return null;

  const entities = rawUser.data.entities;
  const fetchedUser = entities && entities[Object.keys(entities)[0]];

  if (!fetchedUser) return null;

  let formattedDob = null;
  if (fetchedUser.DOB) {
    const dob = new Date(fetchedUser.DOB);
    formattedDob = `${dob.getFullYear()}-${(dob.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${dob.getDate().toString().padStart(2, "0")}`;
    return { ...fetchedUser, DOB: formattedDob };
  }

  return fetchedUser;
});

// Selectors for past bookings
const selectRawPastBookings = (state) =>
  usersApiSlice.endpoints.getPastBookings.select()(state);

export const selectPastBookingsResult = createSelector(
  [selectRawPastBookings],
  (pastBookingsResult) => pastBookingsResult
);

export const {
  selectAll: selectAllPastBookings,
  selectById: selectPastBookingById,
  selectIds: selectPastBookingIds,
} = pastBookingsAdapter.getSelectors((state) => {
  const queryResult = selectRawPastBookings(state);
  const adapterStateFromQuery = queryResult?.data?.bookings;

  // Check if adapterStateFromQuery looks like a valid adapter state
  if (
    adapterStateFromQuery &&
    Array.isArray(adapterStateFromQuery.ids) &&
    typeof adapterStateFromQuery.entities === "object" &&
    adapterStateFromQuery.entities !== null
  ) {
    return adapterStateFromQuery;
  }
  // Otherwise, fall back to the initial state for the adapter
  return initialPastBookingsState;
});

export const selectPastBookingsPagination = createSelector(
  [selectRawPastBookings],
  (result) =>
    result?.data?.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalBookings: 0,
      // limit: 10, // limit might come from request or default
    }
);
