const { google } = require('googleapis');
const fs = require('fs');
const logger = require('../utils/logger'); // Import the logger
const stream = require('stream');

const { G_DRIVE_CLIENT_EMAIL, G_DRIVE_PRIVATE_KEY, G_DRIVE_PARENT_PATH } = require('../config/config');

const SCOPE = ['https://www.googleapis.com/auth/drive'];

async function authenticate() {
    const jwtClient = new google.auth.JWT(
        G_DRIVE_CLIENT_EMAIL,
        null,
        G_DRIVE_PRIVATE_KEY,
        SCOPE
    );
    
    try {
        await jwtClient.authorize();
        logger.log('Drive Authentication successful');
        return jwtClient;
    } catch (error) {
        logger.log('Error during authentication:', error.message);
        throw error; // Re-throw the error after logging it
    }
}

async function uploadFile(authClient, fileBuffer, fileName, mimeType) {
    const drive = google.drive({ version: 'v3', auth: authClient });

    try {
        const fileMetaData = {
            name: fileName,
            parents: [G_DRIVE_PARENT_PATH] // Replace with your folder ID
        };

        const response = await drive.files.create({
            resource: fileMetaData,
            media: {
                body: new stream.PassThrough().end(fileBuffer), // Use the buffer from multer
                mimeType: mimeType
            },
            fields: 'id, webViewLink'
        });

        const fileId = response.data.id;
        const fileLink = response.data.webViewLink;

        logger.log('File Uploaded Successfully!')
        // console.log('File uploaded successfully. File ID:', fileId);
        // console.log('File view link:', fileLink);

        return { fileId, fileLink };
    } catch (error) {
        console.error('Error uploading file:', error.message);
        throw error;
    }
}


async function readFile(authClient, fileId) {
    const drive = google.drive({ version: 'v3', auth: authClient });

    try {
        const response = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        // Convert arraybuffer to base64
        const base64 = Buffer.from(response.data).toString('base64');
        
        logger.log('File read successfully');
        return base64; // Return the base64 encoded file contents
    } catch (error) {
        logger.log('Error reading file:', error.message);
        throw error; // Re-throw the error to be handled by the caller
    }
}


async function updateFile(authClient, fileId, newFilePath) {
    return new Promise((resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth: authClient });

        drive.files.update({
            fileId: fileId,
            media: {
                body: fs.createReadStream(newFilePath), // Path to the new file content
                mimeType: 'text/plain'
            },
            fields: 'id'
        }, (error, file) => {
            if (error) {
                logger.log('Error updating file:', error.message);
                return reject(error);
            }

            logger.log('File updated successfully. File ID:', file.data.id);
            resolve(file.data.id);
        });
    });
}

async function deleteFile(authClient, fileId) {
    return new Promise((resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth: authClient });

        drive.files.delete({
            fileId: fileId
        }, (error) => {
            if (error) {
                logger.log('Error deleting file:', error.message);
                return reject(error);
            }

            logger.log('File deleted successfully');
            resolve(`File with ID ${fileId} deleted`);
        });
    });
}

module.exports = {
    authenticate,
    uploadFile,
    readFile,
    updateFile,
    deleteFile
};
