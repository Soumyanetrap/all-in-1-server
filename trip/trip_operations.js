const express = require('express');
const router = express.Router();
const AWS = require('../database/db_utils');
const logger = require('../utils/logger'); // Adjust the path if necessary
const { encrypt, decrypt } = require('../utils/enc_dec');
const { client } = require('../database/db');
const { BCRYPT_SALT, AUTH_MASTER_KEY } = require('../config/config');


// Initialize AWS object
const aws = new AWS(client);

router.post('/create_trip', async (req, res) => {
    const { user_id, trip_name, from_dest, to_dest, dept_date, arv_date, trip_with, partner_id, mode, notes, authKey } = req.body;
    try {
        // Prepare the master key for encryption
        const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex');

        // Encrypt sensitive data
        const data = {
            trip_name: encrypt(trip_name, masterKey, authKey)['encryptedData'],
            from_dest: encrypt(from_dest, masterKey, authKey)['encryptedData'],
            to_dest: encrypt(to_dest, masterKey, authKey)['encryptedData'],
            dept_date: dept_date,
            arv_date: arv_date,
            trip_with: trip_with, // Not encrypted if not sensitive
            partner_id: partner_id, // Not encrypted if not sensitive
            mode: mode, // Not encrypted if not sensitive
            notes: encrypt(notes, masterKey, authKey)['encryptedData'],
            user_id: user_id
        };

        // Insert the data into the database
        const response = await aws.insertRow("trips", data, "trip_id");

        // Send response
        return res.json(response);
    } catch (error) {
        // Log the error and send a failure response
        logger.log("Error Creating Trip: " + error.message);
        return res.status(500).json({ success: false, message: "Failed to create trip" });
    }
});

router.post('/update_trip', async (req, res) => {
    const { trip_id, user_id, trip_name, from_dest, to_dest, dept_date, arv_date, trip_with, partner_id, mode, notes } = req.body;
    try {
        const usr_det = await aws.getRow("users", { user_id: user_id })
        const authKey = usr_det[0].auth_key

        const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex');

        // Encrypt sensitive data
        const data = {
            trip_name: encrypt(trip_name, masterKey, authKey)['encryptedData'],
            from_dest: encrypt(from_dest, masterKey, authKey)['encryptedData'],
            to_dest: encrypt(to_dest, masterKey, authKey)['encryptedData'],
            dept_date: dept_date,
            arv_date: arv_date,
            trip_with: trip_with, // Not encrypted if not sensitive
            partner_id: partner_id, // Not encrypted if not sensitive
            mode: mode, // Not encrypted if not sensitive
            notes: encrypt(notes, masterKey, authKey)['encryptedData'],
            user_id: user_id
        };
        
        const response = await aws.updateTable("trips", data, { trip_id: trip_id });
        if(response >= 1)
            return res.json(trip_id);
        else
            return res.status(500).json({ success: false, message: "Failed to update trip"})
    } catch (error) {
        logger.log("Error Updating Trip: " + error.message);
        return res.status(500).json({ success: false, message: "Failed to create trip" });
    }
})

router.post('/get_trips', async (req, res) => {
    const { partner_id } = req.body;

    if (!partner_id) {
        return res.status(400).json({ error: 'partner_id is required' });
    }
    try {
        const mainTable = 'trips';
        const joinTable = 'users';
        const joinCondition = 'trips.user_id = users.user_id';
        const filterCondition = { 'trips.partner_id': partner_id };
        const columns = ["trips.*", "users.auth_key"];

        let rows = await aws.getRowsWithJoin(mainTable, joinTable, joinCondition, filterCondition, columns);

        if (rows === null) {
            rows = [];
        }

        const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex');
        const decryptedRows = rows.map(row => {
            return {
                ...row, // Keep all other fields
                trip_name: decrypt(row.trip_name, masterKey, row.auth_key),
                from_dest: decrypt(row.from_dest, masterKey, row.auth_key),
                to_dest: decrypt(row.to_dest, masterKey, row.auth_key),
                notes: decrypt(row.notes, masterKey, row.auth_key),
                // Exclude auth_key
            };
        });

        // Optionally delete auth_key from each row
        decryptedRows.forEach(row => {
            delete row.auth_key;
        });
        res.json(decryptedRows);
    } catch (error) {
        console.error('Error retrieving trips:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;
