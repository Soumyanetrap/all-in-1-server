const assert = require('assert');
const { SENDGRID_API_KEY, MAIL_SENDER_ID, LOCALHOST } = require('../config/config');


const url = LOCALHOST;

const paylaod = {
    account: {
    "account_id": "1234567890",
    "ifsc": "ICIC7876902",
    "bank_name": "HDFC",
        "balance": "12345.00"
    },
    user_id: 1,
    auth_key: 'e2fa3a3831f31cbdfc2914d7581df1c6'
}



// Define test cases for GET and POST requests
const tests = [
    // { method: 'POST', endpoint: '/bank/add_ac', body: paylaod, expected_type: 'object', expected: { message: 'success' }}
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
            console.log(`\nTest ${index + 1}: ${test.endpoint}`);
            console.log(data);
            assert.strictEqual(typeof data, test.expected_type);
            assert.strictEqual(typeof data.message, 'string');
            assert.strictEqual(data.message, 'success');

            console.log(`Success`);
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