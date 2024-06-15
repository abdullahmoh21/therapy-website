const { isPast } = require('date-fns');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-sequence')(mongoose);

const bookingSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        eventStartTime: {
            type: Date,
            required: true,
        },
        eventEndTime: {
            type: Date,
            required: true,
        },
        eventName: {
            type: String,
            required: true,
        },
        scheduledEventURI: {
            type: String,
            required: true,
        },
        eventTypeURI: {
            type: String,
            required: true,
        },
        cancelURL: {
            type: String,
            required: true,
        },
        rescheduleURL: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
            default: function() {
                // Check if eventEndTime is in the past
                return isPast(this.eventEndTime) ? 'completed' : 'active';
            },
        },
        paymentStatus: {
            type: String,
            required: function() {
                // Required if paymentAmount is not 0
                return this.paymentAmount !== 0;
            },
            default: 'Pending',
        },
        paymentAmount: {
            type: Number,
            required: true,
        },
        paymentCurrency: {
            type: String,
            required: function() {
                // Required if paymentAmount is not 0
                return this.paymentAmount !== 0;
            },
            default: 'PKR',
        },
    }
);
bookingSchema.pre('save', function(next) {
    // Automatically set status to 'completed' if eventEndTime is in the past
    if (isPast(this.eventEndTime)) {
        this.status = 'completed';
    }
    next();
});

bookingSchema.plugin(autoIncrement, {
    inc_field: 'bookingId',
    id: 'booking_id',
    start_seq: 208, 
});

module.exports = mongoose.model('Booking', bookingSchema);