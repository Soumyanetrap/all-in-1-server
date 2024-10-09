const assert = require('assert');
const fs = require('fs');
const { LOCALHOST } = require('../config/config');


const url = LOCALHOST;
// const create_payload = JSON.parse(fs.readFileSync('./database/schema/accounts/create.json', 'utf8'));
// const create_payload = JSON.parse(fs.readFileSync('./database/schema/tickets/create.json', 'utf8'));
// const create_payload = JSON.parse(fs.readFileSync('./database/schema/resolved_tickets/create.json', 'utf8'));
// const create_payload = JSON.parse(fs.readFileSync('./database/schema/requested_connections/create.json', 'utf8'));
// const create_payload = JSON.parse(fs.readFileSync('./database/schema/groups/create.json', 'utf8'));
// const create_payload = JSON.parse(fs.readFileSync('./database/schema/user_groups/create.json', 'utf8'));
const create_payload = JSON.parse(fs.readFileSync('./database/schema/vaccations/create.json', 'utf8'));


// const create_payload = JSON.parse(fs.readFileSync('./database/schema/user_accounts/create.json', 'utf8'));
// const alter_payload = JSON.parse(fs.readFileSync('./database/schema/accounts/add_col.json', 'utf8'));
// const alter_payload = JSON.parse(fs.readFileSync('./database/schema/accounts/alter_col.json', 'utf8'));
// const alter_payload = JSON.parse(fs.readFileSync('./database/schema/resolved_tickets/add_col.json', 'utf8'));


// const create_enum_payload = JSON.parse(fs.readFileSync('./database/schema/enums/create_tkt_domain.json', 'utf8'));
// const create_enum_payload_2 = JSON.parse(fs.readFileSync('./database/schema/enums/create_trv_mode.json', 'utf8'));
// const create_enum_payload_3 = JSON.parse(fs.readFileSync('./database/schema/enums/create_trv_with.json', 'utf8'));




// Define test cases for GET and POST requests

const tests = [
    // { method: 'POST', endpoint: '/admin/create_enum', body: create_enum_payload_2, expected_type: 'object', expected: { message: 'success' }},
    // { method: 'POST', endpoint: '/admin/create_enum', body: create_enum_payload_3, expected_type: 'object', expected: { message: 'success' }},
    
    // { method: 'POST', endpoint: '/admin/altertable', body: alter_payload, expected_type: 'object', expected: { message: 'success' }},
    // { method: 'POST', endpoint: '/admin/deletetable', body: delete_paylaod, expected_type: 'object', expected: { message: 'success' }},
    { method: 'POST', endpoint: '/admin/createtable', body: create_payload, expected_type: 'object', expected: { message: 'success' }}
];

let counter = 0;

const testPromises = tests.map((test, index) => {
    const options = {
        method: test.method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (test.method === 'POST' && test.body) {
        options.body = JSON.stringify(test.body);
    }

    return fetch(url + test.endpoint, options)
        .then(response => {
            // Check if the response is ok (status code 200-299)
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Parse the JSON data from the response
            return response.json();
        })
        .then(data => {
            // Handle the data received from the request
            console.log(`Test ${index + 1}: ${test.endpoint}`);
            console.log(data);
            assert.strictEqual(typeof data, test.expected_type);
            assert.strictEqual(typeof data.message, 'string');

            // console.log(`Success`);
            counter += 1;
        })
        .catch(error => {
            // Handle any errors that occurred during the fetch
            console.log(`Test ${index + 1} Failed: ${test.endpoint}`);
            console.error('Error:', error);
        });
});

// Wait for all test promises to complete
Promise.all(testPromises)
    .then(() => {
        console.log(`${counter} Passed out of ${tests.length}`);
    })
    .catch(err => {
        console.error('Error in running tests:', err);
    });