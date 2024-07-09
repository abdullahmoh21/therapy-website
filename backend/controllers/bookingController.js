const React = require('react')
const crypto = require('crypto')
const logger = require('../logs/logger')
const asyncHandler = require('express-async-handler')
const axios = require('axios')
const { addToCache, invalidateCache, getFromCache } = require('../middleware/redisCaching')
const User = require('../models/User')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const TemporaryBooking = require('../models/TemporaryBooking')


//@desc handles Calendly webhook events
//@param valid webhook
//@route POST /bookings/calendly
//@access Public
const handleCalendlyWebhook = asyncHandler(async (req, res) => {
    const { event, payload } = req.body;
    const {
        cancel_url, 
        reschedule_url,
        email,
        tracking: { utm_content: receivedUserId },
        scheduled_event: {
            start_time,
            end_time,
            uri: eventURI,
            name: eventName,
            event_type: eventTypeURI
        }
    } = payload;

    try {
        if (eventName === '15 Minute Consultation') {
            await handleConsultationEvent(event, {
                email, cancel_url, reschedule_url, start_time, end_time, eventName, eventURI, eventTypeURI
            });
        } else {
            await handleExistingUserEvent(event, {
                receivedUserId, start_time, end_time, eventName, eventURI, eventTypeURI, cancel_url, reschedule_url
            });
        }
        
        return res.status(200).end();
    } catch (error) {
        logger.error(`Error handling Calendly webhook: ${error}`);
        return res.status(500).send('Internal Server Error');
    }
});

// ----------------------------- Start Webhook Helper Functions ----------------------------- //
async function handleConsultationEvent(event, { email, cancel_url, reschedule_url, start_time, end_time, eventName, eventURI, eventTypeURI }) {
    if (event === "invitee.created") {
        const tempBooking = await TemporaryBooking.create({
            email, cancelURL: cancel_url, rescheduleURL: reschedule_url, eventStartTime: start_time, eventEndTime: end_time, eventName, scheduledEventURI: eventURI, eventTypeURI
        });
        // add to cache
        addToCache(`tempBooking:${email}`, tempBooking);
        logger.info(`New booking for consultation: ${email}`);
    } else if (event === "invitee.canceled") {
        await TemporaryBooking.deleteOne({ scheduledEventURI: eventURI });
        // invalidate cache
        invalidateCache(`tempBooking:${email}`);
        logger.info(`Consultation canceled: ${eventURI}`);
    }
}

async function handleExistingUserEvent(event, { receivedUserId, start_time, end_time, eventName, eventURI, eventTypeURI, cancel_url, reschedule_url }) {
    if (event === "invitee.created") {
        const [existingBooking, user] = await Promise.all([
            Booking.findOne({ scheduledEventURI: eventURI }).lean(),
            User.findOne({ _id: receivedUserId }).lean()
        ]);

        if (existingBooking) {
            logger.info(`Booking already exists for eventURI: ${eventURI}. Skipping creation.`);
            return;
        }
        
        if (!user) {
            logger.info(`No user found with utm_content: ${receivedUserId}. Deleting event.`);
            await deleteEvent(eventURI);
            return;
        }

        const booking = await Booking.create({
            userId: user._id,
            eventStartTime: start_time, 
            eventEndTime: end_time, 
            eventName, 
            scheduledEventURI: eventURI, 
            eventTypeURI, 
            cancelURL: cancel_url, 
            rescheduleURL: reschedule_url, 
            amount: process.env.SESSION_PRICE
        })
        const paymnet = await Payment.create({
            userId: user._id, 
            bookingId: booking._id,
            amount: process.env.SESSION_PRICE,
            paymentCurrency: 'PKR',
            status: 'Pending'
        })
        //invalidating cache
        invalidateCache(`bookings:${user._id}`);

        logger.info(`Booking and payment created for user: ${user.email}`);
    } else if (event === "invitee.canceled") {
        // Find the booking document to get its _id
    const booking = await Booking.findOne({ scheduledEventURI: eventURI }).lean(); 

        if (booking) {
            // Delete the booking document
            const deleteResult = await Booking.deleteOne({ _id: booking._id });

            // Check if the booking was successfully deleted
            if (deleteResult.deletedCount > 0) {
                // Proceed to delete the related payment document
                const paymentDeleteResult = await Payment.deleteOne({ bookingId: booking._id }).lean();
                logger.info(`Payment related to the canceled event deleted: ${paymentDeleteResult.deletedCount}`);
            }
            invalidateCache(`bookings:${booking.userId}`);
            logger.info(`Event with following URI canceled: ${eventURI}, delete count: ${deleteResult.deletedCount}`);
        }
    }
}

async function deleteEvent(eventURI) {
    const options = {
        method: 'POST',
        url: `${eventURI}/cancellation`,
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`
        },
        data: { reason: 'This is a server generated event: No user found. Deleted event.' }
    };
    await axios.request(options);
    logger.info(`Event deleted: ${eventURI}`);
}
// ----------------------------- End Webhook Helper Functions ----------------------------- //


//@desc gets users unique booking link
//@param {Object} req with valid userId
//@route GET /bookings
//@access Private
const getNewBookingLink = asyncHandler(async (req, res) => {
    const { userId } = req;     //from verifyJWT
    if(!userId) return res.status(401).json({message: 'No userId found in req object'});

    // add the userId to the booking link
    const bookingLink = `${process.env.CALENDLY_SESSION_URL}?=utm_source=dashboard&utm_content=${userId}`;
    console.log(`new booking link: ${bookingLink}`);

    return res.status(200).json({link: bookingLink});
});

//@desc returns all bookings of a user
//@param {Object} req with valid email
//@route GET /bookings
//@access Private
const getMyBookings = asyncHandler(async (req, res) => {
    const { userId } = req;

    // Fetch active bookings and all payments for the user in parallel
    const [bookings, payments] = await Promise.all([
        Booking.find({
            userId,
            status: 'Active',
            eventEndTime: { $gt: new Date().getTime() }
        }).select('-userId -__v -createdAt -updatedAt -scheduledEventURI -eventTypeURI -rescheduleURL').lean().exec(),
        Payment.find({ 
            userId,
         }).select('transactionStatus amount paymentId currency bookingId userId').lean().exec()
    ]);

    if (bookings.length === 0) return res.status(204).end();

    // Convert payments array to a map for O(1) access by bookingId
    const paymentMap = new Map(payments.map(payment => [payment.bookingId.toString(), payment]));
    
    const bookingsWithPaymentDetails = bookings.map(booking => {
        if (booking.eventName === "15 Minute Consultation") {
            return booking;
        }
    
        // Use the paymentMap for efficient lookup
        const paymentDetails = paymentMap.get(booking._id.toString());
        if (paymentDetails) {
            return {
                ...booking,
                amount: paymentDetails.amount,
                currency: paymentDetails.currency,
                transactionStatus: paymentDetails.transactionStatus,
                paymentId: paymentDetails._id
            };
        }

        return booking;
    });

    const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;
    bookingsWithPaymentDetails.forEach(booking => {
        const timeUntilEvent = new Date(booking.eventStartTime).getTime() - new Date().getTime();
        booking.cancelURL = (timeUntilEvent > TWENTY_FOUR_HOURS_IN_MS) ? booking.cancelURL : null;
    });

    res.json(bookingsWithPaymentDetails);
});

//@desc returns all bookings 
//@param valid admin jwt token
//@route GET /bookings/admin
//@access Private(admin)
const getAllBookings = asyncHandler( async (req, res) => {
    if (req?.role !== ROLES_LIST.Admin) return res.sendStatus(401);

    //find all active bookings
    const currentTimestamp = new Date().getTime();
    const bookings = await Booking.find({        
        eventStartTime: { $gt: currentTimestamp } 
    }).lean().exec();


    if (bookings.length === 0) return res.status(204).end();
    console.log(`ADMIN booking data sent: ${JSON.stringify(bookings, null, 2)}`);
    res.json(bookings);
})


//@desc cleans up old bookings and their associated payments
//@access Private /local use only
const deleteOldBookingsAndPayments = async () => {
    try {
        const fourMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 4));
        
        // Find bookings that are either completed and older than 4 months or cancelled and older than a week
        const bookingsToDelete = await Booking.find({
            status: 'Completed',
            eventEndTime: { $lt: fourMonthsAgo } ,
        }).exec();

        // Extract booking IDs
        const bookingIds = bookingsToDelete.map(booking => booking._id);

        // Delete payments associated with these bookings
        const paymentDeletionResult = await Payment.deleteMany({
            bookingId: { $in: bookingIds }
        }).exec();

        console.log(`Deleted ${paymentDeletionResult.deletedCount} payments associated with old or cancelled bookings.`);

        // Delete the bookings themselves
        const bookingDeletionResult = await Booking.deleteMany({
            _id: { $in: bookingIds }
        }).exec();

        console.log(`Deleted ${bookingDeletionResult.deletedCount} old or cancelled bookings.`);
    } catch (error) {
        console.error(`Error deleting old or cancelled bookings and their payments: ${error}`);
    }
};



module.exports = {
    handleCalendlyWebhook,
    getMyBookings,
    getAllBookings,
    deleteOldBookingsAndPayments,
    getNewBookingLink
}