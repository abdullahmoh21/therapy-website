import React from "react";
import { BiCheck, BiX, BiInfoCircle } from "react-icons/bi";

const BookingStatusBadge = ({ status }) => {
  let bgColor = "";
  let textColor = "";
  let icon = null;

  switch (status) {
    case "Active":
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      icon = <BiCheck className="mr-1" />;
      break;
    case "Completed":
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
      icon = <BiCheck className="mr-1" />;
      break;
    case "Cancelled":
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      icon = <BiX className="mr-1" />;
      break;
    default:
      bgColor = "bg-gray-100";
      textColor = "text-gray-800";
      icon = <BiInfoCircle className="mr-1" />;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
    >
      {icon} {status}
    </span>
  );
};

export default BookingStatusBadge;
