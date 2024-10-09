const express = require('express');
const router = express.Router();
const AWS = require('../database/db_utils');
const logger = require('../utils/logger'); // Adjust the path if necessary
const { DateTime } = require('luxon');
const { client } = require('../database/db');


// Initialize AWS object
const aws = new AWS(client);

router.post('/send_text', async (req, res) => {
    const { trip_id, sender_id, content, reply_of } = req.body;
    try {
        const date_time = DateTime.now().setZone('Asia/Kolkata').toISO(); // Convert to IST and format as ISO 8601
        const data = {
            trip_id: trip_id,
            sender_id: sender_id,
            content: content,
            created_at: date_time,
            reply_of: reply_of
        };

        const response = await aws.insertRow("trip_messages", data, "trp_msg_id");

        return res.json(response);
    } catch (error) {
        // Log the error and send a failure response
        logger.log("Error Posting Trip Message: " + error.message);
        return res.status(500).json({ success: false, message: "Failed to create trip" });
    }
});

router.post('/read_messages', async (req, res) => {
    const { trip_id } = req.body;
    try {
        const mainTable = 'trip_messages';
        const joinTable = 'users';

        // Define the join condition and filter condition
        const joinCondition = 'users.user_id = trip_messages.sender_id'; // Ensure this is a string
        const filterCondition = { 'trip_messages.trip_id': trip_id }; 
        const result = await aws.getRowsWithJoin(mainTable, joinTable, joinCondition, filterCondition, ['trip_messages.*', 'users.username','users.auth_key']);
        if (Array.isArray(result) && result.length > 0) {
            return res.json(result);
        } else
            return res.json([])
    } catch (error) {
        // Log the error and send a failure response
        logger.log("Error Reading Trip Messages: " + error.message);
        return res.status(500).json({ success: false, message: "Failed to read trip" });
    }
})

router.post('/edit', async (req, res) => {
    const { trp_msg_id, content } = req.body;
    try {
        const result = aws.updateTable('trip_messages', { content: content }, { trp_msg_id: trp_msg_id });
        return res.json(result);
    } catch (error) {
        logger.log("Error Editing Chat: " + error.messages)
        return res.status(500).json({success: false, message: "Failed to edit chat"})
    }
})

router.post('/delete', async (req, res) => {
    const { trp_msg_id } = req.body;
    try {
        const result = await aws.deleteRow('trip_messages', { trp_msg_id: trp_msg_id })
        return res.json(result);
    } catch (error) {
        logger.log("Error Deleting Chat: " + error.message)
        return res.status(500).json({ success: false, message: "Failed to delete chat"})
    }
})

module.exports = router;
