const express = require('express');
const logger = require('../utils/logger');
const { AUTH_MASTER_KEY } = require('../config/config');
const { encrypt } = require('../utils/enc_dec');
const { client } = require('../database/db');
const AWS = require('../database/db_utils');
const router = express.Router();
const { DateTime } = require('luxon');
const { fetchRequestsWithUserID } = require('./utils');

// Initialize AWS object
const aws = new AWS(client);

//Get your Connections
router.post('/get_con', async (req, res) => {
    logger.log("Connections called")
    const {user_id} = req.body;
    try {
        const requests = await aws.getRow('user_connections', { 'user_id': user_id, 'friend_id': user_id }, condition_type = 1)

        // Determine the friend_ids based on the logic
        const friendIds = requests.map(req => req.user_id === user_id ? req.friend_id : req.user_id);

        // Fetch usernames for the extracted friend_ids
        const userPromises = friendIds.map(friend_id => 
            aws.getRow('users', { 'user_id': friend_id }) // Assuming getRow can fetch user details by user_id
        );

        let users = await Promise.all(userPromises);
        users = users.flat(); // Flatten array if necessary, depends on aws.getRow implementation

        // Map usernames to the original requests
        const result = requests.map(req =>  {
            const relevantFriendId = req.user_id === user_id ? req.friend_id : req.user_id;
            const user = users.find(user => user.user_id === relevantFriendId);

            return {
                connection_id: req.connection_id,
                friend_id: relevantFriendId,
                username: user ? user.username : 'Unknown', // Fallback if username is not found
                request_date: req.connection_date
            };
        });
        return res.json(result)
    }catch (error) {
        logger.log('Error fetching connections: ', error);
        return res.json([])
    }
});

router.post('/get_groups', async (req, res) => {
    logger.log("Fetch Groups called")
    
    const { user_id } = req.body;

    // Updated join condition to match your table structure
    const joinCondition = `groups.group_id = user_groups.group_id`;

    // Adjust the filter condition to include the user_id
    const filterCondition = { 'user_id': user_id }; 

    try {
        // Call the getRowsWithJoin method with updated parameters
        const result = await aws.getRowsWithJoin('groups', 'user_groups', joinCondition, filterCondition);
        
        return res.json(result)
    }catch (error) {
        logger.log('Error fetching connections: ', error);
        return res.json([])
    }
});

router.post('/members', async (req, res) => {
    logger.log("Fetch Group Members called");

    const { group_id } = req.body;

    // Updated join condition to match your table structure
    const joinCondition = `user_groups.user_id = users.user_id`;

    // Adjust the filter condition to filter by group_id in the user_groups table
    const filterCondition = { 'group_id': group_id };

    const columns = ['users.user_id', 'users.username']

    try {
        // Call the getRowsWithJoin method with updated parameters
        const result = await aws.getRowsWithJoin('users', 'user_groups', joinCondition, filterCondition, columns);
        
        return res.json(result);
    } catch (error) {
        // Log the error and return an empty array
        logger.log('Error fetching members:', error);
        return res.status(500).json([]);
    }
});

router.post('/ch_grp_admin', async (req, res) => {
    logger.log("Change Group Admin called");
    const { group_id, admin_id } = req.body;
    try {
        const result = await aws.updateTable('groups', { 'created_by': admin_id }, { group_id: group_id })
        
        return res.json(result);
    } catch (e) {
        logger.log('Error changing group admin:', e);
        return res.status(500).json([]);
    }
})

router.post('/set_group', async (req, res) => {
    logger.log("Create Group called")
    
    const { user_id, group_name, members } = req.body;
    try {
        const date_time = DateTime.now().setZone('Asia/Kolkata').toISO(); // Convert to IST and format as ISO 8601

        const result = await aws.insertRow('groups', { 
            group_name: group_name, 
            created_on: date_time,
            created_by: user_id
        }, 'group_id');
        
        if (Number.isInteger(result)) {
            const group_id = result;

            const user_ids = [user_id, ...members];
        
            // Prepare the data for insertion
            const insertPromises = user_ids.map(memberId => {
                return aws.insertRow('user_groups', {
                    user_id: memberId,
                    group_id: group_id
                }, 'user_id');
            });

            // Wait for all insertions to complete
            await Promise.all(insertPromises);

            logger.log('Successfully created group');
        } else {
            logger.log('Error creating group');
        }

        
        return res.json(result)
    }catch (error) {
        logger.log('Error fetching connections: ', error);
        return res.json([])
    }
});

router.post('/dlt_group', async (req, res) => {
    logger.log("Delete Group called")
    const { group_id } = req.body;
    try {

        const result = await aws.deleteRow('groups', { 
            group_id: group_id
        });
        if (result) {
            logger.log('Successfully Deleted group');
        } else {
            logger.log('Error Deleting group');
        }
        return res.json(result)
    }catch (error) {
        logger.log('Error fetching connections: ', error);
        return res.json([])
    }
});

router.post('/ext_group', async (req, res) => {
    logger.log("Exit Group called")
    const { user_id, group_id } = req.body;
    try {

        const result = await aws.deleteRow('user_groups', { 
            user_id: user_id,
            group_id: group_id
        });
        if (result) {
            logger.log('Successfully Left group');
        } else {
            logger.log('Error Leaving group');
        }
        return res.json(result)
    }catch (error) {
        logger.log('Error fetching connections: ', error);
        return res.json([])
    }
});

//List of requests for you
router.post('/make_con', async (req, res) => {
    logger.log("Make Connections called");
    const { user_id } = req.body;

    try { 
        // Fetch connection requests from 'requested_connections' table
        const requests = await aws.getRow('requested_connections', { 'friend_id': user_id });

        // Extract friend_ids from the requests
        const userIds = requests.map(req => req.user_id);

        // Fetch usernames for the extracted friend_ids
        const userPromises = userIds.map(user_id => 
            aws.getRow('users', { 'user_id': user_id }) // Assuming getRow can fetch user details by user_id
        );

        let users = await Promise.all(userPromises);
        users = users.flat(); // Flatten in case of nested arrays

        // Map usernames to the original requests
        const result = requests.map(req =>  {
            const user = users.find(user => user.user_id === req.user_id);

            return {
                friend_id: user.user_id,
                friend_name: user ? user.username : 'Unknown', // Fallback if username is not found
                request_date: req.request_date
            };
        });

        return res.json(result);
    } catch (error) {
        logger.log('Error fetching connections: ', error);
        return res.json({ "message": "failed" });
    }
});

//Looks of People as you type
router.post('/src_people', async (req, res) => {
    logger.log("Search People called")
    const { search_key } = req.body;
    try {
        let result
        if (search_key.length <= 3)
            result = await aws.getRowPatternMatch('users', { 'username': search_key }, matchFromBeginning=true)
        else
            result = await aws.getRowPatternMatch('users', { 'name': search_key })

        const filterResult = (result) => {
            return result.map(({ user_id, username }) => ({ user_id, username }));
        };
        // Apply the filter
        const response = filterResult(result);
        // console.log(response);
        return res.json(response)
    } catch (error) {
        logger.log('Error fetching users: ', error);
        return res.json({"message":"failed"})
    }
})

//Requests a person on behalf of you
router.post('/add_request', async (req, res) => {
    logger.log("Add Connection Request called");
    const { user_id, requested_user_id } = req.body;

    // Get the current date and time in IST (Indian Standard Time)
    const date_time = DateTime.now().setZone('Asia/Kolkata').toISO(); // Convert to IST and format as ISO 8601

    try {
        // Insert the request into the 'connection_requests' table
        const result = await aws.insertRow('requested_connections', { 
            user_id: user_id, 
            friend_id: requested_user_id, 
            request_date: date_time
        },'user_id');

        res.json(result);
    } catch (error) {
        logger.log('Error adding connection request: ', error);
        res.json({ message: "failed" });
    }
});

//Accepts a request sent to you
router.post('/accept_request', async (req, res) => {
    logger.log("Accept Connection Request called");
    const { user_id, friend_id } = req.body;
    try {
        //write the logic
        await aws.deleteRow('requested_connections', { user_id: user_id, friend_id: friend_id })
        // Get the current date and time in IST (Indian Standard Time)
        const date_time = DateTime.now().setZone('Asia/Kolkata').toISO(); // Convert to IST and format as ISO 8601

        try {
            // Insert the request into the 'connection_requests' table
            const result = await aws.insertRow('user_connections', { 
                user_id: user_id, 
                friend_id: friend_id, 
                connection_date: date_time
            },'user_id');

            res.json(result);
        } catch (error) {
            logger.log('Error adding connection request: ', error);
            res.json({ message: "failed" });
        }
        
    } catch (error) {
        logger.log('Error accepting connection request: ', error);
        res.json({ message: "failed" });
    }
})

router.post('/reject_request', async (req, res) => {
    logger.log("Reject Connection Request called");
    const { user_id, friend_id } = req.body;
    // console.log(user_id, friend_id);
    try {
        await aws.deleteRow('requested_connections', { user_id: user_id, friend_id: friend_id })
        res.json({ message: "Success" });
    } catch (error) {
        logger.log('Error rejecting connection request: ', error);
        res.json({ message: "failed" });
    }
}) 


router.post('/close_request', async (req, res) => {
    logger.log("Close Connection Request called");
    const { connection_id } = req.body;
    try {
        await aws.deleteRow('user_connections', { connection_id: connection_id })
        res.json({ message: "Success" }); 
    } catch (error) {
        logger.log('Error closing connection request: ', error);
        res.json({ message: "failed" });
    }
}) 

//Gets the list of those people you have requested to
router.post('/get_requests', async (req, res) => {
    logger.log("Get Requests called"); 
    const { user_id } = req.body;
    try {
        // Fetch connection requests with usernames
        const result = await fetchRequestsWithUserID('requested_connections', user_id);
        
        return res.json(result);
    } catch (error) {
        logger.log('Error fetching requests: ', error);
        return res.json({ "message": "failed" });
    }
});

module.exports = router;