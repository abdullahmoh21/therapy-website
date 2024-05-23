const { id } = require('date-fns/locale');
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
        eventType: {
            type: String,
            required: true,
        },
        completed: {
            type: Boolean,
            default: false,
        },
        paymentAmmount:{
            type: Number,
            required: true,
        },
        paymentCurrency:{
            type: String,
            default: 'PKR',
        },
        paymentStatus:{
            type: String,
            default: 'Pending',
        },
    },
);

bookingSchema.plugin(autoIncrement, {
    inc_field: 'bookingId',
    id: 'booking_id',
    start_seq: 208, 
});

module.exports = mongoose.model('Booking', bookingSchema);