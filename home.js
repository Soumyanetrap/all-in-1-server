const express = require('express');
const cors = require('cors');
const { client, connect } = require('./database/db');
const sendOTP = require('./utils/send_mail');
const logger = require('./utils/logger');
const path = require('path');
const authRoutes = require('./auth/authentication');
const adminRoutes = require('./admin/db_operations');
const bankRoutes = require('./banks/bank_operations');
const ticketRoutes = require('./tickets/ticket_operations');
const connRoutes = require('./connections/connections');
const storageRoutes = require('./storage/storage');
const tripRoutes = require('./trip/trip_operations');
const chatRoutes = require('./chat/chat_operations');

const WebSocket = require('ws'); // Import WebSocket

const app = express();
const port = process.env.PORT || 4000;

// CORS Configuration
app.use(cors());

// Serve static files from the React app's build directory
app.use(express.static(path.join(__dirname, './build')));

// Handle GET requests to the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './build', 'index.html'));
});

const server = app.listen(port, () => {
    logger.log(`Server is running on port ${port}`);
    console.log(`WebSocket server URL: ws://localhost:${port}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({server}); // Use a different port for WebSocket

// Store connections and associated trip IDs
const client_trips = new Map();

wss.on('connection', (ws, req) => {
    logger.log('Client connected');
    // console.log(req.url)
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const tripId = urlParams.get('trip_id');
    // console.log(tripId)
    // console.log(ws)
    if (tripId) {
        // Store the WebSocket connection with the user ID
        client_trips.set(ws, parseInt(tripId, 10)); 
    }
    // console.log(client_trips.keys())

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
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 5000; // 5 seconds
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const connected = await connect();
            if (connected) {
                logger.log('Database connected successfully.');
                console.log('Database connected successfully.');
                try {
                    // Listen to both channels
                    await client.query('LISTEN req_con_changes');
                    await client.query('LISTEN new_chat');

                    client.on('notification', (msg) => {
                        if (msg.channel === 'req_con_changes') {
                            logger.log(`Change detected on req_con_changes: ${msg.payload}`);
                            // Broadcast to all connected clients
                            wss.clients.forEach((client) => {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ action: 'req_con_update', payload: msg.payload }));
                                }
                            });
                        } else if (msg.channel === 'new_chat') {
                            const payload = JSON.parse(msg.payload)
                            const tripId = payload.trip_id;
                            // console.log(tripId) 
                            // Send message to specific trip ID clients
                            client_trips.forEach((id, client) => {
                                // console.log(id === tripId)
                                // console.log(client.readyState === WebSocket.OPEN)
                                if (id === tripId && client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({ action: 'new_chat', payload: payload }));
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
    process.exit(1);
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
} catch (e) {
    logger.log('Error: Failed to load routes', e);
}

// Define routes
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

// Global error handling middleware
app.use((err, req, res, next) => {
    logger.log(`Unhandled Error: ${err.message}`);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
});

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
    logger.log(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});

// Handle server errors
server.on('error', (err) => {
    logger.log(`Server error: ${err.message}`);
    process.exit(1);
});
