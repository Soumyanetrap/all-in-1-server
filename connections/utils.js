// dbUtils.js
const { client } = require('../database/db');
const AWS = require('../database/db_utils');

// Initialize AWS object
const aws = new AWS(client);

/**
 * Fetches connection requests and user details.
 * 
 * @param {string} tableName - The table name to fetch requests from.
 * @param {string} userId - The user ID to fetch requests for.
 * @returns {Promise<Object[]>} - A promise that resolves to the list of connection requests with usernames.
 */
const fetchRequestsWithUserID = async (tableName, userId) => {
    // Fetch connection requests from the specified table
    const requests = await aws.getRow(tableName, { 'user_id': userId });

    // Extract friend_ids from the requests
    const friendIds = requests.map(req => req.friend_id);

    // Fetch usernames for the extracted friend_ids
    const userPromises = friendIds.map(friend_id => 
        aws.getRow('users', { 'user_id': friend_id }) // Assuming getRow can fetch user details by user_id
    );

    let users = await Promise.all(userPromises);
    users = users.flat(); // Flatten array if necessary, depends on aws.getRow implementation

    // Map usernames to the original requests
    const result = requests.map(req =>  {
        const user = users.find(user => user.user_id === req.friend_id);

        return {
            friend_id: req.friend_id,
            username: user ? user.username : 'Unknown', // Fallback if username is not found
            request_date: req.request_date
        };
    });

    return result;
};

module.exports = { fetchRequestsWithUserID };
