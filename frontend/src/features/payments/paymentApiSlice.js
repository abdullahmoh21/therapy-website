import {
    createEntityAdapter
} from "@reduxjs/toolkit";
import { apiSlice } from "../../app/api/apiSlice"

const paymentsAdapter = createEntityAdapter({
    selectId: (payment) => payment._id
})

const initialState = paymentsAdapter.getInitialState()

export const paymentsApiSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getAllPayments: builder.query({
            query: () => '/payments/admin',
            validateStatus: (response, result) => {
                //if no response from server, throw an error
                if (response.status === undefined) {
                    throw new Error("No response from server");
                }
                return response.status === 200 && !result.isError;
            },
            transformResponse: responseData => {
                if (responseData) {
                    const loadedPayments = responseData.map(payment => {
                        return payment;
                    });
                    const temp = paymentsAdapter.setAll(initialState, loadedPayments);
                    return temp;
                } else {
                    return initialState;
                }
            },
            providesTags: (result, error, arg) => {
                if (result?.ids) {
                    return [
                        { type: 'Payment', id: 'LIST' },
                        ...result.ids.map(id => ({ type: 'Payment', id }))
                    ]
                } else return [{ type: 'Payment', id: 'LIST' }]
            }
        }),
        getMyPayments: builder.query({
            query: () => '/payments',
            validateStatus: (response, result) => {
                if (response.status === undefined) { 
                    return fasle
                }
                return response.status === 200 && !result.isError;

            },
            transformResponse: (responseData) => {
                if (responseData) {
                    return paymentsAdapter.setAll(initialState, responseData);
                } else {
                    return initialState;
                }
            },
            providesTags: (result, error, arg) => {
                if (result?.id) {
                    return [
                    { type: 'Payment', id: result.id }
                    ]
                } else return []
            }
        }),
        getPaymentLink: builder.mutation({
            query: (bookingId) => ({
                url: '/payments',
                method: 'POST',
                body: bookingId, 
            }),
            validateStatus: (response, result) => {
                if (response.status === undefined) { 
                return false;
                }
                return response.status === 200 && !result.isError;
            },
        }),
        sendRefundRequest: builder.mutation({
            query: (data) => ({
                url: '/payments/refund',
                method: 'POST',
                body: data, 
            }),
            validateStatus: (response, result) => {
                if (response.status === undefined) { 
                return false;
                }
                return response.status === 200 && !result.isError;
            },
        }),
    }),
})

export const {
    useGetAllPaymentsQuery,
    useGetMyPaymentsQuery,
    useSendRefundRequestMutation,
    useGetPaymentLinkMutation
} = paymentsApiSlice
