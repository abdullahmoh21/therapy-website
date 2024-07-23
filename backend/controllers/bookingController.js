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
const ShortUniqueId = require('short-unique-id');
const uid = new ShortUniqueId({ length: 5 });  //for generating transaction reference number


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

    
    let canceler_type, reason, created_at;
    if (event === 'invitee.canceled') {
        const { cancellation } = payload;
        ({ canceler_type, reason, created_at } = cancellation);
    }

    try {
        if (eventName === '15 Minute Consultation') {
            await handleConsultationEvent(event, {
                email, cancel_url, reschedule_url, start_time, end_time, eventName, eventURI, eventTypeURI
            });
        } else {
            await handleExistingUserEvent(event, {
                receivedUserId, start_time, end_time, eventName, eventURI, eventTypeURI, cancel_url, reschedule_url, canceler_type, reason, created_at
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
    // consultation events are made bofore user is created, so we need to store them in a temp booking
    if (event === "invitee.created") {
        const tempBooking = await TemporaryBooking.create({
            email, cancelURL: cancel_url, rescheduleURL: reschedule_url, eventStartTime: start_time, eventEndTime: end_time, eventName, scheduledEventURI: eventURI, eventTypeURI
        });
        // add the temporary booking to cache, since will be needed imediately after for registration
        addToCache(`tempBooking:${email}`, tempBooking);
        logger.info(`New booking for consultation: ${email}`);
    } else if (event === "invitee.canceled") {
        await TemporaryBooking.deleteOne({ scheduledEventURI: eventURI });
        // invalidate cache
        invalidateCache(`tempBooking:${email}`);

        logger.info(`Consultation canceled: ${eventURI}`);
    }
}

async function handleExistingUserEvent(event, { receivedUserId, start_time, end_time, eventName, eventURI, eventTypeURI, cancel_url, reschedule_url, canceler_type, reason,created_at }) {
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
      
        const transactionReferenceNumber = `T-${uid.rnd()}`;
        const bookingData = {
          userId: user._id,
          eventStartTime: start_time,
          eventEndTime: end_time,
          eventName,
          scheduledEventURI: eventURI,
          eventTypeURI,
          cancelURL: cancel_url,
          rescheduleURL: reschedule_url,
          amount: process.env.SESSION_PRICE
        };
      
        const paymentData = {
          userId: user._id,
          amount: process.env.SESSION_PRICE,
          transactionReferenceNumber,
          paymentCurrency: 'PKR',
          status: 'Pending'
        };
        
        // Create booking and payment
        const [booking, payment] = await Promise.all([
          Booking.create(bookingData),
          Payment.create(paymentData)
        ]);
      
        // Link both documents
        booking.paymentId = payment._id;
        payment.bookingId = booking._id;
        await Promise.all([booking.save(), payment.save()]);
      
        // Invalidate cache
        await Promise.all([
          invalidateCache(`bookings:${user._id}`),
          invalidateCache(`payments:${user._id}`) // since new payment is created
        ]);
      
        logger.info(`Booking and payment created for user: ${user.email}`);
      } else if (event === "invitee.canceled") {
        // Find the booking document to get its _id
        const booking = await Booking.findOne({ scheduledEventURI: eventURI }).exec();
        if (!booking)(logger.info(`No booking found for eventURI: ${eventURI}.`));
        if(booking.status === 'Cancelled') return;

        booking.status = 'Cancelled';
        booking.cancellation.reason = reason
        booking.cancellation.cancelledBy = (canceler_type === 'user') ? 'User' : 'Admin';
        booking.cancellation.date = new Date(created_at);

        await booking.save();
        invalidateCache(`bookings:${booking.userId}`);
        invalidateCache(`payments:${booking.userId}`);
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
        data: { reason: 'This is a server generated txt: No user found. Deleted event.' }
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
    let bookings, payments;

    // Try to fetch payments from cache
    try {
        payments = await getFromCache(`payments:${userId}`);        
    } catch (error) {
        logger.error(`Error fetching payments for user ${userId} from cache. using db instead:\n ${error}`);
        payments = null;
    }

    // Fetch active bookings and all payments for the user in parallel IF payments are not found in cache
    if(!payments){
        [bookings, payments] = await Promise.all([
            Booking.find({
                userId,
                status: 'Active',
                eventEndTime: { $gt: new Date().getTime() }
            }).select('-userId -__v -createdAt -updatedAt -scheduledEventURI -eventTypeURI -rescheduleURL').lean().exec(),
            Payment.find({ 
                userId,
            }).select('transactionStatus amount paymentId currency bookingId userId').lean().exec()
        ]);
    }else{
        logger.info(`Payments for user ${userId} found in cache: \n ${JSON.stringify(payments, null, 2)}\n`);
        bookings = await Booking.find({
            userId,
            status: 'Active',
            eventEndTime: { $gt: new Date().getTime() }
        }).select('-userId -__v -createdAt -updatedAt -scheduledEventURI -eventTypeURI -rescheduleURL').lean().exec();
    }   

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

    res.json(bookingsWithPaymentDetails);
});

//@desc returns all bookings 
//@param valid admin jwt token
//@route GET /bookings/admin
//@access Private(admin)
const getAllBookings = asyncHandler(async (req, res) => {
    if (req?.role !== ROLES_LIST.Admin) return res.sendStatus(401);

    // Get pagination parameters from the query string
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 40) {
        return res.status(400).json({ message: 'Page and limit must be positive integers and limit should not exceed 40' });
    }

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Get the current timestamp
    const currentTimestamp = new Date().getTime();

    // Retrieve paginated bookings
    const bookings = await Booking.find({
        eventStartTime: { $gt: currentTimestamp }
    })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

    // Get the total number of bookings
    const totalBookings = await Booking.countDocuments({
        eventStartTime: { $gt: currentTimestamp }
    });

    if (bookings.length === 0) return res.status(204).end();

    // Log data for debugging purposes (optional)
    console.log(`ADMIN booking data sent: ${JSON.stringify(bookings, null, 2)}`);

    // Send paginated data along with metadata
    res.json({
        page,
        limit,
        totalBookings,
        totalPages: Math.ceil(totalBookings / limit),
        bookings
    });
});


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