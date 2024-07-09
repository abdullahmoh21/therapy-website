const { Queue, Worker } = require('bullmq');
const handlebars = require('handlebars');
const transporter = require('./emailTransporter');
const logger = require('../logs/logger');
const fs = require('fs').promises;
const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const TemporaryBooking = require('../models/TemporaryBooking');


const connection = {
    host: '127.0.0.1',
    port: 6379,
    password: process.env.KEYDB_PASSWORD
}
const myQueue = new Queue('myQueue', {
    connection,
    defaultJobOptions: {
        removeOnComplete: true, 
        removeOnFail: false, 
        attempts: 5 // Retry the job 5 times on failure
    }
})

const queueProcessor = new Worker('myQueue', async (job) => {
    switch (job.name) {
        case 'verifyEmail':
            return sendVerificationEmail(job);
        case 'resetPassword':
            return sendResetPasswordEmail(job);
        case 'refundRequest':
            return refundRequest(job);
        case 'deleteDocuments':
            return deleteDocuments(job);
        default:
            console.error(`Unknown email Job name: ${job.name}`);
            return Promise.resolve({ success: false, error: 'Unknown email type' });
    }

}, { connection });

// failed job handler
// TODO: test job failure handling
queueProcessor.on('failed', async (job, err) => {
    const type = (job.name === 'deleteDocuments') ? 'DATABASE' : 'EMAIL';
    // Log the error
    logger.error(`[${type}] ${job.name} Job to ${job.data.recipient} failed after five retries. \nid: ${job.id} \nError: ${err.message}`);

    // Prepare and send an email to the admin with job data and error message
    const adminEmail = 'abdullahmohsin21007@gmail.com'; // Replace with your admin email
    const mailOptions = {
        from: 'admin@fatimanaqvi.com',
        to: adminEmail,
        subject: 'Job Failure Notification',
        html: `
            <h1>Job Failure Alert. Please degub</h1>
            <h2>Job Details</h2>
            <p>Job ID: ${job.id}</p>
            <p>Job Name: ${job.name}</p>
            <p>Recipient: ${job.data.recipient}</p>
            <p>Error Message: ${err.message}</p>
            <p>Job Data: ${JSON.stringify(job.data)}</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Error log sent to admin for job ${job.id}`);
    } catch (notificationError) {
        logger.error(`[EMAIL] Failed to send notification to admin for job ${job.id}. Killing job. Error: ${notificationError}`);
    }
});

const deleteDocuments = async (job) => {
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

    try {
        //deletes all documents with the given IDs
        await modelInstance.deleteMany({ _id: { $in: documentIds } });
        logger.info(`Successfully deleted documents from ${model} with IDs: ${documentIds}`);
    } catch (error) {
        logger.error(`Error deleting documents from ${model}: ${error}`);
    }
}

const loadEmailTemplate =  async (name) =>  {
    try {
        const path = `./utils/emailTemplates/${name}Template.hbs`
        const source = await fs.readFile(path, 'utf-8');
        return source;
    } catch (error) {
        console.error('Error reading the email template:', error);
    }
}

const sendVerificationEmail = async (job) => {
    const { name, recipient , link } = job.data;

    //Handlebars HTML email generation
    const source = await loadEmailTemplate(job.name)
    const template = handlebars.compile(source);
    const htmlToSend = template({name,link});

    const mailOptions = {
        from: 'verification@fatimanaqvi.com',
        to: recipient,
        subject: 'Please verify your account',
        html: htmlToSend
    }
    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Verification email sent to ${recipient}`);
    } catch (error) {
        logger.error(`[EMAIL] Error sending verification email to ${recipient}: ${error}`);
    }
}

const sendResetPasswordEmail = async (job) => {
    const { name, recipient , link } = job.data;

    //Handlebars HTML email generation
    const source = await loadEmailTemplate(job.name);
    const template = handlebars.compile(source);
    const htmlToSend = template({name,link});

    const mailOptions = {
        from: 'reset@fatimanaqvi.com',
        to: recipient,
        subject: 'Reset Paswword',
        html: htmlToSend
    }
    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Verification email sent to ${recipient}`);
    } catch (error) {
        logger.error(`[EMAIL] Error sending Reset Password link to ${recipient}: ${error}`);
    }
}

const refundRequest = async (job) => {
    try {
        const { recipient, booking, payment, reason } = job.data;
        if(!recipient || !booking || !payment || !reason) {throw new Error('Missing required data for refund request email')}

        // Handlebars HTML email generation
        const source = await loadEmailTemplate(job.name);
        const template = handlebars.compile(source);

        const user = await User.findOne({ _id: booking.userId }, 'name email').lean().exec();
        if (!user) {
            logger.info(`User not found for booking ${booking.bookingId}. Could not send refund email.`);
            throw new Error(`User not found for booking ${booking.bookingId}`);
        }

        // Prepare data for email
        const eventDate = new Date(booking.eventStartTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const eventTime = new Date(booking.eventStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });        
        const paymentCompletedDate = payment.paymentCompleted ? new Date(payment.paymentCompleted).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) + ' ' + new Date(payment.paymentCompleted).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
        const refundLink = `https://sandbox.api.getsafepay.com/dashboard/payments/details/${payment.tracker}`

        const htmlToSend = template({
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
            reason
        });

        const mailOptions = {
            from: 'refunds@fatimanaqvi.com',
            to: recipient,
            subject: '[ACTION REQUIRED]Refund Request',
            html: htmlToSend
        };

        const response = await transporter.sendMail(mailOptions);
        logger.info(`Refund request email sent to ${recipient}\n response: ${response}`);
    } catch (error) {
        logger.error(`[EMAIL] Error processing refund request: ${error}`);
    }
};


module.exports = myQueue;