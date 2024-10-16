const fs = require('fs');
const path = require('path');
const { NODE_ENV } = require('../config/config');
// Check if the environment is production
const isProduction = NODE_ENV === 'production';
// console.log(isProduction)

// Define the path for your log file
const logFilePath = path.join(__dirname, '../logs/application.log');

// Create a write stream (in append mode), but only if not in production
const logStream = !isProduction ? fs.createWriteStream(logFilePath, { flags: 'a' }) : null;

function logMessage(...messages) {
    if (isProduction) {
        return; // Don't log anything in production
    }

    const now = new Date();
    const offset = 5 * 60 + 30; // IST offset from UTC in minutes
    const localTime = new Date(now.getTime() + offset * 60000);
    const timestamp = localTime.toISOString().replace('Z', '+05:30'); // Format with IST offset

    // Join all messages into a single string with a space separator
    const logEntry = messages.map(msg => msg.toString()).join(' ');

    // Write to the log stream
    logStream.write(`[${timestamp}] ${logEntry}\n`);
}

module.exports = {
    log: logMessage
};
