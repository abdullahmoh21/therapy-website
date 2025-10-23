import React from "react";
import { BiCalendar, BiRefresh, BiUser } from "react-icons/bi";

const BookingSourceBadge = ({ source, recurring }) => {
  const getSourceConfig = (source, recurring) => {
    // Check if this is a recurring booking (source = "system" and recurring.state = true)
    if (source === "system" && recurring?.state) {
      return {
        label: "Recurring",
        icon: <BiRefresh className="w-3 h-3" />,
        className: "bg-purple-100 text-purple-800 border-purple-200",
        hoverClass: "hover:bg-purple-200 hover:shadow-sm",
      };
    }

    switch (source) {
      case "calendly":
        return {
          label: "Calendly",
          icon: <BiCalendar className="w-3 h-3" />,
          className: "bg-blue-100 text-blue-800 border-blue-200",
          hoverClass: "hover:bg-blue-200 hover:shadow-sm",
        };
      case "admin":
        return {
          label: "Admin",
          icon: <BiUser className="w-3 h-3" />,
          className: "bg-green-100 text-green-800 border-green-200",
          hoverClass: "hover:bg-green-200 hover:shadow-sm",
        };
      case "system":
        return {
          label: "System",
          icon: <BiRefresh className="w-3 h-3" />,
          className: "bg-gray-100 text-gray-800 border-gray-200",
          hoverClass: "hover:bg-gray-200 hover:shadow-sm",
        };
      default:
        return {
          label: "Unknown",
          icon: <BiCalendar className="w-3 h-3" />,
          className: "bg-gray-100 text-gray-800 border-gray-200",
          hoverClass: "hover:bg-gray-200 hover:shadow-sm",
        };
    }
  };

  const config = getSourceConfig(source, recurring);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all duration-200 cursor-help ${config.className} ${config.hoverClass}`}
      title={`Booking source: ${config.label}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export default BookingSourceBadge;
