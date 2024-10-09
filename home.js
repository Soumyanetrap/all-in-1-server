const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const { client, connect } = require('./database/db');
const sendOTP = require('./utils/send_mail');
const logger = require('./utils/logger'); // Import the logger
const authRoutes = require('./auth/authentication'); // Import the authentication routes
const adminRoutes = require('./admin/db_operations'); // Import the admin routes
const bankRoutes = require('./banks/bank_operations'); // Import the bank routes
const ticketRoutes = require('./tickets/ticket_operations'); // Import the ticket routes
const connRoutes = require('./connections/connections'); // Import the the connection routes
const storageRoutes = require('./storage/storage'); // Import the storage routes
const tripRoutes = require('./trip/trip_operations')
const chatRoutes = require('./chat/chat_operations'); // Import the chat routes

const { authenticate, uploadFile, readFile } = require('./storage/storage_utils')

const fileId = '1qXfVuz0UOVqYXf4kujDis3XgfBFxrgSr';

// Function to authenticate and then read the file
async function processFile() {
    try {
        // Authenticate and get the auth client
        const authClient = await authenticate();
        
        // Read the file with the given file ID
        const fileContent = await readFile(authClient, fileId);
        console.log('File Content:', fileContent);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// authenticate().then(uploadFile).catch("error", console.error());

const app = express();

// app.use(cors());
// CORS Configuration
const allowedOrigins = [
    'http://localhost:3000',  // Your React app URL
    'https://your-production-url.com' // Add your production URL here
];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'], // Include OPTIONS for preflight requests
    credentials: true,
}));

const port = process.env.PORT || 4000;

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

const server = app.listen(port, () => {
    logger.log(`Server is running on port ${port}`);
});

// const wss = new WebSocket.Server({ port: 8080 });
const wss = new WebSocket.Server({server})

const client_trips = new Map();

wss.on('connection', (ws, req) => {
    logger.log('Client connected');
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const tripId = urlParams.get('trip_id');

    if (tripId) {
        // Store the WebSocket connection with the user ID
        client_trips.set(ws,tripId);
    }

    ws.on('message', (message) => {
        console.log('Received message:', message);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
        logger.log('WebSocket connection closed');
        if (tripId)
            client_trips.delete(tripId);
    });
});

async function connectToDatabase() {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            const connected = await connect();
            if (connected) {
                logger.log('Database connected successfully.');
                try {
                    // Listen to both channels
                    await client.query('LISTEN req_con_changes');
                    await client.query('LISTEN new_chat');

                    client.on('notification', (msg) => {
                        // Handle notifications based on the channel
                        if (msg.channel === 'req_con_changes') {
                            logger.log(`Change detected on req_con_changes: ${msg.payload}`);
                            // Broadcast to WebSocket clients
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ type: 'req_con_update', message: msg.payload }));
                                }
                            });
                        } else if (msg.channel === 'new_chat') {
                            // console.log(`New chat message detected: ${msg.payload}`);
                            // Handle new chat message notifications
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    const trip_id = client_trips[client]
                                    if (msg.payload.trip_id === trip_id)
                                        client.send(JSON.stringify({ type: 'new_chat', message: msg.payload }));
                                }
                            });
                        }
                    });
                    
                    logger.log("Listening for notifications...");
                } catch (error) {
                    logger.log('Error setting up notification listener:', error);
                }
                return;
            }
        } catch (err) {
            logger.log(`Database connection failed: ${err.message}`);
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
    logger.log('Max retries reached. Could not connect to the database.');
    process.exit(1); // Exit with failure
}

(async () => {
    await connectToDatabase();
})();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use authentication routes
try {
    app.use('/auth', authRoutes);
    app.use('/admin', adminRoutes);
    app.use('/bank', bankRoutes);
    app.use('/ticket', ticketRoutes);
    app.use('/connections', connRoutes);
    app.use('/storage', storageRoutes);
    app.use('/trip', tripRoutes);
    app.use('/chat', chatRoutes);
    app.use(fileUpload({ 
        limits: { fileSize: 10 * 1024 * 1024 } // Adjust the limit as needed (10 MB here)
    }));
} catch (e) {
    logger.log('Error: Failed to load routes', e);
}

// Define routes
app.get('/', async (req, res) => {
    try {
        const responseData = { message: 'home' };
        res.json(responseData);
    } catch (error) {
        logger.log(`Error in GET /: ${error.message}`);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/helloworld', (req, res) => {
    const responseData = { message: 'Hello, World!' };
    res.json(responseData);
});

app.post('/sendOTP', async (req, res) => {
    const { toID } = req.body;
    try {
        const otp = await sendOTP(toID);
        res.json({ 'OTP': otp });
    } catch (error) {
        logger.log(`Error in POST /sendOTP: ${error.message}`);
        res.status(500).send('Failed to send OTP');
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.log(`Uncaught Exception: ${err.message}`);
    process.exit(1); // Exit with failure
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    process.exit(1); // Exit with failure
});

// Global error handling middleware
app.use((err, req, res, next) => {
    logger.log(`Unhandled Error: ${err.message}`);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

server.on('error', (err) => {
    logger.log(`Server error: ${err.message}`);
    process.exit(1); // Exit with failure
});
