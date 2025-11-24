import { apiSlice } from "../../app/api/apiSlice";

export const adminGoogleCalendarApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------- GOOGLE CALENDAR ENDPOINTS --------------------
    getGoogleCalendarStatus: builder.query({
      query: () => ({
        url: "/admin/google-calendar/status",
        method: "GET",
      }),
      providesTags: ["GoogleCalendar"],
    }),

    getGoogleCalendarAuthUrl: builder.query({
      query: () => ({
        url: "/admin/google-calendar/auth-url",
        method: "GET",
      }),
    }),

    handleGoogleCalendarCallback: builder.mutation({
      query: (code) => ({
        url: "/admin/google-calendar/callback",
        method: "POST",
        body: { code },
      }),
      invalidatesTags: ["GoogleCalendar"],
    }),

    testGoogleCalendarConnection: builder.mutation({
      query: () => ({
        url: "/admin/google-calendar/test",
        method: "POST",
      }),
      invalidatesTags: ["GoogleCalendar"],
    }),

    disconnectGoogleCalendar: builder.mutation({
      query: () => ({
        url: "/admin/google-calendar/disconnect",
        method: "POST",
      }),
      invalidatesTags: ["GoogleCalendar"],
    }),
  }),
});

export const {
  // Google Calendar endpoints
  useGetGoogleCalendarStatusQuery,
  useGetGoogleCalendarAuthUrlQuery,
  useLazyGetGoogleCalendarAuthUrlQuery,
  useHandleGoogleCalendarCallbackMutation,
  useTestGoogleCalendarConnectionMutation,
  useDisconnectGoogleCalendarMutation,
} = adminGoogleCalendarApiSlice;
