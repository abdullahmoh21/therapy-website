const React = require('react')
const crypto = require('crypto')
const logger = require('../logs/logger')
const asyncHandler = require('express-async-handler')
const axios = require('axios')
const { myQueue } = require('../utils/myQueue')
const User = require('../models/User')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const TemporaryBooking = require('../models/TemporaryBooking')

const handleCalendlyWebhook = asyncHandler(async (req, res) => {
    const { event, payload } = req.body;
    const { //destructure payload
        cancel_url, 
        reschedule_url,
        email,
        tracking: { utm_content: receivedUtmContent },
        scheduled_event: {
            start_time,
            end_time,
            uri: eventURI,
            name: eventName,
            event_type: eventTypeURI
        }
    } = payload;

    // NEW USER route
    // since users books a consultation BEFORE an account is created there is no utm_content to link a user to a booking
    // so instead, we save the booking in a temporary collection and link it to the user when they create an account
    if (eventName === '15 Minute Consultation'){
        logger.info(`New booking for consultation: ${email}`);
        if (event === "invitee.created") {
            const tempBooking = await TemporaryBooking.create({
                email,
                cancelURL: cancel_url,
                rescheduleURL: reschedule_url,
                eventStartTime: start_time,
                eventEndTime: end_time,
                eventName,
                scheduledEventURI: eventURI,
                eventTypeURI
            })
            if(!tempBooking) {
                logger.error(`Error creating temporary booking for consultation: ${email}`);
                return res.status(500).end();
            }
            return res.status(200).end();
        }else if (event === "invitee.canceled") {
            await TemporaryBooking.deleteOne({ scheduledEventURI }).exec().lean();
            return res.status(200).end();
        }
    }

    // EXISTING USER route
    // if the event is not a consultation, we search by utm_content
    try {
        logger.debug(`Handling Calendly webhook for event: ${event}`)
        if (event === "invitee.created") {
            // Check if a booking already exists for this eventURI to ensure idempotency
            const existingBooking = await Booking.findOne({ scheduledEventURI: eventURI }).exec();
            if (existingBooking) {
                console.log(`Booking already exists for eventURI: ${eventURI}. Skipping creation.`);
                return res.status(200).end();
            }

            const user = await User.findOne({ utmContent: receivedUtmContent }).exec();
            if (!user) {
                console.log(`No user found with utm_content: ${receivedUtmContent}. Deleting event.`);
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
                console.log(`Event deleted`);
                return res.sendStatus(200).end();
            }

            const booking = new Booking({
                userId: user._id,
                eventStartTime: start_time,
                eventEndTime: end_time,
                eventName,
                scheduledEventURI: eventURI,
                eventTypeURI,
                cancelURL: cancel_url,
                amount: process.env.SESSION_PRICE,
                rescheduleURL: reschedule_url
            });
            await booking.save();
            logger.info(`Booking created`);
            const payment = new Payment({
                userId: user._id,
                bookingId: booking._id,
                amount: process.env.SESSION_PRICE,
                paymentCurrency: 'PKR',
                status: 'Pending'
            });
            await payment.save();
            logger.info(`Payment created`);
            return res.status(200).end();
        } 
        else if (event === "invitee.canceled") {
            console.log(`Event cancelled: ${eventURI}`)

            const booking = await Booking.deleteOne({ scheduledEventURI: eventURI }).exec();
            console.log(`delete count: ${booking.deletedCount}`)
            
            if (booking.deletedCount === 0) {
                console.log(`No booking found to delete for eventURI: ${eventURI}`);
            } else {
                console.log(`Booking deleted`);
            }

            return res.status(200).end();
        }
    } catch (error) {
        console.error(`Error handling Calendly webhook: ${error}`);
        return res.status(500).send('Internal Server Error');
    }
});

const getNewBookingLink = asyncHandler(async (req, res) => {
    const { email } = req;
    console.log(`in new link controller: ${email}`);

    const user = await User.findOne({ email: email }).exec();
    if (!user) return res.status(404).json({ 'message': 'User not found' });

    //if user already has a token, return link with that token
    if(user.utmContent) {
        return res.status(200).json({link: `${process.env.CALENDLY_SESSION_URL}?=utm_source=backend&utm_content=${user.utmContent}`})
    }

    //generate link with tracking token
    const token = crypto.randomBytes(16).toString('hex');
    const bookingLink = `${process.env.CALENDLY_SESSION_URL}?=utm_source=backend&utm_content=${token}`;
    console.log(`new booking link: ${bookingLink}`);

    //save token in user db
    user.utmContent = token;  
    await user.save();

    return res.status(200).json({link: bookingLink});
});

//@desc returns all bookings of a user
//@param {Object} req with valid email
//@route GET /bookings
//@access Private
const getMyBookings = asyncHandler( async (req, res) => {
    const{ email } = req; //from verifyJWT
    const user = await User.findOne({ "email": email }).lean().exec();
    if (!user) return res.status(404).json({ 'message': 'User not found' });

    //find active bookings for user 
    const currentTimestamp = new Date().getTime();
    const bookings = await Booking.find({ 
        userId: user._id, 
        eventEndTime: { $gt: currentTimestamp } 
    }).select('-userId -__v -createdAt -updatedAt -scheduledEventURI -eventTypeURI -rescheduleURL').lean().exec();

    if (bookings?.length === 0) return res.status(204).end();

    // To each booking doc, add certain payment details and status
    const bookingsWithPaymentDetails = await Promise.all(bookings.map(async (booking) => {
        // Skip creating a Payment for "15 Minute Consultation" events, as they are free
        if (booking.eventName === "15 Minute Consultation") {
            return booking; // Return the booking as is, without payment details
        }

        const paymentDetails = await Payment.findOne({ bookingId: booking._id }).lean().exec();//find bookings payment doc
        if (!paymentDetails) { // if none found, create a new payment doc
            const payment = new Payment({
                userId: user._id,
                bookingId: booking._id,
                amount: process.env.SESSION_PRICE,
                currency: 'PKR',
                transactionStatus: 'Pending'
                // transaction refrence will be added when payment is initiated
            });
            await payment.save();
            return {
                ...booking,
                amount: payment.amount, 
                currency: payment.currency, 
                transactionStatus: payment.transactionStatus 
            };
        }

        const { amount, transactionStatus, currency , _id} = paymentDetails;
        return {
            ...booking,
            amount,
            currency,
            transactionStatus,
            paymentId: _id
        };
    }));


    const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000; 
    bookingsWithPaymentDetails.forEach(booking => { // add cancelURL only if event is more than 24 hours away
        const timeUntilEvent = new Date(booking.eventStartTime).getTime() - currentTimestamp;
        booking.cancelURL = (timeUntilEvent > TWENTY_FOUR_HOURS_IN_MS) ? booking.cancelURL : null;
    });

    res.json(bookingsWithPaymentDetails);
})

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


//@desc cleans up old bookings
//@access Private /local use only
const deleteOldBookings = async () => {
    try {
        const oneWeekAgo = new Date(new Date().setDate(new Date().getDate() - 7));
        const result = await Booking.deleteMany({
            $or: [
                { eventEndTime: { $lt: oneWeekAgo } }, // Completed bookings older than a week
                { status: 'cancelled', updatedAt: { $lt: oneWeekAgo } } // Cancelled bookings older than a week
            ]
        }).exec();

        console.log(`Deleted ${result.deletedCount} old or cancelled bookings.`);
    } catch (error) {
        console.error(`Error deleting old or cancelled bookings: ${error}`);
    }
};



module.exports = {
    handleCalendlyWebhook,
    getMyBookings,
    getAllBookings,
    deleteOldBookings,
    getNewBookingLink
}