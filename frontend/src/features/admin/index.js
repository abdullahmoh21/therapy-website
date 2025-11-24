// Barrel export file for admin API slices
// This provides a single entry point for importing all admin-related hooks

// Re-export all hooks from individual slice files
export {
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
} from "./adminUserApiSlice";

export {
  // Booking endpoints
  useGetAdminBookingsQuery,
  useGetBookingTimelineQuery,
  useUpdateAdminBookingMutation,
  useDeleteAdminBookingMutation,
  useGetAdminBookingDetailQuery,
  useCreateAdminBookingMutation,
  useCancelAdminBookingMutation,
  useCancelBookingInstanceMutation,
} from "./adminBookingApiSlice";

export {
  // Payment endpoints
  useGetAdminPaymentsQuery,
  useUpdateAdminPaymentMutation,
  useMarkPaymentAsPaidMutation,
} from "./adminPaymentApiSlice";

export {
  // Metrics endpoints
  useGetGeneralMetricsQuery,
  useGetDashboardMetricsQuery,
} from "./adminMetricsApiSlice";

export {
  // System Health & Config endpoints
  useGetSystemHealthQuery,
  useGetAllConfigsQuery,
  useUpdateConfigMutation,
} from "./adminSystemApiSlice";

export {
  // Google Calendar endpoints
  useGetGoogleCalendarStatusQuery,
  useGetGoogleCalendarAuthUrlQuery,
  useLazyGetGoogleCalendarAuthUrlQuery,
  useHandleGoogleCalendarCallbackMutation,
  useTestGoogleCalendarConnectionMutation,
  useDisconnectGoogleCalendarMutation,
} from "./adminGoogleCalendarApiSlice";
