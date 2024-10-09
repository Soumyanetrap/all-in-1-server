const sgMail = require('@sendgrid/mail')
const crypto = require('crypto');
const { SENDGRID_API_KEY, MAIL_SENDER_ID } = require('../config/config');

sgMail.setApiKey(SENDGRID_API_KEY)

function generateOTP(length = 6) {
    return crypto.randomInt(0, 10 ** length).toString().padStart(length, '0');
}

async function sendOTP(toEmail) {
    const otp = generateOTP(); // Generate a 6-digit OTP
    const msg = {
        to: toEmail, // Change to your recipient
        from: MAIL_SENDER_ID, // Change to your verified sender
        subject: 'All-in-1 OTP',
        text: `OTP:${otp}`,
    }
    try {
        // Send email with SendGrid
        await sgMail.send(msg);
        return otp; // Return the OTP if sent successfully
    } catch (error) {
        return error
    }
}


module.exports=sendOTP