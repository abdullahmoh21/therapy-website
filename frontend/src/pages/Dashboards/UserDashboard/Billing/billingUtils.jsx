import React from "react";
import {
  BiCheckCircle,
  BiLoaderAlt,
  BiXCircle,
  BiInfoCircle,
} from "react-icons/bi";

export const statusOptions = [
  { label: "All Statuses", value: "" },
  { label: "Completed", value: "Completed" },
  { label: "Pending", value: "Pending" },
  { label: "Failed", value: "Failed" },
  { label: "Refunded", value: "Refunded" },
  { label: "Cancelled", value: "Cancelled" },
  { label: "Not Initiated", value: "Not Initiated" },
];

export const bookingStatusOptions = [
  { label: "All Booking Statuses", value: "" },
  { label: "Active", value: "Active" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

export const getStatusDisplay = (status) => {
  switch (status) {
    case "Completed":
      return {
        icon: "BiCheckCircle",
        text: "Completed",
        color: "text-green-600 bg-green-100",
      };
    case "Pending":
      return {
        icon: "BiLoaderAlt",
        text: "Pending",
        color: "text-yellow-600 bg-yellow-100",
      };
    case "Failed":
      return {
        icon: "BiXCircle",
        text: "Failed",
        color: "text-red-600 bg-red-100",
      };
    case "Refunded":
      return {
        icon: "BiInfoCircle",
        text: "Refunded",
        color: "text-blue-600 bg-blue-100",
      };
    case "Partially Refunded":
      return {
        icon: "BiInfoCircle",
        text: "Partially Refunded",
        color: "text-indigo-600 bg-indigo-100",
      };
    case "Not Initiated":
      return {
        icon: "BiInfoCircle",
        text: "Not Initiated",
        color: "text-gray-600 bg-gray-100",
      };
    case "Cancelled":
      return {
        icon: "BiXCircle",
        text: "Cancelled",
        color: "text-red-600 bg-red-100",
      };
    case "Refund Requested":
      return {
        icon: "BiInfoCircle",
        text: "Refund Requested",
        color: "text-purple-600 bg-purple-100",
      };
    default:
      return {
        icon: "BiInfoCircle",
        text: status || "N/A",
        color: "text-gray-600 bg-gray-100",
      };
  }
};

export const renderIcon = (iconName) => {
  switch (iconName) {
    case "BiCheckCircle":
      return <BiCheckCircle className="text-green-500 mr-1" />;
    case "BiLoaderAlt":
      return <BiLoaderAlt className="text-yellow-500 mr-1 animate-spin" />;
    case "BiXCircle":
      return <BiXCircle className="text-red-500 mr-1" />;
    case "BiInfoCircle":
      return <BiInfoCircle className="text-blue-500 mr-1" />;
    default:
      return <BiInfoCircle className="text-gray-500 mr-1" />;
  }
};
