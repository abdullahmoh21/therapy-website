const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-sequence')(mongoose);

const paymentSchema = new Schema(
    {
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking', 
            required: true, 
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', 
            required: true,
            index: true,
        },
        tracker: { 
            type: String, 
            index: true,
        },
        transactionReferenceNumber: { 
            type: String,  
        },
        amount: { 
            type: Number, 
            required: true 
        },
        currency:{
            type: String,
            required: true,
            default: 'PKR'
        },
        netAmountReceived:{
            type: Number,
        },
        feePaid:{
            type: Number,
        },
        transactionStatus: { 
            type: String, 
            required: true,
            enum: ['Pending', 'Completed', 'Cancelled','Partially Refunded','Refunded'],
            default: 'Pending'
        },
        linkGeneratedDate: {
            type: Date,
        },
        paymentCompletedDate: { 
            type: Date 
        },
        paymentRefundedDate: { 
            type: Date 
        },
    },
);


module.exports = mongoose.model('Payment', paymentSchema);