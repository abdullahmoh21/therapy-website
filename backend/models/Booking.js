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
            enum: ['Active', 'Completed'],
            default: 'Active',
        },
    },
    {
        timestamps: true,
    }
);

bookingSchema.plugin(autoIncrement, {
    inc_field: 'bookingId',
    id: 'booking_id',
    start_seq: 208, 
    unique: true,
});

module.exports = mongoose.model('Booking', bookingSchema);