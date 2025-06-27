import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Move PageCounter outside the main component
const PageCounter = ({ currentPage, totalPages }) => (
  <span className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
    Page {currentPage} of {totalPages}
  </span>
);

const pagination = ({ currentPage, totalPages, onPageChange }) => {
  const [goToPage, setGoToPage] = useState("");

  // Handle direct page navigation
  const handleGoToPage = (e) => {
    e.preventDefault();
    const pageNumber = parseInt(goToPage);
    if (pageNumber && pageNumber > 0 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
      setGoToPage("");
    }
  };

  // Generate the pages to be displayed
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);

      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if current page is near the start
      if (currentPage <= 3) {
        startPage = 2;
        endPage = Math.min(4, totalPages - 1);
      }

      // Adjust if current page is near the end
      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3);
        endPage = totalPages - 1;
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push("ellipsis1");
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push("ellipsis2");
      }

      // Always include last page
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="w-full flex items-center justify-center border-secondary-200 dark:border-secondary-700 px-4 py-4 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center rounded-md border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-5 py-2.5 text-sm font-medium transition-colors ${
            currentPage === 1
              ? "text-secondary-400 dark:text-secondary-500 cursor-not-allowed"
              : "text-primary-700 dark:text-primary-400 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
          }`}
        >
          Previous
        </button>

        {/* Page counter for mobile view */}
        <div className="flex items-center">
          <PageCounter currentPage={currentPage} totalPages={totalPages} />
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`relative ml-6 inline-flex items-center rounded-md border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-5 py-2.5 text-sm font-medium transition-colors ${
            currentPage === totalPages
              ? "text-secondary-400 dark:text-secondary-500 cursor-not-allowed"
              : "text-primary-700 dark:text-primary-400 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
          }`}
        >
          Next
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-wrap sm:justify-center sm:items-center gap-3">
        {/* Page counter for desktop view */}
        <div className="mr-3">
          <PageCounter currentPage={currentPage} totalPages={totalPages} />
        </div>

        <nav className="isolate inline-flex space-x-1.5 rounded-md shadow-sm">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center rounded-md px-3 py-2 transition-colors ${
              currentPage === 1
                ? "text-secondary-400 dark:text-secondary-500 cursor-not-allowed"
                : "text-secondary-500 dark:text-secondary-400 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
            }`}
          >
            <FaChevronLeft className="h-4 w-4" />
          </button>

          {pageNumbers.map((pageNumber, index) => {
            if (pageNumber === "ellipsis1" || pageNumber === "ellipsis2") {
              return (
                <span
                  key={pageNumber}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300"
                >
                  …
                </span>
              );
            }

            return (
              <button
                key={index}
                onClick={() => onPageChange(pageNumber)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
                  currentPage === pageNumber
                    ? "z-10 bg-primary-500/10 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-300 font-semibold shadow-sm"
                    : "bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center rounded-md px-3 py-2 transition-colors ${
              currentPage === totalPages
                ? "text-secondary-400 dark:text-secondary-500 cursor-not-allowed"
                : "text-secondary-500 dark:text-secondary-400 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
            }`}
          >
            <FaChevronRight className="h-4 w-4" />
          </button>
        </nav>

        {totalPages > 5 && (
          <form
            onSubmit={handleGoToPage}
            className="flex items-center space-x-2 ml-2"
          >
            <label className="text-sm text-secondary-600 dark:text-secondary-400">
              Go to:
            </label>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              className="w-16 rounded-md border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-2 py-1 text-sm text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Page"
            />
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-2.5 py-1 text-sm font-medium text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            >
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default pagination;
