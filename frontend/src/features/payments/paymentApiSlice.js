import { createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice";

const paymentsAdapter = createEntityAdapter({
  selectId: (payment) => payment._id,
});

const initialState = paymentsAdapter.getInitialState();

export const paymentsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPayment: builder.query({
      query: (id) => `/payments/${id}`,
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
      providesTags: (result, error, id) => [{ type: "Payment", id }],
    }),
    getBankDetails: builder.query({
      query: (id) => `/config/bank-account`,
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          throw new Error("No response from server");
        }
        return response.status === 200 && !result.isError;
      },
    }),
    getPaymentLink: builder.mutation({
      query: (bookingId) => ({
        url: "/payments",
        method: "POST",
        body: bookingId,
      }),
      validateStatus: (response, result) => {
        if (response.status === undefined) {
          return false;
        }
        return response.status === 200 && !result.isError;
      },
    }),
  }),
});

export const {
  useGetPaymentQuery,
  useGetPaymentLinkMutation,
  useGetBankDetailsQuery,
} = paymentsApiSlice;
