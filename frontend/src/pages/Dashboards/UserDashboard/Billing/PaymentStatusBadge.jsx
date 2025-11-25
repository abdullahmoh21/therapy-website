import React from "react";
import {
  BiCheckCircle,
  BiLoaderAlt,
  BiXCircle,
  BiInfoCircle,
} from "react-icons/bi";

const PaymentStatusBadge = ({ status }) => {
  let bgColor = "";
  let textColor = "";
  let icon = null;
  let hoverClass = "";

  switch (status) {
    case "Completed":
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      icon = <BiCheckCircle className="mr-1" />;
      hoverClass = "hover:bg-green-200 hover:shadow-sm";
      break;
    case "Pending":
      bgColor = "bg-yellow-100";
      textColor = "text-yellow-800";
      icon = <BiLoaderAlt className="mr-1 animate-spin" />;
      hoverClass = "hover:bg-yellow-200 hover:shadow-sm";
      break;
    case "Failed":
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      icon = <BiXCircle className="mr-1" />;
      hoverClass = "hover:bg-red-200 hover:shadow-sm";
      break;
    case "Refunded":
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
      icon = <BiInfoCircle className="mr-1" />;
      hoverClass = "hover:bg-blue-200 hover:shadow-sm";
      break;
    case "Partially Refunded":
      bgColor = "bg-indigo-100";
      textColor = "text-indigo-800";
      icon = <BiInfoCircle className="mr-1" />;
      hoverClass = "hover:bg-indigo-200 hover:shadow-sm";
      break;
    case "Not Initiated":
      bgColor = "bg-gray-100";
      textColor = "text-gray-800";
      icon = <BiInfoCircle className="mr-1" />;
      hoverClass = "hover:bg-gray-200 hover:shadow-sm";
      break;
    case "Cancelled":
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      icon = <BiXCircle className="mr-1" />;
      hoverClass = "hover:bg-red-200 hover:shadow-sm";
      break;
    case "Refund Requested":
      bgColor = "bg-purple-100";
      textColor = "text-purple-800";
      icon = <BiInfoCircle className="mr-1" />;
      hoverClass = "hover:bg-purple-200 hover:shadow-sm";
      break;
    default:
      bgColor = "bg-gray-100";
      textColor = "text-gray-800";
      icon = <BiInfoCircle className="mr-1" />;
      hoverClass = "hover:bg-gray-200 hover:shadow-sm";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-help ${bgColor} ${textColor} ${hoverClass}`}
      title={`Payment status: ${status || "N/A"}`}
    >
      {icon} {status || "N/A"}
    </span>
  );
};

export default PaymentStatusBadge;
