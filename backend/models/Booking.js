const { id } = require('date-fns/locale');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-sequence')(mongoose);

const bookingSchema = new Schema(
    {
        username: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        dateAndTime: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
            default: 60,
        },
        completed: {
            type: Boolean,
            default: false,
        },
        payment:{
            type: Boolean,
            required: true,
            default: false,
        },
    },
);

bookingSchema.plugin(autoIncrement, {
    inc_field: 'bookingId',
    id: 'booking_id',
    start_seq: 570, 
});

module.exports = mongoose.model('Booking', bookingSchema);