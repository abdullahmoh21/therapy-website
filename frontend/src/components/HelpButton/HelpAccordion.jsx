import { useState } from "react";
import { BiChevronDown } from "react-icons/bi";

const HelpAccordion = ({ title, content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <span className="font-medium text-sm text-gray-900">{title}</span>
        <BiChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ml-2 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 pt-2 bg-gray-50 text-sm text-gray-600 leading-relaxed animate-fadeIn">
          {content}
        </div>
      )}
    </div>
  );
};
export default HelpAccordion;
