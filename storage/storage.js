const express = require('express');
const multer = require('multer');
const router = express.Router();
const AWS = require('../database/db_utils');
const logger = require('../utils/logger'); // Adjust the path if necessary
const { client } = require('../database/db');
const { authenticate, uploadFile, readFile, deleteFile } = require('./storage_utils')

// Initialize AWS object
const aws = new AWS(client);

const upload = multer({ storage: multer.memoryStorage() });

router.post('/uploadFile', upload.array('files'), async (req, res) => {
    const { user_id, ticket_id, trip_id, investment_id } = req.body; // Extract metadata from body

    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    const authClient = await authenticate();
    const fileResults = [];
    const fileDetails = [];

    try {
        // Collect all file details and upload them
        for (const file of req.files) {
            const fileBuffer = file.buffer;
            const fileName = file.originalname;
            const mimeType = file.mimetype;

            // Upload the file and get the result
            const result = await uploadFile(authClient, fileBuffer, fileName, mimeType);
            // console.log(result);
            fileResults.push(result);
            fileDetails.push({ doc_name: fileName, link: result.fileId });
        }

        // Insert all file details into the attachments table
        const documentIds = await aws.insertRow('attachments', fileDetails, 'doc_id'); // Collect all doc_ids

        // Ensure documentIds is an array
        const documentIdsArray = Array.isArray(documentIds) ? documentIds : [documentIds];
        let id
        if (ticket_id) {
            // Prepare data for ticket_attachments table
            const ticketAttachmentRows = documentIdsArray.map(docId => ({
                doc_id: docId,
                user_id,
                ticket_id
            }));

            // Insert into the ticket_attachments table
            id = await aws.insertRow('ticket_attachments', ticketAttachmentRows, 'tka_id');
        } else if (trip_id) {
            const tripAttachmentRows = documentIdsArray.map(docId => ({
                doc_id: docId,
                trip_id
            }));  
            id = await aws.insertRow('trip_attachments', tripAttachmentRows, 'tra_id');
        }

        res.json(id);
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).send('Error uploading files.');
    }
});

router.post('/readFiles', async (req, res) => {
    const { ticket_id, trip_id } = req.body;

    const authClient = await authenticate();

    // Ensure ticket_id is provided
    if (!ticket_id && !trip_id) {
        return res.status(400).send('Either ticket_id or trip_id is required');
    }

    // Define table names and conditions
    const mainTable = 'attachments';
    const joinTable = ticket_id ? 'ticket_attachments' : 'trip_attachments';
    const joinCondition = `attachments.doc_id = ${joinTable}.doc_id`;

    // Create the filter condition
    const filterCondition = ticket_id 
        ? { 'ticket_attachments.ticket_id': ticket_id } 
        : { 'trip_attachments.trip_id': trip_id };

    const columns = ['attachments.*']; // Retrieve link, name, and ID
    try {
        // Step 1: Get the file details (link, name, ID)
        const rows = await aws.getRowsWithJoin(mainTable, joinTable, joinCondition, filterCondition, columns);
        // console.log(rows)
        if (rows === null) {
            return res.status(404).send('No attachments found');
        }
        
        // Step 2: Read the files and collect their contents
        const fileDetails = await Promise.all(rows.map(async (row) => {
            try {
                const fileContent = await readFile(authClient, row.link);
                return { "file_id":row.link ,"doc_name": row.doc_name, "doc_id":row.doc_id, content: fileContent };
            } catch (error) {
                // Log error and return a placeholder for missing file content
                console.error(`Error reading file with ID ${row.link}:`, error.message);
                return { "file_id":row.link, "doc_name": row.doc_name, "doc_id":row.doc_id, error: error.message };
            }
        })); 
        return res.status(200).json(fileDetails);
    } catch (err) {
        console.error('Error in /readFiles:', err);
        return res.status(500).send('Internal server error');
    }
});

router.post('/deleteFile', async (req, res) => {
    const { doc_id, link } = req.body;

    if (!link || !doc_id) {
        return res.status(400).send('Missing required parameters.');
    }

    try {
        // Authenticate the client
        const authClient = await authenticate();

        // Delete the file from Google Drive
        await deleteFile(authClient, link); // Assuming deleteFile function is defined as in your previous code

        // On successful deletion, delete the row from the attachments table
        await aws.deleteRow('attachments', { doc_id });

        res.send('File deleted successfully.');
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).send('Error deleting file.');
    }
});


module.exports = router;