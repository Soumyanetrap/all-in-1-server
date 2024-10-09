const { Client } = require('pg');
const { DB_USER, DB_HOST, DB_DATABASE, DB_PASSWORD, DB_PORT } = require('../config/config');
const logger = require('../utils/logger');

// Create a new client instance with your database configuration
const client = new Client({
    user: DB_USER,
    host: DB_HOST,
    database: DB_DATABASE,
    password: DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false // Set to true if you have valid SSL certificates
    },
    port: DB_PORT, // default port for PostgreSQL
});

async function connect() {
    try {
        await client.connect();
        logger.log('Success: Connected to PostgreSQL');

        return true; // Connection successful
    } catch (err) {
        logger.log('Connection Error', err.stack);
        return false; // Connection failed
    }
}

// Export the client and the connect function as an object
module.exports = { client, connect };
