import { apiSlice } from "../../app/api/apiSlice";

export const adminUserApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------- USER ENDPOINTS --------------------
    getAdminUsers: builder.query({
      query: (params) => ({
        url: "/admin/users",
        method: "GET",
        params,
      }),
      transformResponse: (response) => {
        return {
          users: response.users || [],
          pagination: {
            totalUsers: response.totalUsers || 0,
            currentPage: response.page || 1,
            totalPages: response.totalPages || 1,
          },
        };
      },
      providesTags: ["User"],
    }),

    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: "DELETE",
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 || response.status === 204;
      },
      invalidatesTags: ["User"],
    }),

    updateUser: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/admin/users/${userId}`,
        method: "PATCH",
        body: data,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 || response.status === 204;
      },
      invalidatesTags: ["User"],
    }),

    // Set a user as recurring
    setUserRecurring: builder.mutation({
      query: ({ userId, ...data }) => ({
        url: `/admin/users/${userId}/recurring`,
        method: "POST",
        body: data,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200;
      },
      invalidatesTags: ["User", "Booking"],
    }),

    // Stop recurring for a user
    stopUserRecurring: builder.mutation({
      query: (userId) => ({
        url: `/admin/users/${userId}/recurring`,
        method: "DELETE",
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200;
      },
      invalidatesTags: ["User", "Booking"],
    }),

    // Get user details - fetch a single user's full details
    getUserDetails: builder.query({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: "GET",
      }),
      validateStatus: (response, result) => {
        return response.status === 200 && !result?.error;
      },
      providesTags: (result, error, arg) => [{ type: "User", id: arg }],
    }),

    searchUsers: builder.query({
      query: (searchQuery) => ({
        url: `/admin/users/search`,
        method: "GET",
        params: { q: searchQuery, limit: 10 },
      }),
      validateStatus: (response, result) => {
        return response.status === 200 && !result?.error;
      },
    }),

    // -------------------- INVITATION ENDPOINTS --------------------
    getInvitedUsers: builder.query({
      query: (params) => {
        /* URL‑encode everything (handles dates, arrays, etc.) */
        const searchParams = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;

          if (Array.isArray(value)) {
            value.forEach((item) => searchParams.append(key, item));
          } else {
            searchParams.append(key, value);
          }
        });

        return {
          url: `/admin/invitations?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: ["Invitation"],
    }),

    inviteUser: builder.mutation({
      query: (userData) => ({
        url: "/admin/invitations",
        method: "POST",
        body: userData,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 || response.status === 201;
      },
      invalidatesTags: ["User"],
    }),

    deleteInvitation: builder.mutation({
      query: (invitationId) => ({
        url: `/admin/invitations/${invitationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Invitation"],
    }),

    resendInvitation: builder.mutation({
      query: (invitationId) => ({
        url: `/admin/invitations/${invitationId}/resend`,
        method: "POST",
      }),
      invalidatesTags: ["Invitation"],
    }),
  }),
});

export const {
  // User endpoints
  useGetAdminUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useSetUserRecurringMutation,
  useStopUserRecurringMutation,
  useGetUserDetailsQuery,
  useLazySearchUsersQuery,

  // Invitation endpoints
  useGetInvitedUsersQuery,
  useInviteUserMutation,
  useDeleteInvitationMutation,
  useResendInvitationMutation,
} = adminUserApiSlice;
