const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('mongoose-sequence')(mongoose);

const paymentSchema = new Schema(
    {
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking', 
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
            enum: ['Pending', 'Completed', 'Cancelled','Refund Requested','Refunded','Partially Refunded'],
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
    { timestamps: true }
);


module.exports = mongoose.model('Payment', paymentSchema);