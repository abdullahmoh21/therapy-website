import React from "react";
import { BiLoaderAlt, BiDollarCircle } from "react-icons/bi";

const PaymentButton = ({ bookingId, status, onClick, isLoading }) => {
  const isPayable = status === "Not Initiated" || status === "Cancelled";

  if (!isPayable) return null;

  const isButtonLoading = isLoading && isLoading === bookingId;

  return (
    <button
      className={`inline-flex justify-center items-center bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
        isButtonLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-600"
      }`}
      onClick={(e) => {
        e.stopPropagation(); // Prevent row expansion if part of a clickable row
        onClick(bookingId, e);
      }}
      disabled={isButtonLoading}
    >
      {isButtonLoading ? (
        <BiLoaderAlt className="animate-spin mr-2" />
      ) : (
        <BiDollarCircle className="mr-1" />
      )}{" "}
      Pay Now
    </button>
  );
};

export default PaymentButton;
