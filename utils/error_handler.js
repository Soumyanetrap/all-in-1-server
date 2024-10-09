const killPortProcess = require('./kill_process');
const logger = require('./logger');
async function errorHandler(err, port, server, app) {
    if (err.code === 'EADDRINUSE') {
        logger.log(`Error: Port ${port} is already in use. Attempting to free up the port...`);

        try {
            // Attempt to kill the process using the port
            await killPortProcess(port);
            logger.log(`Port ${port} is now free. Restarting server...`);

            // Retry starting the server
            server.close(() => {
                app.listen(port, () => {
                    logger.log(`Server successfully restarted on port ${port}`);
                });
            });
        } catch (killErr) {
            logger.log(`Error: Failed to free up port ${port}:`, killErr);
        }
    } else {
        logger.log('Server Error:', err);
    }
}

module.exports = errorHandler;
