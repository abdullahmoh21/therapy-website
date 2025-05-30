import React from "react";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { BiSearch, BiFilterAlt, BiRefresh } from "react-icons/bi";
import { statusOptions, bookingStatusOptions } from "./billingUtils.jsx";

const BillingFilters = ({
  filters,
  onSearchChange,
  onStatusChange,
  onBookingStatusChange,
  onClearFilters,
  onRefreshData,
}) => {
  return (
    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-grow">
          <div className="relative">
            <span className="p-input-icon-left w-full flex items-center">
              <BiSearch className="pi pi-search absolute left-3 text-textColor z-10" />
              <InputText
                value={filters.search}
                onChange={onSearchChange}
                placeholder="Search by payment ID, booking ID or session date"
                className="w-full pl-10"
              />
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Dropdown
              value={filters.status}
              options={statusOptions}
              onChange={onStatusChange}
              placeholder="Payment Status"
              className="w-full md:w-auto bg-white border shadow-sm"
              panelClassName="bg-white shadow-lg border"
            />
          </div>

          <div className="relative">
            <Dropdown
              value={filters.bookingStatus}
              options={bookingStatusOptions}
              onChange={onBookingStatusChange}
              placeholder="Booking Status"
              className="w-full md:w-auto bg-white border shadow-sm"
              panelClassName="bg-white shadow-lg border"
            />
          </div>

          <div className="ml-auto flex space-x-2">
            <Button
              icon={<BiFilterAlt />}
              onClick={onClearFilters}
              className="p-button-outlined p-button-secondary"
              tooltip="Reset Filters"
              disabled={
                !filters.search && !filters.status && !filters.bookingStatus
              }
            />
            <Button
              icon={<BiRefresh />}
              onClick={onRefreshData}
              className="p-button-outlined p-button-secondary"
              tooltip="Refresh Data"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingFilters;
