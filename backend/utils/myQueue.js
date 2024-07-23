const { Queue, Worker } = require('bullmq');
const { transporter } = require('./emailTransporter');
const logger = require('../logs/logger');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const TemporaryBooking = require('../models/TemporaryBooking');

let myQueue = null; // Variable to hold the queue instance
let queueWorker = null; // Variable to hold the worker instance

try {
    // Create Queue instance
    myQueue = new Queue('myQueue', {
        connection: { 
            host: 'localhost',
            port: 6379,
            password: process.env.KEYDB_PASSWORD,
            enableOfflineQueue: false,
        },
        defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 5 // Retry the job 5 times on failure
        },
    });

    // Create Worker instance and set up error handling
    queueWorker = new Worker('myQueue', async (job) => {
        switch (job.name) {
            case 'verifyEmail':
                return sendVerificationEmail(job);
            case 'resetPassword':
                return sendResetPasswordEmail(job);
            case 'refundRequest':
                return sendRefundRequest(job);
            case 'refundConfirmation':
                return sendRefundConfirmation(job);
            case 'deleteDocuments':
                return deleteDocuments(job);
            default:
                logger.error(`[QUEUE SWITCH] Unknown email Job name: ${job.name}`);
                return Promise.resolve({ success: false, error: 'Unknown email type' });
        }
    }, { connection: { host: 'localhost', port: 6379, password: process.env.KEYDB_PASSWORD } });

    // Failed job handler
    queueWorker.on('failed', async (job, err) => {
        // Check if the job has failed after all retry attempts
        if (job.attemptsMade === job.opts.attempts) {
            const type = (job.name === 'deleteDocuments') ? 'DATABASE' : 'EMAIL';
            logger.info(`[QUEUE ERROR HANDLER] with following details:`);
            logger.error(`[QUEUE ERROR HANDLER] [${type}] ${job.name} Job to ${job.data.recipient} failed after ${job.opts.attempts} retries. \nid: ${job.id} \nError: ${err.message}`);

            // Send email to admin
            const adminEmail = 'abdullahmohsin21007@gmail.com'; // Replace with your admin email
            const mailOptions = {
                from: 'admin@fatimanaqvi.com',
                to: adminEmail,
                subject: 'Job Failure Notification',
                html: `
                    <h1>Job Failure Alert. Please debug</h1>
                    <h2>Job Details</h2>
                    <p>Job ID: ${job.id}</p>
                    <p>Job Name: ${job.name}</p>
                    <p>Recipient: ${job.data.recipient}</p>
                    <p>Error Message: ${err.message}</p>
                    <p>Job Data: ${JSON.stringify(job.data)}</p>
                `
            };

            try {
                // production: uncomment below line
                // await transporter.sendMail(mailOptions);     
                logger.info(`Error log sent to admin for job ${job.id}`);
            } catch (notificationError) {
                logger.error(`[EMAIL] Failed to send notification to admin for job ${job.id}. Killing job. Error: ${notificationError}`);
            }
        }
    });

    queueWorker.on("error", (err) => {
        // logger.error(`[QUEUE ERROR] Error with the worker: ${err.message}`)
    })
    myQueue.on("error", (err) => {
        // logger.error(`[QUEUE ERROR] Error with the Queue: ${err.message}`)
    })
    logger.success('Queue initialized successfully.');
} catch (error) {
    logger.error(`[QUEUE INITIALIZATION] Error initializing queue: ${error.message}`);
}





//--------------------------------------------------- JOB HANDLERS ----------------------------------------------------//

// Function to delete documents based on job data
const deleteDocuments = async (job) => {
    try {
        const { documentIds, model } = job.data;

        let modelInstance;
        switch (model) {
            case 'User':
                modelInstance = User;
                break;
            case 'Booking':
                modelInstance = Booking;
                break;
            case 'Payment':
                modelInstance = Payment;
                break;
            case 'TemporaryBooking':
                modelInstance = TemporaryBooking;
                break;
            default:
                logger.error(`Unknown model: ${model}`);
                return;
        }

        // Delete all documents with the given IDs
        await modelInstance.deleteMany({ _id: { $in: documentIds } });
        logger.info(`Successfully deleted documents from ${model} with IDs: ${documentIds}`);
    } catch (error) {
        logger.error(`Error deleting documents from ${job.data.model}: ${error}`);
        throw error; // Propagate error for external handling
    }
};

// Function to send verification email
const sendVerificationEmail = async (job) => {
    try {
        const { name, recipient, link } = job.data;

        // Mail options with Handlebars template
        const mailOptions = {
            from: 'verification@fatimanaqvi.com',
            to: recipient,
            subject: 'Reset Password',
            replyTo: 'no-reply@fatimanaqvi.com',
            template: 'verifyEmail', // Name of the Handlebars template file (without .hbs extension)
            context: { 
                name,
                link
            }
        };
        await transporter.sendMail(mailOptions);
        logger.info(`Verification email sent to ${recipient}`);
    } catch (error) {
        logger.error(`[EMAIL] Error sending verification email to ${job.data.recipient}: ${error}`);
        throw error; // Propagate error for external handling
    }
};

// Function to send reset password email
const sendResetPasswordEmail = async (job) => {
    try {
        const { name, recipient, link } = job.data;

        // Mail options with Handlebars template
        const mailOptions = {
            from: 'reset@fatimanaqvi.com',
            to: recipient,
            subject: 'Reset Password',
            replyTo: 'no-reply@fatimanaqvi.com',
            template: 'resetPassword', // Name of the Handlebars template file (without .hbs extension)
            context: { 
                name,
                link
            }
        };

        await transporter.sendMail(mailOptions);
        logger.info(`Reset password email sent to ${recipient}`);
    } catch (error) {
        logger.error(`[EMAIL] Error sending Reset Password link to ${job.data.recipient}: ${error}`);
        throw error; // Propagate error for external handling
    }
};

// Function to handle refund request email
const sendRefundRequest = async (job) => {
    try {
        const { booking, payment,updatePaymentStatus } = job.data;

        if ( !booking || !payment) {
            throw new Error('Missing required data for refund request email');
        }

        const user = await User.findOne({ _id: booking.userId }, 'name email').lean().exec();
        if (!user) {
            logger.info(`User not found for booking ${booking.bookingId}. Could not send refund email.`);
            throw new Error(`User not found for booking ${booking.bookingId}`);
        }

        // Prepare data for email
        const eventStartTime = new Date(booking.eventStartTime);
        const currentTime = new Date();
        const millisecondsIn72Hours = 72 * 60 * 60 * 1000;

        const cancelledWithin72Hours = (eventStartTime - currentTime) < millisecondsIn72Hours && (eventStartTime - currentTime) > 0;
        const eventDate = new Date(booking.eventStartTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const eventTime = new Date(booking.eventStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });        
        const paymentCompletedDate = payment.paymentCompletedDate ? new Date(payment.paymentCompletedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) + ' ' + new Date(payment.paymentCompletedDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
        const refundLink = `https://sandbox.api.getsafepay.com/dashboard/payments/details/${payment.tracker}`;  //production: change to correct prod url

        const mailOptions = {
            from: 'admin@fatimanaqvi.com',
            to: process.env.ADMIN_EMAIL,
            subject: '[ACTION REQUIRED] Refund Request',
            template: 'refundRequest',
            context: {
                name: user.name,
                userEmail: user.email,
                bookingId: booking.bookingId,
                eventDate,
                eventTime,
                paymentAmount: payment.amount,
                paymentStatus: payment.transactionStatus,
                paymentCompleted: paymentCompletedDate,
                transactionReferenceNumber: payment.transactionReferenceNumber,
                refundLink,
                cancelledWithin72Hours,
            }
        };

        await transporter.sendMail(mailOptions);
        logger.info(`Refund request email sent to ${process.env.ADMIN_EMAIL}`);
        //only update payment status if updatePaymentStatus is true and email is sent successfully
        if(updatePaymentStatus){
            await Payment.updateOne({ _id: payment._id }, { transactionStatus: 'Refund Requested' });
            logger.info(`Payment status updated to 'Refund Requested' for paymentId: ${payment._id}`);
        }
    } catch (error) {
        logger.error(`[EMAIL] Error processing refund request: ${error}`);
        throw error; // Propagate error so that the job is retried
    }
};
// Function to handle refund request email
const sendRefundConfirmation = async (job) => {
    try {
        const { payment } = job.data;
        if (!payment) {
            throw new Error('Missing required data for refund request email');
        }

        const [ user, booking ] = await Promise.all([
            User.findOne({ _id: payment.userId }, 'name email').lean().exec(),
            Booking.findOne({ _id: payment.bookingId }).select('').lean().exec()
        ]);

        const eventDate = new Date(booking.eventStartTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const eventTime = new Date(booking.eventStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });        
        const paymentCompletedDate = payment.paymentCompletedDate ? new Date(payment.paymentCompletedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) + ' ' + new Date(payment.paymentCompletedDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';


        const mailOptions = {
            from: 'admin@fatimanaqvi.com',
            to: user.email,
            subject: 'Refund Confirmation',
            replyTo: process.env.ADMIN_EMAIL,
            template: 'refundConfirmation',
            context:{
                name: user.name,
                userEmail: user.email,
                bookingId: booking.bookingId,
                eventDate,
                eventTime,
                paymentAmount: payment.amount,
                paymentStatus: payment.transactionStatus,
                paymentCompleted: paymentCompletedDate,
                transactionReferenceNumber: payment.transactionReferenceNumber,
                adminEmail: process.env.ADMIN_EMAIL,
                currentYear: new Date().getFullYear(),
            }
        };

        await transporter.sendMail(mailOptions);
        logger.info(`Refund Confirmation email sent to ${user.email}`);

    } catch (error) {
        logger.error(`[EMAIL] Error processing refund request: ${error}`);
        throw error; // Propagate error for external handling
    }
};

module.exports = {
    myQueue,
    queueWorker, // Export the worker instance to be closed during graceful shutdown
    sendVerificationEmail,
    sendResetPasswordEmail,
    sendRefundRequest,
    sendRefundConfirmation,
    deleteDocuments,
};
