import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { format } from "date-fns";
import {
  FaCalendar,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaClock,
  FaMoneyBill,
  FaHashtag,
  FaCheckCircle,
  FaQuestionCircle,
  FaExternalLinkAlt,
  FaExclamationCircle,
  FaHourglassEnd,
} from "react-icons/fa";
import { RiRefund2Line, RiCloseCircleLine } from "react-icons/ri";
// Helper function to format price
const formatPrice = (amount) => {
  if (amount === undefined || amount === null) return "N/A";
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Helper function to calculate session duration
const getSessionDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "Unknown";
  const start = new Date(startTime);
  const end = new Date(endTime);
  const minutes = Math.round((end - start) / (1000 * 60));
  return `${minutes} minutes`;
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "PPP");
};

// Helper function to check if booking is in the future
const isBookingInFuture = (startTime) => {
  if (!startTime) return false;
  const now = new Date();
  const bookingTime = new Date(startTime);
  return bookingTime > now;
};

const BookingDetailsDialog = ({ visible, onHide, selectedBooking }) => {
  if (!selectedBooking) return null;

  // Determine Tag severity based on status
  const statusSeverity =
    {
      Active: "success",
      Completed: "info",
      Cancelled: "danger",
    }[selectedBooking.status] || "warning";

  // Check if the event is in the future
  const isFutureEvent = isBookingInFuture(selectedBooking.eventStartTime);

  return (
    <Dialog
      header={
        <h2 className="text-xl m-0">
          {selectedBooking.eventName || "Booking Session"} (#
          {selectedBooking.bookingId})
        </h2>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: "60vw", minWidth: "400px" }}
      modal
      className="p-3 bg-white shadow-xl rounded-lg"
      contentClassName="p-5"
      draggable={false}
      resizable={false}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Information */}
        <div className="col-span-1">
          <Card title="Client Information">
            <div className="flex items-center mb-3">
              <FaUser className="text-black mr-3" />
              <div>
                <div className="text-sm text-textColor">Name</div>
                <div className="text-headingColor">
                  {selectedBooking.userId?.name || "Unknown"}
                </div>
              </div>
            </div>
            <div className="flex items-center mb-3">
              <FaEnvelope className="text-black mr-3" />
              <div>
                <div className="text-sm text-textColor">Email</div>
                {selectedBooking.userId?.email ? (
                  <a
                    href={`mailto:${selectedBooking.userId.email}`}
                    className="flex items-center gap-1 text-blue-700 hover:underline"
                  >
                    {selectedBooking.userId.email}
                    <FaExternalLinkAlt size={12} />
                  </a>
                ) : (
                  "N/A"
                )}
              </div>
            </div>
            <div className="flex items-center">
              <FaPhone className="text-black mr-3" />
              <div>
                <div className="text-sm text-textColor">Phone</div>
                {selectedBooking.userId?.phone ? (
                  <a
                    href={`tel:${selectedBooking.userId.phone}`}
                    className="flex items-center gap-1 text-blue-700 hover:underline"
                  >
                    {selectedBooking.userId.phone}
                    <FaExternalLinkAlt size={12} />
                  </a>
                ) : (
                  "N/A"
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Session Details */}
        <div className="col-span-1">
          <Card title="Session Details">
            <div className="flex items-center mb-3">
              <FaCalendar className="text-black mr-3" />
              <div>
                <div className="text-sm text-textColor">Date</div>
                <div className="text-headingColor">
                  {selectedBooking.eventStartTime
                    ? format(new Date(selectedBooking.eventStartTime), "PPP")
                    : "N/A"}
                </div>
              </div>
            </div>
            <div className="flex items-center mb-3">
              <FaClock className="text-black mr-3" />
              <div>
                <div className="text-sm text-textColor">Time</div>
                <div className="text-headingColor">
                  {selectedBooking.eventStartTime
                    ? format(new Date(selectedBooking.eventStartTime), "p")
                    : "N/A"}{" "}
                  -{" "}
                  {selectedBooking.eventEndTime
                    ? format(new Date(selectedBooking.eventEndTime), "p")
                    : "N/A"}
                </div>
              </div>
            </div>
            <div className="flex items-center mb-3">
              <FaHourglassEnd className="text-black mr-3" />
              <div>
                <div className="text-sm text-textColor">Duration</div>
                <div className="text-headingColor">
                  {getSessionDuration(
                    selectedBooking.eventStartTime,
                    selectedBooking.eventEndTime
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center mb-3">
              <FaCheckCircle className="text-black mr-3" />
              <div>
                <div className="text-sm text-textColor">Status</div>
                <Tag value={selectedBooking.status} severity={statusSeverity} />
              </div>
            </div>
            {isFutureEvent && selectedBooking.status !== "Cancelled" && (
              <div className="flex items-center">
                {selectedBooking.cancelURL && (
                  <Button
                    label="Cancel Booking"
                    icon="pi pi-ban"
                    className=" bg-primaryColor rounded-md py-1 px-2 mr-2"
                    onClick={() =>
                      window.open(selectedBooking.cancelURL, "_blank")
                    }
                  />
                )}
                {selectedBooking.rescheduleURL && (
                  <Button
                    label="Reschedule"
                    icon="pi pi-calendar"
                    className=" bg-primaryColor rounded-md py-1 px-2"
                    onClick={() =>
                      window.open(selectedBooking.rescheduleURL, "_blank")
                    }
                  />
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Payment Information */}
        <div className="col-span-1">
          <Card title="Payment Information">
            {selectedBooking.paymentId ? (
              <>
                <div className="flex items-center mb-3">
                  <FaMoneyBill className="text-green-500 mr-3" />
                  <div>
                    <div className="text-sm text-textColor">Amount</div>
                    <div className="text-headingColor">
                      {formatPrice(selectedBooking.paymentId.amount)}{" "}
                      {selectedBooking.paymentId.currency || "PKR"}
                    </div>
                  </div>
                </div>
                {/* Conditional Status icon */}
                <div className="flex items-center mb-3">
                  {selectedBooking.paymentId.transactionStatus ===
                    "Not Initiated" && (
                    <FaQuestionCircle className="text-black mr-3" />
                  )}
                  {selectedBooking.paymentId.transactionStatus ===
                    "Completed" && (
                    <FaCheckCircle className="text-green-500 mr-3" />
                  )}
                  {selectedBooking.paymentId.transactionStatus ===
                    "Cancelled" && (
                    <RiCloseCircleLine className="text-red-500 mr-3" />
                  )}
                  {selectedBooking.paymentId.transactionStatus === "Refunded" ||
                    selectedBooking.paymentId.transactionStatus ===
                      "Partially Refunded" ||
                    (selectedBooking.paymentId.transactionStatus ===
                      "Refund Requested" && (
                      <RiRefund2Line className="text-green-500 mr-3" />
                    ))}
                  <div>
                    <div className="text-sm text-textColor">Payment Status</div>
                    <div className="text-headingColor">
                      {selectedBooking.paymentId.transactionStatus}
                    </div>
                  </div>
                </div>
                {selectedBooking.paymentId.transactionReferenceNumber && (
                  <div className="flex items-center">
                    <FaHashtag className="text-black mr-3" />
                    <div>
                      <div className="text-sm text-textColor">
                        Transaction Ref
                      </div>
                      <div className="break-all text-headingColor">
                        {selectedBooking.paymentId.transactionReferenceNumber}
                      </div>
                    </div>
                  </div>
                )}
                {selectedBooking.paymentId.tracker && (
                  <>
                    <Button
                      label="View in Safepay"
                      icon="pi pi-calendar"
                      className=" bg-primaryColor rounded-md py-1 px-2 mt-3"
                      onClick={() =>
                        window.open(
                          `https://sandbox.api.getsafepay.com/dashboard/payments/details/${selectedBooking.paymentId.tracker}`,
                          "_blank"
                        )
                      }
                    />
                  </>
                )}
              </>
            ) : (
              <div className="text-textColor">
                {selectedBooking.eventName === "15 Minute Consultation"
                  ? "Free Consultation - No payment required."
                  : "No payment information available."}
              </div>
            )}
          </Card>
        </div>

        {/* Cancellation Information */}
        {selectedBooking.cancellation && (
          <div className="col-span-1">
            <Card
              title={
                <span className="flex items-center gap-2">
                  <FaExclamationCircle className="text-red-600" />
                  Cancellation Information
                </span>
              }
              className="p-invalid"
            >
              <div className="flex items-center mb-3">
                <FaUser className="text-red-500 mr-3" />
                <div>
                  <div className="text-sm text-red-600">Cancelled By</div>
                  <div className="text-headingColor">
                    {selectedBooking.cancellation.cancelledBy}
                  </div>
                </div>
              </div>
              <div className="flex items-center mb-3">
                <FaCalendar className="text-red-500 mr-3" />
                <div>
                  <div className="text-sm text-red-600">Date</div>
                  <div className="text-headingColor">
                    {formatDate(selectedBooking.cancellation.date)}
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <FaExclamationCircle className="text-red-500 mr-3" />
                <div>
                  <div className="text-sm text-red-600">Reason</div>
                  <div className="text-headingColor">
                    {selectedBooking.cancellation.reason}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 mt-4">
        <Button
          label="Close"
          className=" bg-primaryColor rounded-md py-1 px-2 "
          onClick={onHide}
        />
      </div>
    </Dialog>
  );
};

export default BookingDetailsDialog;
