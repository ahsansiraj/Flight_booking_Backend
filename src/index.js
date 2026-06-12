/*******************************************************************************
 * Application Entry Point
 ******************************************************************************/

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

// Import configurations
const setupSecurity = require('./src/config/security');
const setupApp = require('./src/config/app');
const database = require('./src/database/connection');
const logger = require('./src/utils/logger');
const { globalErrorHandler, notFound } = require('./src/middlewares/errorHandler');

// Create Express app
const app = express();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Security Middleware
const { loginLimiter, passwordResetLimiter } = setupSecurity(app);

// Cookie Parser
app.use(cookieParser());

// App Configuration
setupApp(app);

// ============================================================================
// ROUTES
// ============================================================================

app.use('/api/v1', require('./src/routes'));

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 Handler
app.use(notFound);

// Global Error Handler (must be last)
app.use(globalErrorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to database
    await database.connect();
    logger.info('✓ Database connection successful');

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Flight Booking Backend Server Started                  ║
║  PORT: ${PORT}                                                    ║
║  ENV: ${process.env.NODE_ENV || 'development'}                               ║
║  API Version: ${process.env.API_VERSION || 'v1'}                             ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful Shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await database.disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(async () => {
        await database.disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;