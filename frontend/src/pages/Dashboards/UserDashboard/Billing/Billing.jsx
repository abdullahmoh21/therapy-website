import React, { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { useGetMyPaymentsQuery } from "../../../../features/payments/paymentApiSlice";
import "./Billing.css"; // Import custom styles

const Billing = () => {
  const [payments, setPayments] = useState([]);
  const { data: paymentResponse, isLoading, isError } = useGetMyPaymentsQuery();

  // Extract payments from response when available
  useEffect(() => {
    if (paymentResponse && Array.isArray(paymentResponse.ids)) {
      const formattedPayments = Object.values(paymentResponse.entities).map(
        (payment) => ({
          ...payment,
          formattedEventStartTime: formatDate(
            payment.eventStartTime,
            payment.bookingStatus
          ),
          formattedPaymentCompletedDate: payment.paymentCompletedDate
            ? formatDate(payment.paymentCompletedDate)
            : "-",
        })
      );
      setPayments(formattedPayments);
    }
  }, [paymentResponse]);

  const formatDate = (dateString, status) => {
    const date = new Date(dateString);
    const options = { year: "numeric", month: "long", day: "numeric" };
    if (status) {
      // Include status in the date string if it is provided
      return date.toLocaleDateString("en-US", options) + " (" + status + ")";
    }
    return date.toLocaleDateString("en-US", options);
  };

  const columns = [
    { field: "transactionReferenceNumber", header: "Payment Id " },
    { field: "customerBookingId", header: "Booking Id " },
    { field: "formattedEventStartTime", header: "Booking Date (Status) " },
    { field: "transactionStatus", header: "Payment Status " },
    { field: "amount", header: "Amount " },
    { field: "formattedPaymentCompletedDate", header: "Paid On " },
  ];

  return (
    <div className="pt-6 min-h-screen">
      <div className="p-4 rounded-lg shadow-md">
        <DataTable
          value={payments}
          className="w-auto text-base custom-data-table"
          paginator
          rows={10}
          sortMode="multiple"
          tableStyle={{ minWidth: "50rem", fontSize: "1rem" }}
        >
          {columns.map((col) => (
            <Column
              key={col.field}
              field={col.field}
              header={<span className="pr-[5px]">{col.header}</span>}
              sortable
              filter={false}
              body={(rowData) => {
                // Render "-" if paymentCompletedDate is null
                if (
                  col.field === "formattedPaymentCompletedDate" &&
                  rowData[col.field] === "-"
                ) {
                  return "-";
                }
                return rowData[col.field];
              }}
              style={{ whiteSpace: "nowrap", maxWidth: "150px" }}
            />
          ))}
        </DataTable>
      </div>
    </div>
  );
};

export default Billing;
