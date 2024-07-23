const mongoose = require('mongoose');
const { Schema } = mongoose;

const temporaryBookingSchema = new Schema({
    email: { 
        type: String,
        required: true,
        index: true,
    },
    cancelURL: String,
    rescheduleURL: String,
    eventStartTime: Date,
    eventEndTime: Date,
    eventName: String,
    scheduledEventURI: String,
    eventTypeURI: String,
    createdAt: { type: Date, default: Date.now, expires: '24h' } // Temporary booking expires after 24 hours
});

const TemporaryBooking = mongoose.model('TemporaryBooking', temporaryBookingSchema);

module.exports = TemporaryBooking;