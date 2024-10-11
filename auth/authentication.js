// /auth/authentication.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const AWS = require('../database/db_utils');
const logger = require('../utils/logger'); // Adjust the path if necessary
const { encrypt, decrypt } = require('../utils/enc_dec');
const { client } = require('../database/db');
const { BCRYPT_SALT, AUTH_MASTER_KEY } = require('../config/config');

// Initialize AWS object
const aws = new AWS(client);

router.post('/signin', async (req, res) => {
    const { username, password } = req.body;
    logger.log(`Signin request: ${username}`);
    try {
        let result = await aws.getRow('users', { username });
        if (result) {
            result = result[0];
            const isPasswordMatch = await bcrypt.compare(password, result.password);
            if (isPasswordMatch) {
                logger.log('Success: Login successful.');
                const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex');
                const email = decrypt(result.email, masterKey, result.auth_key);
                
                // Set CORS headers
                res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000"); // Replace with your allowed origin
                res.setHeader("Access-Control-Allow-Credentials", "true"); // If needed for cookies

                res.json({ message: 'success', user_id: result.user_id, email, auth_key: result.auth_key });
            } else {
                logger.log('Failed to verify user.');
                
                // Set CORS headers
                res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
                res.setHeader("Access-Control-Allow-Credentials", "true");

                res.json({ message: 'failed', user_id: null });
            }
        } else {
            logger.log('Failed to verify user.');
            
            // Set CORS headers
            res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
            res.setHeader("Access-Control-Allow-Credentials", "true");

            res.json({ message: 'failed', user_id: null });
        }
    } catch (error) {
        logger.log(`Error in POST /signin: ${error.message}`);
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
        res.status(500).send('Failed to sign in');
    }
});

router.post('/signup', async (req, res) => {
    const { name, username, email, password } = req.body;
    const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex')
    const { iv, encryptedData } = encrypt(email, masterKey);
    const bcrypt_salt = await bcrypt.genSalt(BCRYPT_SALT); //Number of iterations 
    const hash_password = await bcrypt.hash(password, bcrypt_salt);
    logger.log(`Signup request: ${name}, ${username}, ${email}`);
    try {
        const result = await aws.insertRow('users', { username, name, email:encryptedData, password:hash_password, auth_key:iv}, 'user_id');
        if (Number.isInteger(result)) {
            logger.log('Success: Row insertion successful.');
            res.json({ message: 'success', user_id: result, auth_key:iv });
        } else {
            logger.log('Failed to insert row.');
            res.json({ message: result, user_id: null });
        }
    } catch (error) {
        logger.log(`Error in POST /signup: ${error.message}`);
        res.status(500).send('Failed to sign up');
    }
});

module.exports = router;
