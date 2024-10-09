const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');
const AWS = require('../database/db_utils');
const logger = require('../utils/logger'); // Adjust the path if necessary
const { encrypt, decrypt } = require('../utils/enc_dec');
const { client } = require('../database/db');
const { BCRYPT_SALT, AUTH_MASTER_KEY } = require('../config/config');

// Initialize AWS object
const aws = new AWS(client);

//Tickets I will raise
router.post('/iraise', async (req, res) => {
    const { user_id, subject, domain, resolver, priority, description, authKey } = req.body;
    try {
        const date_time = DateTime.now().setZone('Asia/Kolkata').toISO();
        const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex')
        const data = {
            subject: encrypt(subject, masterKey, authKey)['encryptedData'],
            domain: domain,
            description: encrypt(description, masterKey, authKey)['encryptedData'],
            raised_on: date_time,
            raised_by: user_id,
            resolver: resolver,
            priority: priority,
            status: 'New',
        }
        const response = await aws.insertRow("tickets", data, "ticket_id")
        return res.json(response);
    } catch (error) {
        // console.log(error);
        logger.log("Error Raising Ticket")
        return res.json("Failed")
    }
});

//Tickets I have Raised(Pending Ones)
router.post('/ipending', async (req, res) => {
    const { user_id, authKey } = req.body;
    try {
        const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex');
        
        // Fetch rows where raised_by equals user_id
        const results = await aws.getRow("tickets", { raised_by: user_id });

        // Check if results is an array and not empty
        if (Array.isArray(results) && results.length > 0) {
            // Decrypt subject and description for each row in the results
            const decryptedResults = results.map(row => {
                return {
                    ...row,
                    subject: decrypt(row.subject, masterKey, authKey),
                    description: decrypt(row.description, masterKey, authKey)
                };
            });

            return res.json(decryptedResults);
        } else {
            return res.json([]);
        }
    } catch (error) {
        // console.log(error);
        logger.log("Error Fetching Pending Tickets");
        return res.json("Failed");
    }
});

//Decrypts and drops the auth_key
const decryptItems = (items, key) => {
    return items.map(({ auth_key, ...item }) => {
        // Decrypt subject and description
        const decryptedSubject = decrypt(item.subject, key, auth_key);
        const decryptedDescription = decrypt(item.description, key, auth_key);

        // Return the updated item with decrypted values
        return {
            ...item,
            subject: decryptedSubject,
            description: decryptedDescription
        };
    });
};

//Tickets I need to Resolve
router.post('/pending', async (req, res) => {
    const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex');
    const { user_id } = req.body;
    
    // Define the table names
    const mainTable = 'tickets';
    const joinTable = 'users';

    // Define the join condition and filter condition
    const joinCondition = 'users.user_id = tickets.raised_by'; // Ensure this is a string
    const filterCondition = { 'tickets.resolver': user_id }; 

    try {
        // Call the getRowsWithJoin method with updated parameters
        const result = await aws.getRowsWithJoin(mainTable, joinTable, joinCondition, filterCondition, ['tickets.*', 'users.username','users.auth_key']);
        if (Array.isArray(result) && result.length > 0) {
            const decryptedItems = decryptItems(result, masterKey);
            return res.json(decryptedItems);
        } else
            return res.json([])
    } catch (error) {
        logger.log("Error Fetching Pending Tickets", error);
        return res.json("Failed");
    }
});


//Tickets I am Resolving
router.post('/resolve', async (req, res) => {
    const { ticket_id, auth_key, ...rest } = req.body; // Extract ticket_id and collect the rest

    // Build the updates object by filtering out undefined or null values
    const updates = Object.keys(rest).reduce((acc, key) => {
        if (rest[key] !== undefined && rest[key] !== null) {
            acc[key] = rest[key];
        }
        return acc;
    }, {});

    if (!ticket_id) {
        return res.status(400).json({ success: false, message: "ticket_id is required" });
    }

    try {
        // 1. Update the tickets table
        const updateResult = await aws.updateTable("tickets", updates, { ticket_id });
        if (updateResult === null) {
            throw new Error("No rows updated in tickets table");
        }

        res.json({ success: true, message: "Ticket resolved successfully" });
    } catch (err) {
        logger.log("Error: Unable to resolve ticket", err);
        res.status(500).json({ success: false, message: "Unable to resolve ticket" });
    }
});



//Tickets I have Resolved
router.post('/resolved', async (req, res) => {
    const { username, password } = req.body;
    logger.log(`Raise Ticket request: ${username}`);
    return res.json("Recieved")
});

router.post('/update_ticket', async (req, res) => {
    const { ticket_id, auth_key, ...rest } = req.body; // Extract ticket_id and collect the rest

    // Build the updates object by filtering out undefined or null values
    const updates = Object.keys(rest).reduce((acc, key) => {
        if (rest[key] !== undefined && rest[key] !== null) {
            acc[key] = rest[key];
        }
        return acc;
    }, {});

    try {
        // Call updateTable with the updates and condition
        const response = await aws.updateTable("tickets", updates, { ticket_id: ticket_id });
        res.json({ success: true, updatedRows: response });
    } catch (err) {
        logger.log("Error: Unable to update ticket", err);
        res.status(500).json({ success: false, message: "Unable to update ticket" });
    }
});




module.exports = router;
