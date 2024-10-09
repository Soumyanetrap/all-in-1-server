const assert = require('assert');
const { LOCALHOST } = require('../config/config');

// Define the URL you want to send the GET request to
const url = LOCALHOST;

const tests = ['/helloworld', '/'];
const expected_type = ['string', 'string'];
const expected = ['Hello, World!', 'home'];

let counter = 0;

const testPromises = tests.map((item, index) => {
    return fetch(url + item)
        .then(response => {
            // Check if the response is ok (status code 200-299)
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Parse the JSON data from the response
            return response.json();
        })
        .then(data => {
            // Handle the data received from the GET request
            console.log(`Test ${index + 1}: ${item}`);
            assert.strictEqual(typeof data, 'object');
            assert.strictEqual(typeof data.message, expected_type[index]);
            assert.strictEqual(data.message, expected[index]);

            console.log(`Success`);
            counter += 1;
        })
        .catch(error => {
            // Handle any errors that occurred during the fetch
            console.log(`Test ${index + 1} Failed: ${item}`);
            console.error('Error:', error);
        });
});

// Wait for all test promises to complete
Promise.all(testPromises)
    .then(() => {
        console.log(`${counter} Passed out of ${tests.length}`);
    })


