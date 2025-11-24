import { apiSlice } from "../../app/api/apiSlice";

export const adminPaymentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // -------------------- PAYMENT ENDPOINTS --------------------
    getAdminPayments: builder.query({
      query: (params) => ({
        url: "/admin/payments",
        method: "GET",
        params,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      transformResponse: (response) => {
        return {
          payments: response.payments || [],
          pagination: {
            totalPayments: response.totalPayments || 0,
            currentPage: response.page || 1,
            totalPages: response.totalPages || 1,
          },
        };
      },
      providesTags: ["Payment"],
    }),

    updateAdminPayment: builder.mutation({
      query: ({ paymentId, ...data }) => ({
        url: "/admin/payments",
        method: "PATCH",
        body: { paymentId, ...data },
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: ["Payment"],
    }),

    markPaymentAsPaid: builder.mutation({
      query: (paymentId) => ({
        url: `/admin/payments/${paymentId}/paid`,
        method: "PATCH",
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      invalidatesTags: (result, error, arg) => {
        // If the backend returns the associated bookingId in the response
        const bookingId = result?.bookingId;

        return [
          { type: "Booking", id: "LIST" },
          { type: "Payment", id: "LIST" },
          { type: "Payment", id: arg },
          // If we have a bookingId in the result, invalidate that specific booking
          ...(bookingId ? [{ type: "Booking", id: bookingId }] : []),
          // Also invalidate any existing booking detail queries
          { type: "Booking", id: undefined },
        ];
      },
    }),
  }),
});

export const {
  // Payment endpoints
  useGetAdminPaymentsQuery,
  useUpdateAdminPaymentMutation,
  useMarkPaymentAsPaidMutation,
} = adminPaymentApiSlice;
