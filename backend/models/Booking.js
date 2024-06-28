const { isPast } = require('date-fns');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-sequence')(mongoose);

const bookingSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',   
            index: true,
        },
        paymentId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payments',
            index: true,
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
        },
        eventTypeURI: {
            type: String,
        },
        cancelURL: {
            type: String,
        },
        rescheduleURL: {
            type: String,
        },
        status: {
            type: String,
            required: true,
            default: function() {
                // Check if eventEndTime is in the past
                return isPast(this.eventEndTime) ? 'Completed' : 'Active';
            },
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
    unique: true,
});

module.exports = mongoose.model('Booking', bookingSchema);