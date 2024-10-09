// const assert = require('assert');
// const { SENDGRID_API_KEY, MAIL_SENDER_ID, LOCALHOST } = require('../config/config');


// const url = LOCALHOST;

// // Define test cases for GET and POST requests
// const tests = [
//     { method: 'POST', endpoint: '/sendOTP', body: { toID: 'soumyanetrap.stcet@gmail.com' }, expected_type: 'object', expected: { "OTP": "*" } }
// ];

// let counter = 0;

// const testPromises = tests.map((test, index) => {
//     const options = {
//         method: test.method,
//         headers: {
//             'Content-Type': 'application/json'
//         }
//     };

//     if (test.method === 'POST' && test.body) {
//         options.body = JSON.stringify(test.body);
//     }

//     return fetch(url + test.endpoint, options)
//         .then(response => {
//             // Check if the response is ok (status code 200-299)
//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }
//             // Parse the JSON data from the response
//             return response.json();
//         })
//         .then(data => {
//             // Handle the data received from the request
//             console.log(`Test ${index + 1}: ${test.endpoint}`);
//             assert.strictEqual(typeof data, test.expected_type);
//             assert.strictEqual(typeof data.OTP, 'string');

//             console.log(`Success`);
//             counter += 1;
//         })
//         .catch(error => {
//             // Handle any errors that occurred during the fetch
//             console.log(`Test ${index + 1} Failed: ${test.endpoint}`);
//             console.error('Error:', error);
//         });
// });

// // Wait for all test promises to complete
// Promise.all(testPromises)
//     .then(() => {
//         console.log(`${counter} Passed out of ${tests.length}`);
//     })
//     .catch(err => {
//         console.error('Error in running tests:', err);
//     });