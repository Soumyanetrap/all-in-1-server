const express = require('express');
const logger = require('../utils/logger');
const { AUTH_MASTER_KEY } = require('../config/config');
const { encrypt } = require('../utils/enc_dec');
const { client } = require('../database/db');
const AWS = require('../database/db_utils');
const router = express.Router();

// Initialize AWS object
const aws = new AWS(client);


router.post('/add_ac', async (req, res) => {
    const { account, user_id, auth_key } = req.body;
    const { bank_name, account_id, ifsc, balance } = account;
    logger.log(`Add Bank Account request: ${user_id}`);
    try {
        const masterKey = Buffer.from(AUTH_MASTER_KEY, 'hex');
        // console.log("0")
        const { iv, encryptedData } = encrypt(balance, masterKey, auth_key);
        // console.log("1")
        const result = await aws.insertRow('accounts', { account_id, ifsc, bank_name, balance:encryptedData }, 'account_id');
        
        if (result) {
            const res_2 = await aws.insertRow('user_accounts', { user_id: user_id, account_id: account_id }, 'uac_id')
            if (res_2) {
                logger.log('Success: Row insertion successful.');
                return res.json({ message: 'success' }); // Use return to stop further execution
            }
            else {
                logger.log('Error: Row insertion failed.');
                return res.json({ message: 'failed' });
            }
            
        } else {
            logger.log('Failed to insert row.');
            return res.json({ message: result }); // Use return to stop further execution
        }
    } catch (error) {
        logger.log(`Error in POST /add_ac: ${error.message}`);
        return res.status(500).send('Failed to add account'); // Use return to stop further execution
    }
});


router.post('/get_ac', async (req, res) => {
    const { user_id } = req.body;
    const joinCondition = `user_accounts.account_id = accounts.account_id AND user_accounts.user_id = $1`;
    const filterCondition = { 'user_id': user_id }; // No additional filter conditions

    try {
        const result = await aws.getRowsWithJoin('accounts', 'user_accounts', joinCondition, filterCondition);
        // console.log('User bank accounts:', result);
        return res.json(result);
    } catch (error) {
        logger.log('Error fetching user bank accounts:', error);
    }
    let responseData = {message: 'failed'};
    
    return res.json(responseData);
});

module.exports = router;