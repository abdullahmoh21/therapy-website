import React from "react";
import { renderIcon } from "./billingUtils.jsx"; // Assuming renderIcon remains in billingUtils.js

const ExpandedStatusDisplay = ({ transactionStatusDisplay }) => {
  if (!transactionStatusDisplay) return null;
  const { icon, text, color } = transactionStatusDisplay;
  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {renderIcon(icon)}
      <span className="ml-1">{text}</span>
    </span>
  );
};

export default ExpandedStatusDisplay;
