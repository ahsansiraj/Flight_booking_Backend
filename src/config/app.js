/*******************************************************************************
 * Express App Configuration
 ******************************************************************************/

const express = require('express');
const morgan = require('morgan');
const logger = require('../utils/logger');

module.exports = () => {
  const app = express();

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  // API version endpoint
  app.get('/api/version', (req, res) => {
    res.json({
      success: true,
      version: process.env.API_VERSION || 'v1',
      environment: process.env.NODE_ENV,
    });
  });

  logger.info('✓ Express app configured');
  return app;
};