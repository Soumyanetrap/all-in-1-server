const express = require('express');
const router = express.Router();
const AWS = require('../database/db_utils');
const logger = require('../utils/logger'); // Adjust the path if necessary
const { client } = require('../database/db');
const { ADMIN_PASSWORD } = require('../config/config');

// Initialize AWS object
const aws = new AWS(client);

router.post('/createtable', async (req, res) => {
    const { password, table, columns } = req.body;
    let responseData;
    if (password === ADMIN_PASSWORD) {
        logger.log(`Table Creation Request: ${table}`);
        const tableCreated = await aws.createTable(table, columns);
        if (tableCreated) {
            logger.log('Table creation or existence check successful.');
            responseData = { message: 'success' };
        } else {
            logger.log('Failed to check or create table.');
            responseData = { message: 'failed' };
        }
    }
    else {
        logger.log('Admin Permission Denied: Password Mismatch');
        responseData = { message: 'failed: Password Mismatch' };
    }
    res.json(responseData);
});

router.post('/create_enum', async (req, res) => {
    const { password, name, values} = req.body;
    let responseData;
    if (password === ADMIN_PASSWORD) {
        logger.log(`ENUM Creation Request: ${name}`);
        let result = await aws.createENUM(name, values);
        if (result) {
            logger.log('ENUM creation successful.');
            responseData = { message: 'success' };
        } else {
            logger.log('Failed to create ENUM.');
            responseData = { message: 'failed' };
        }
    }
    return res.json(responseData)
})

router.post('/altertable', async (req, res) => {
    const { password, table, action, columns } = req.body;
    let responseData;
    if (password === ADMIN_PASSWORD) {
        logger.log(`Table Alteration Request: ${table}`);
        let res
        if (action === 'add') {
            res = await aws.addColumn(table, columns);
        }
        else {
            res = await aws.alterColumn(table, columns);
        }
            
        if (res) {
            logger.log('Table Alteration successful.');
            responseData = { message: 'success' };
            
        } else {
            logger.log('Failed to Alter table.');
            responseData = { message: 'failed' };
        }
    }else {
        logger.log('Admin Permission Denied: Password Mismatch');
        responseData = { message: 'failed: Password Mismatch' };
    }
    res.json(responseData);
});

router.post('/deletetable', async (req, res) => {
    let responseData;
    const { password, table } = req.body;
    if (password === ADMIN_PASSWORD) {
        const tableDeleted = await aws.deleteTable(table);
        if (tableDeleted) {
            logger.log('Table deletion successful.');
            responseData = { message: 'success' };
        } else {
            logger.log('Failed to delete table.');
            responseData = { message: 'failed' };
        }
    }
    else {
        logger.log('Admin Permission Denied: Password Mismatch')
        responseData = { message: 'failed: Password Mismatch' };
    }
    res.json(responseData);
});

module.exports = router;