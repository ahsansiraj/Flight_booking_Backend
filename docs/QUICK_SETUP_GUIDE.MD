# 🚀 **COMPLETE BACKEND IMPLEMENTATION**

This will be a production-ready Node.js backend.


# **📁 Folder Structure (MVC + Repository Pattern)**

```bash
flight-booking-backend/

├── src/

│   ├── config/

│   │   ├── database.js          # DB connection config

│   │   ├── app.js               # Express app configuration

│   │   ├── security.js          # Security middleware setup

│   │   └── constants.js         # App constants

│   │

│   ├── database/

│   │   ├── connection.js        # SQL Server connection pool

│   │   └── transaction.js       # Transaction wrapper

│   │

│   ├── models/                  # Not ORM models, just TypeScript interfaces/types

│   │   ├── User.js

│   │   ├── Wallet.js

│   │   └── Booking.js

│   │

│   ├── repositories/            # Data Access Layer (DAL)

│   │   ├── userRepository.js

│   │   ├── walletRepository.js

│   │   ├── bookingRepository.js

│   │   ├── commissionRepository.js

│   │   └── payoutRepository.js

│   │

│   ├── services/                # Business Logic Layer (BLL)

│   │   ├── authService.js

│   │   ├── walletService.js

│   │   ├── bookingService.js

│   │   ├── commissionService.js

│   │   └── payoutService.js

│   │

│   ├── controllers/             # HTTP Controllers

│   │   ├── authController.js

│   │   ├── walletController.js

│   │   ├── bookingController.js

│   │   ├── commissionController.js

│   │   └── adminController.js

│   │

│   ├── routes/                  # Express Routes

│   │   ├── index.js             # Main router

│   │   ├── authRoutes.js

│   │   ├── walletRoutes.js

│   │   ├── bookingRoutes.js

│   │   ├── commissionRoutes.js

│   │   └── adminRoutes.js

│   │

│   ├── middlewares/

│   │   ├── auth.js              # JWT authentication

│   │   ├── rbac.js              # Role-based access control

│   │   ├── validator.js         # Request validation

│   │   ├── errorHandler.js      # Global error handler

│   │   ├── rateLimiter.js       # Rate limiting

│   │   ├── sanitizer.js         # Input sanitization

│   │   └── logger.js            # Request logging

│   │

│   ├── utils/

│   │   ├── responseHandler.js   # Standard API responses

│   │   ├── encryption.js        # Bcrypt, JWT helpers

│   │   ├── emailService.js      # Email sender

│   │   ├── smsService.js        # SMS sender

│   │   └── validator.js         # Custom validators

│   │

│   ├── validators/              # Request validation schemas

│   │   ├── authValidator.js

│   │   ├── walletValidator.js

│   │   └── bookingValidator.js

│   │

│   └── app.js                   # Express app entry point

│

├── tests/

│   ├── unit/

│   ├── integration/

│   └── e2e/

│

├── logs/                        # Application logs

│   ├── error.log

│   ├── combined.log

│   └── access.log

│

├── .env                         # Environment variables (gitignored)

├── .env.example                 # Template

├── .gitignore

├── package.json

├── Dockerfile

├── docker-compose.yml

└── server.js                    # Server entry point

```

# **FOLDER STRUCTURE SETUP**

```bash
# Create folder structure
mkdir -p flight-booking-backend/src/{config,database,models,repositories,services,controllers,routes,middlewares,utils,validators}
mkdir -p flight-booking-backend/{tests,logs}
cd flight-booking-backend
npm init -y
```

# **Security Packages**

```bash

npm install express helmet cors dotenv
npm install bcrypt jsonwebtoken express-validator
npm install express-rate-limit express-mongo-sanitize xss-clean
npm install hpp cookie-parser csurf
npm install mssql
npm install winston morgan
```

---

# **FILE 1: package.json**

```json
{
  "name": "flight-booking-backend",
  "version": "1.0.0",
  "description": "B2B Flight Booking Platform Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --detectOpenHandles",
    "lint": "eslint src/"
  },
  "keywords": ["flight", "booking", "b2b"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "csurf": "^1.11.0",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-mongo-sanitize": "^2.2.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.0",
    "helmet": "^7.1.0",
    "hpp": "^0.2.3",
    "jsonwebtoken": "^9.1.2",
    "morgan": "^1.10.0",
    "mssql": "^9.1.1",
    "winston": "^3.11.0",
    "xss-clean": "^0.1.1"
  },
  "devDependencies": {
    "eslint": "^8.54.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.2"
  }
}
```

---

# **FILE 2: .env.example**

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=1433
DB_NAME=FlightBookingB2B
DB_USER=flight_app_user
DB_PASSWORD=AppUser@SecureP@ssw0rd2025!
DB_ENCRYPT=true
DB_TRUST_SERVER_CERT=true

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-at-least-32-characters
JWT_EXPIRY=15m
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this-in-production-at-least-32-characters
REFRESH_TOKEN_EXPIRY=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-change-this-12345678901234

# Logging
LOG_LEVEL=info

# Email (SendGrid)
SENDGRID_API_KEY=sg_test_xxxxx
FROM_EMAIL=noreply@flightbooking.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=AC_test_xxxxx
TWILIO_AUTH_TOKEN=test_xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin
ADMIN_EMAIL=admin@flightbooking.com
```

---

# **FILE 3: .gitignore**

```
node_modules/
.env
.env.local
logs/
*.log
.DS_Store
dist/
.idea/
.vscode/
coverage/
```

---

# **FILE 4: src/config/database.js**

```javascript
/*******************************************************************************
 * Database Configuration
 * SQL Server connection with connection pooling
 ******************************************************************************/

require('dotenv').config();
const sql = require('mssql');
const logger = require('../utils/logger');

const config = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

class DatabaseConnection {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      if (!this.pool) {
        this.pool = await sql.connect(config);
        logger.info('✓ Database connected successfully');
        
        // Test connection
        const result = await this.pool.request()
          .query('SELECT 1 AS test');
        
        if (result.recordset[0].test === 1) {
          logger.info('✓ Database connection test passed');
        }
      }
      return this.pool;
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        logger.info('✓ Database disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting database:', error);
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async executeQuery(query, parameters = {}) {
    try {
      const pool = this.getPool();
      const request = pool.request();

      // Add input parameters
      Object.keys(parameters).forEach(key => {
        request.input(key, parameters[key]);
      });

      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }

  async executeStoredProcedure(spName, parameters = {}, outputs = {}) {
    try {
      const pool = this.getPool();
      const request = pool.request();

      // Add input parameters
      Object.keys(parameters).forEach(key => {
        request.input(key, parameters[key]);
      });

      // Add output parameters
      Object.keys(outputs).forEach(key => {
        request.output(key, outputs[key]);
      });

      const result = await request.execute(spName);
      return result;
    } catch (error) {
      logger.error(`Stored procedure ${spName} failed:`, error);
      throw error;
    }
  }
}

module.exports = new DatabaseConnection();
```

---

# **FILE 5: src/database/transaction.js**

```javascript
/*******************************************************************************
 * Transaction Management
 * Wrapper for database transactions with rollback on error
 ******************************************************************************/

const sql = require('mssql');
const database = require('./connection');
const logger = require('../utils/logger');

class Transaction {
  async executeTransaction(callback) {
    const pool = await database.connect();
    const transaction = new sql.Transaction(pool);

    try {
      logger.debug('Starting transaction');
      await transaction.begin();

      // Execute callback with transaction
      const result = await callback(transaction);

      await transaction.commit();
      logger.debug('Transaction committed successfully');
      return result;
    } catch (error) {
      logger.error('Transaction error, rolling back:', error);
      try {
        await transaction.rollback();
        logger.debug('Transaction rolled back');
      } catch (rollbackError) {
        logger.error('Rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  async executeRequest(transaction, query, parameters = {}) {
    const request = transaction.request();

    Object.keys(parameters).forEach(key => {
      request.input(key, parameters[key]);
    });

    return await request.query(query);
  }
}

module.exports = new Transaction();
```

---

# **FILE 6: src/config/security.js**

```javascript
/*******************************************************************************
 * Security Middleware Configuration
 * Implements: Helmet, CORS, XSS, Rate Limiting, CSRF, HPP
 ******************************************************************************/

const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Skip health check
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
    });
  },
});

// Stricter rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  skip: (req) => process.env.NODE_ENV === 'test',
});

// Stricter rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later.',
});

module.exports = (app) => {
  // 1. Trust proxy (for nginx, load balancers)
  app.set('trust proxy', 1);

  // 2. Helmet - Set secure HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  }));

  // 3. CORS - Cross-Origin Resource Sharing
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS rejected request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600,
  }));

  // 4. XSS Protection - Sanitize user input
  app.use(xss());

  // 5. Data Sanitization - Remove $ and . from object keys
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn(`Sanitized key: ${key}`);
    },
  }));

  // 6. HPP - Prevent HTTP Parameter Pollution
  app.use(hpp({
    whitelist: ['sort', 'fields', 'page', 'limit'],
  }));

  // 7. Body parser with size limit
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  // 8. Cookie parser
  app.use(require('cookie-parser')());

  // 9. API Rate Limiting - Apply to all API routes
  app.use('/api/', apiLimiter);

  logger.info('✓ Security middleware configured');

  return {
    loginLimiter,
    passwordResetLimiter,
  };
};
```

---

# **FILE 7: src/config/app.js**

```javascript
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
```

---

# **FILE 8: src/utils/logger.js**

```javascript
/*******************************************************************************
 * Logger Configuration (Winston)
 * Logs to console and files
 ******************************************************************************/

const winston = require('winston');
const path = require('path');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

const transports = [
  // Console
  new winston.transports.Console(),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

module.exports = logger;
```

---

# **FILE 9: src/utils/responseHandler.js**

```javascript
/*******************************************************************************
 * Standard API Response Handler
 * Ensures consistent API response format across all endpoints
 ******************************************************************************/

class ResponseHandler {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(res, message = 'Error', statusCode = 400, error = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    // Include error details only in development
    if (process.env.NODE_ENV === 'development' && error) {
      response.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    return res.status(statusCode).json(response);
  }

  static paginated(res, data, pagination, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
      },
      timestamp: new Date().toISOString(),
    });
  }

  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static badRequest(res, message = 'Bad Request') {
    return this.error(res, message, 400);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static notFound(res, message = 'Not Found') {
    return this.error(res, message, 404);
  }

  static conflict(res, message = 'Conflict') {
    return this.error(res, message, 409);
  }

  static internalError(res, message = 'Internal Server Error', error = null) {
    return this.error(res, message, 500, error);
  }
}

module.exports = ResponseHandler;
```

---

# **FILE 10: src/utils/encryption.js**

```javascript
/*******************************************************************************
 * Encryption & Hashing Utilities
 * Password hashing, JWT, data encryption
 ******************************************************************************/

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('./logger');

class EncryptionService {
  // ========== PASSWORD HASHING ==========

  async hashPassword(password) {
    try {
      const saltRounds = 12; // Cost factor (higher = more secure but slower)
      const hash = await bcrypt.hash(password, saltRounds);
      return hash;
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw error;
    }
  }

  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed:', error);
      throw error;
    }
  }

  // ========== JWT TOKENS ==========

  generateAccessToken(payload) {
    try {
      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || '15m',
        algorithm: 'HS256',
      });
    } catch (error) {
      logger.error('Access token generation failed:', error);
      throw error;
    }
  }

  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
        algorithm: 'HS256',
      });
    } catch (error) {
      logger.error('Refresh token generation failed:', error);
      throw error;
    }
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.error('Access token verification failed:', error.message);
      throw new Error('Invalid or expired token');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      logger.error('Refresh token verification failed:', error.message);
      throw new Error('Invalid refresh token');
    }
  }

  // ========== DATA ENCRYPTION (AES-256) ==========

  encryptData(data, key = process.env.ENCRYPTION_KEY) {
    try {
      const algorithm = 'aes-256-cbc';
      const keyBuffer = Buffer.from(key, 'utf8').slice(0, 32); // Ensure 32 bytes
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return IV + encrypted data (IV needed for decryption)
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      logger.error('Data encryption failed:', error);
      throw error;
    }
  }

  decryptData(encryptedData, key = process.env.ENCRYPTION_KEY) {
    try {
      const algorithm = 'aes-256-cbc';
      const keyBuffer = Buffer.from(key, 'utf8').slice(0, 32);
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Data decryption failed:', error);
      throw error;
    }
  }

  // ========== HASH (for API keys, etc) ==========

  hashString(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

module.exports = new EncryptionService();
```

---

# **FILE 11: src/middlewares/auth.js**

```javascript
/*******************************************************************************
 * Authentication Middleware
 * Validates JWT token and extracts user information
 ******************************************************************************/

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const ResponseHandler = require('../utils/responseHandler');
const encryption = require('../utils/encryption');

module.exports = {
  // Verify JWT token
  verifyToken: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return ResponseHandler.unauthorized(res, 'No token provided');
      }

      const decoded = encryption.verifyAccessToken(token);
      req.user = decoded;
      req.userId = decoded.user_id;
      req.tenantId = decoded.tenant_id;

      logger.debug(`User authenticated: ${decoded.email}`);
      next();
    } catch (error) {
      logger.warn(`Authentication failed: ${error.message}`);
      return ResponseHandler.unauthorized(res, 'Invalid or expired token');
    }
  },

  // Verify refresh token
  verifyRefreshToken: (req, res, next) => {
    try {
      const token = req.cookies.refreshToken || req.body.refreshToken;

      if (!token) {
        return ResponseHandler.unauthorized(res, 'No refresh token provided');
      }

      const decoded = encryption.verifyRefreshToken(token);
      req.user = decoded;

      next();
    } catch (error) {
      logger.warn(`Refresh token verification failed: ${error.message}`);
      return ResponseHandler.unauthorized(res, 'Invalid refresh token');
    }
  },

  // Optional authentication (doesn't fail if no token)
  optionalAuth: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (token) {
        const decoded = encryption.verifyAccessToken(token);
        req.user = decoded;
        req.userId = decoded.user_id;
      }

      next();
    } catch (error) {
      logger.debug('Optional auth: No valid token provided');
      next();
    }
  },
};
```

---

# **FILE 12: src/middlewares/rbac.js**

```javascript
/*******************************************************************************
 * Role-Based Access Control (RBAC) Middleware
 ******************************************************************************/

const logger = require('../utils/logger');
const ResponseHandler = require('../utils/responseHandler');

// Check if user has specific role
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      logger.warn(`Authorization failed: ${req.user.email} tried to access ${req.originalUrl}`);
      return ResponseHandler.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

// Check if user has specific permission
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required');
    }

    // Permissions would be fetched from database
    // This is simplified version
    const userPermissions = req.user.permissions || [];

    if (!userPermissions.includes(requiredPermission)) {
      logger.warn(`Permission denied: ${req.user.email} - ${requiredPermission}`);
      return ResponseHandler.forbidden(res, 'Permission denied');
    }

    next();
  };
};

module.exports = {
  checkRole,
  checkPermission,
  isAdmin: checkRole(['ADMIN']),
  isAgent: checkRole(['AGENT']),
  isCustomer: checkRole(['CUSTOMER']),
  isAgentOrAdmin: checkRole(['AGENT', 'ADMIN']),
};
```

---

# **FILE 13: src/middlewares/validator.js**

```javascript
/*******************************************************************************
 * Request Validation Middleware
 * Uses express-validator for input validation
 ******************************************************************************/

const { body, query, param, validationResult } = require('express-validator');
const ResponseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn(`Validation failed: ${JSON.stringify(errors.array())}`);
    return ResponseHandler.badRequest(
      res,
      'Validation error',
      400,
      errors.array()
    );
  }

  next();
};

// Custom validators
const validators = {
  // Email validation
  email: body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),

  // Password validation (min 8 chars, 1 uppercase, 1 number, 1 special char)
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, number, and special character'),

  // Numeric ID validation
  numericId: param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID format'),

  // UUID validation
  uuid: param('id')
    .isUUID()
    .withMessage('Invalid UUID format'),

  // Amount validation (for financial)
  amount: body('amount')
    .isDecimal({ decimal_digits: '1,2' })
    .custom((value) => value > 0)
    .withMessage('Amount must be greater than 0'),

  // Phone validation (India format)
  phone: body('phone')
    .matches(/^(\+91)?[6-9]\d{9}$/)
    .withMessage('Invalid phone number'),

  // URL validation
  url: body('url')
    .isURL()
    .withMessage('Invalid URL'),

  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be >= 1'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
};

module.exports = {
  validators,
  handleValidationErrors,
};
```

---

# **FILE 14: src/middlewares/errorHandler.js**

```javascript
/*******************************************************************************
 * Global Error Handler Middleware
 * Catches all errors and returns standardized response
 ******************************************************************************/

const logger = require('../utils/logger');
const ResponseHandler = require('../utils/responseHandler');

class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Express error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Duplicate key error (SQL Server specific)
  if (err.number === 2627) {
    err.message = 'Duplicate entry';
    err.statusCode = 409;
  }

  // Foreign key constraint error
  if (err.number === 547) {
    err.message = 'Invalid reference';
    err.statusCode = 400;
  }

  // Log error
  logger.error(`[${err.statusCode}] ${err.message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.user_id,
  });

  // Send response
  return ResponseHandler.error(
    res,
    err.message,
    err.statusCode,
    process.env.NODE_ENV === 'development' ? err : null
  );
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
const notFound = (req, res) => {
  logger.warn(`Route not found: ${req.path}`);
  ResponseHandler.notFound(res, `Route ${req.path} not found`);
};

module.exports = {
  ErrorHandler,
  globalErrorHandler,
  asyncHandler,
  notFound,
};
```

---

# **FILE 15: src/models/User.js**

```javascript
/*******************************************************************************
 * User Data Model/Interface
 * Define user data structure and validation rules
 ******************************************************************************/

class User {
  constructor(data = {}) {
    this.user_id = data.user_id;
    this.user_uuid = data.user_uuid;
    this.email = data.email;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.phone = data.phone;
    this.user_type = data.user_type; // 'ADMIN', 'AGENT'
    this.agent_tier = data.agent_tier; // 'SILVER', 'GOLD', 'PLATINUM'
    this.status = data.status; // 'ACTIVE', 'INACTIVE', 'SUSPENDED'
    this.is_email_verified = data.is_email_verified;
    this.is_kyc_verified = data.is_kyc_verified;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Exclude sensitive fields
  toJSON() {
    const obj = { ...this };
    delete obj.password_hash;
    delete obj.password_salt;
    return obj;
  }

  // Check if user is admin
  isAdmin() {
    return this.user_type === 'ADMIN';
  }

  // Check if user is agent
  isAgent() {
    return this.user_type === 'AGENT';
  }

  // Get full name
  getFullName() {
    return `${this.first_name} ${this.last_name}`.trim();
  }
}

module.exports = User;
```

---

# **FILE 16: src/models/Wallet.js**

```javascript
/*******************************************************************************
 * Wallet Data Model/Interface
 ******************************************************************************/

class Wallet {
  constructor(data = {}) {
    this.wallet_id = data.wallet_id;
    this.wallet_uuid = data.wallet_uuid;
    this.agent_id = data.agent_id;
    this.current_balance = data.current_balance;
    this.total_credited = data.total_credited;
    this.total_debited = data.total_debited;
    this.status = data.status; // 'ACTIVE', 'FROZEN', 'SUSPENDED'
    this.low_balance_threshold = data.low_balance_threshold;
    this.last_transaction_at = data.last_transaction_at;
    this.last_recharge_at = data.last_recharge_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Check if balance is low
  isLowBalance() {
    return this.current_balance < this.low_balance_threshold;
  }

  // Check if wallet is active
  isActive() {
    return this.status === 'ACTIVE';
  }

  // Get available balance
  getAvailableBalance() {
    return this.isActive() ? this.current_balance : 0;
  }

  // Check if sufficient balance
  hasSufficientBalance(amount) {
    return this.current_balance >= amount;
  }
}

module.exports = Wallet;
```

---

# **FILE 17: src/repositories/userRepository.js**

```javascript
/*******************************************************************************
 * User Repository
 * Data Access Layer for User operations
 * All database queries with parameterized statements (SQL injection safe)
 ******************************************************************************/

const sql = require('mssql');
const database = require('../database/connection');
const logger = require('../utils/logger');
const User = require('../models/User');

class UserRepository {
  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('email', sql.NVarChar, email.trim().toLowerCase())
        .query(`
          SELECT TOP 1 *
          FROM dbo.users
          WHERE email = @email AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new User(result.recordset[0]);
    } catch (error) {
      logger.error('findByEmail error:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} userId - User ID
   * @returns {Promise<User|null>}
   */
  async findById(userId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('user_id', sql.BigInt, userId)
        .query(`
          SELECT *
          FROM dbo.users
          WHERE user_id = @user_id AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new User(result.recordset[0]);
    } catch (error) {
      logger.error('findById error:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<User|null>}
   */
  async findByUsername(username) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('username', sql.VarChar, username.trim())
        .query(`
          SELECT TOP 1 *
          FROM dbo.users
          WHERE username = @username AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new User(result.recordset[0]);
    } catch (error) {
      logger.error('findByUsername error:', error);
      throw error;
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<User>}
   */
  async create(userData) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('user_uuid', sql.UniqueIdentifier, userData.user_uuid)
        .input('email', sql.NVarChar, userData.email.trim().toLowerCase())
        .input('username', sql.VarChar, userData.username.trim())
        .input('password_hash', sql.VarChar, userData.password_hash)
        .input('password_salt', sql.VarChar, userData.password_salt)
        .input('first_name', sql.NVarChar, userData.first_name)
        .input('last_name', sql.NVarChar, userData.last_name)
        .input('phone', sql.VarChar, userData.phone)
        .input('user_type', sql.VarChar, userData.user_type)
        .input('agent_tier', sql.VarChar, userData.agent_tier || 'SILVER')
        .input('status', sql.VarChar, userData.status || 'ACTIVE')
        .query(`
          INSERT INTO dbo.users (
            user_uuid, email, username, password_hash, password_salt,
            first_name, last_name, phone, user_type, agent_tier, status,
            is_email_verified, is_kyc_verified, created_at, updated_at
          )
          VALUES (
            @user_uuid, @email, @username, @password_hash, @password_salt,
            @first_name, @last_name, @phone, @user_type, @agent_tier, @status,
            0, 0, GETUTCDATE(), GETUTCDATE()
          );
          SELECT CAST(SCOPE_IDENTITY() as BIGINT) as user_id;
        `);

      const userId = result.recordset[0].user_id;
      return await this.findById(userId);
    } catch (error) {
      logger.error('create user error:', error);
      throw error;
    }
  }

  /**
   * Update user
   * @param {number} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<User>}
   */
  async update(userId, updateData) {
    try {
      const pool = await database.connect();

      // Build dynamic update query
      const allowedFields = [
        'first_name', 'last_name', 'phone', 'agent_tier',
        'status', 'is_email_verified', 'is_kyc_verified'
      ];

      let updateQuery = 'UPDATE dbo.users SET ';
      const request = pool.request().input('user_id', sql.BigInt, userId);

      const updates = [];
      Object.keys(updateData).forEach((key) => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = @${key}`);
          
          if (key === 'first_name' || key === 'last_name') {
            request.input(key, sql.NVarChar, updateData[key]);
          } else if (key === 'phone') {
            request.input(key, sql.VarChar, updateData[key]);
          } else if (key.includes('is_')) {
            request.input(key, sql.Bit, updateData[key]);
          } else {
            request.input(key, sql.VarChar, updateData[key]);
          }
        }
      });

      if (updates.length === 0) {
        return await this.findById(userId);
      }

      updateQuery += updates.join(', ') + ', updated_at = GETUTCDATE() WHERE user_id = @user_id';

      await request.query(updateQuery);

      logger.info(`User ${userId} updated`);
      return await this.findById(userId);
    } catch (error) {
      logger.error('update user error:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   * @param {number} userId - User ID
   * @returns {Promise<boolean>}
   */
  async delete(userId) {
    try {
      const pool = await database.connect();
      await pool.request()
        .input('user_id', sql.BigInt, userId)
        .query(`
          UPDATE dbo.users
          SET is_deleted = 1, deleted_at = GETUTCDATE(), updated_at = GETUTCDATE()
          WHERE user_id = @user_id
        `);

      logger.info(`User ${userId} soft deleted`);
      return true;
    } catch (error) {
      logger.error('delete user error:', error);
      throw error;
    }
  }

  /**
   * Get all agents (paginated)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<{data: User[], total: number}>}
   */
  async getAllAgents(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const pool = await database.connect();

      // Get total count
      const countResult = await pool.request().query(`
        SELECT COUNT(*) as total
        FROM dbo.users
        WHERE user_type = 'AGENT' AND is_deleted = 0
      `);

      const total = countResult.recordset[0].total;

      // Get paginated results
      const result = await pool.request()
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT *
          FROM dbo.users
          WHERE user_type = 'AGENT' AND is_deleted = 0
          ORDER BY created_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      const users = result.recordset.map(row => new User(row));

      return {
        data: users,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('getAllAgents error:', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>}
   */
  async emailExists(email) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('email', sql.NVarChar, email.trim().toLowerCase())
        .query(`
          SELECT COUNT(*) as count
          FROM dbo.users
          WHERE email = @email AND is_deleted = 0
        `);

      return result.recordset[0].count > 0;
    } catch (error) {
      logger.error('emailExists error:', error);
      throw error;
    }
  }

  /**
   * Update last login
   * @param {number} userId - User ID
   * @param {string} ipAddress - IP address
   * @returns {Promise<void>}
   */
  async updateLastLogin(userId, ipAddress) {
    try {
      const pool = await database.connect();
      await pool.request()
        .input('user_id', sql.BigInt, userId)
        .input('ip_address', sql.VarChar, ipAddress)
        .query(`
          UPDATE dbo.users
          SET last_login_at = GETUTCDATE(), last_login_ip = @ip_address
          WHERE user_id = @user_id
        `);
    } catch (error) {
      logger.error('updateLastLogin error:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();
```

---

# **FILE 18: src/repositories/walletRepository.js**

```javascript
/*******************************************************************************
 * Wallet Repository
 * Data Access Layer for Wallet operations
 ******************************************************************************/

const sql = require('mssql');
const database = require('../database/connection');
const logger = require('../utils/logger');
const Wallet = require('../models/Wallet');

class WalletRepository {
  /**
   * Get wallet by agent ID
   * @param {number} agentId - Agent ID
   * @returns {Promise<Wallet|null>}
   */
  async getWalletByAgentId(agentId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .query(`
          SELECT *
          FROM dbo.wallets
          WHERE agent_id = @agent_id AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new Wallet(result.recordset[0]);
    } catch (error) {
      logger.error('getWalletByAgentId error:', error);
      throw error;
    }
  }

  /**
   * Get wallet by wallet ID
   * @param {number} walletId - Wallet ID
   * @returns {Promise<Wallet|null>}
   */
  async getWalletById(walletId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .query(`
          SELECT *
          FROM dbo.wallets
          WHERE wallet_id = @wallet_id AND is_deleted = 0
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      return new Wallet(result.recordset[0]);
    } catch (error) {
      logger.error('getWalletById error:', error);
      throw error;
    }
  }

  /**
   * Create wallet for agent
   * @param {number} agentId - Agent ID
   * @returns {Promise<Wallet>}
   */
  async createWallet(agentId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('wallet_uuid', sql.UniqueIdentifier, require('uuid').v4())
        .input('agent_id', sql.BigInt, agentId)
        .query(`
          INSERT INTO dbo.wallets (
            wallet_uuid, agent_id, current_balance, total_credited,
            total_debited, status, low_balance_threshold, created_at, updated_at
          )
          VALUES (
            @wallet_uuid, @agent_id, 0, 0, 0, 'ACTIVE', 5000, GETUTCDATE(), GETUTCDATE()
          );
          SELECT CAST(SCOPE_IDENTITY() as BIGINT) as wallet_id;
        `);

      const walletId = result.recordset[0].wallet_id;
      return await this.getWalletById(walletId);
    } catch (error) {
      logger.error('createWallet error:', error);
      throw error;
    }
  }

  /**
   * Recharge wallet using stored procedure
   * @param {number} agentId - Agent ID
   * @param {number} amount - Recharge amount
   * @param {number} paymentId - Payment ID
   * @param {string} description - Transaction description
   * @returns {Promise<Object>}
   */
  async rechargeWallet(agentId, amount, paymentId, description = null) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .input('amount', sql.Decimal(15, 2), amount)
        .input('payment_id', sql.BigInt, paymentId)
        .input('description', sql.NVarChar, description || `Wallet recharge of ₹${amount}`)
        .input('created_by', sql.BigInt, null) // From token context
        .input('ip_address', sql.VarChar, null) // From request context
        .output('new_balance', sql.Decimal(15, 2))
        .output('transaction_id', sql.BigInt)
        .execute('dbo.sp_WalletRecharge');

      logger.info(`Wallet recharged for agent ${agentId}: ₹${amount}`);

      return {
        success: true,
        newBalance: result.output.new_balance,
        transactionId: result.output.transaction_id,
      };
    } catch (error) {
      logger.error('rechargeWallet error:', error);
      throw error;
    }
  }

  /**
   * Debit wallet for booking
   * @param {number} agentId - Agent ID
   * @param {number} amount - Debit amount
   * @param {number} bookingId - Booking ID
   * @param {string} description - Transaction description
   * @returns {Promise<Object>}
   */
  async debitWallet(agentId, amount, bookingId, description = null) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('agent_id', sql.BigInt, agentId)
        .input('amount', sql.Decimal(15, 2), amount)
        .input('booking_id', sql.BigInt, bookingId)
        .input('description', sql.NVarChar, description || `Payment for booking`)
        .input('created_by', sql.BigInt, null)
        .input('ip_address', sql.VarChar, null)
        .output('new_balance', sql.Decimal(15, 2))
        .output('transaction_id', sql.BigInt)
        .execute('dbo.sp_WalletDebit');

      logger.info(`Wallet debited for agent ${agentId}: ₹${amount}`);

      return {
        success: true,
        newBalance: result.output.new_balance,
        transactionId: result.output.transaction_id,
      };
    } catch (error) {
      logger.error('debitWallet error:', error);
      throw error;
    }
  }

  /**
   * Get wallet transaction history
   * @param {number} walletId - Wallet ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<{data: Array, total: number, page: number, limit: number}>}
   */
  async getTransactionHistory(walletId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const pool = await database.connect();

      // Get total count
      const countResult = await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .query(`
          SELECT COUNT(*) as total
          FROM dbo.wallet_transactions
          WHERE wallet_id = @wallet_id AND status = 'SUCCESS'
        `);

      const total = countResult.recordset[0].total;

      // Get paginated transactions
      const result = await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT 
            wallet_transaction_id,
            transaction_type,
            credit_amount,
            debit_amount,
            balance_after,
            description,
            status,
            created_at
          FROM dbo.wallet_transactions
          WHERE wallet_id = @wallet_id AND status = 'SUCCESS'
          ORDER BY created_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);

      return {
        data: result.recordset,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('getTransactionHistory error:', error);
      throw error;
    }
  }

  /**
   * Calculate wallet balance from transactions
   * @param {number} walletId - Wallet ID
   * @returns {Promise<number>}
   */
  async calculateBalance(walletId) {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .query(`
          SELECT 
            ISNULL(SUM(credit_amount) - SUM(debit_amount), 0) as calculated_balance
          FROM dbo.wallet_transactions
          WHERE wallet_id = @wallet_id AND status = 'SUCCESS'
        `);

      return result.recordset[0].calculated_balance;
    } catch (error) {
      logger.error('calculateBalance error:', error);
      throw error;
    }
  }

  /**
   * Check wallet balance discrepancy
   * @param {number} walletId - Wallet ID
   * @returns {Promise<{hasDiscrepancy: boolean, currentBalance: number, calculatedBalance: number}>}
   */
  async checkBalanceDiscrepancy(walletId) {
    try {
      const wallet = await this.getWalletById(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const calculatedBalance = await this.calculateBalance(walletId);
      const hasDiscrepancy = Math.abs(wallet.current_balance - calculatedBalance) > 0.01;

      return {
        hasDiscrepancy,
        currentBalance: wallet.current_balance,
        calculatedBalance,
        difference: wallet.current_balance - calculatedBalance,
      };
    } catch (error) {
      logger.error('checkBalanceDiscrepancy error:', error);
      throw error;
    }
  }

  /**
   * Update wallet status
   * @param {number} walletId - Wallet ID
   * @param {string} status - New status
   * @returns {Promise<Wallet>}
   */
  async updateStatus(walletId, status) {
    try {
      const pool = await database.connect();
      await pool.request()
        .input('wallet_id', sql.BigInt, walletId)
        .input('status', sql.VarChar, status)
        .query(`
          UPDATE dbo.wallets
          SET status = @status, updated_at = GETUTCDATE()
          WHERE wallet_id = @wallet_id
        `);

      logger.info(`Wallet ${walletId} status updated to ${status}`);
      return await this.getWalletById(walletId);
    } catch (error) {
      logger.error('updateStatus error:', error);
      throw error;
    }
  }

  /**
   * Get low balance wallets (for alerts)
   * @returns {Promise<Wallet[]>}
   */
  async getLowBalanceWallets() {
    try {
      const pool = await database.connect();
      const result = await pool.request()
        .query(`
          SELECT *
          FROM dbo.wallets
          WHERE current_balance < low_balance_threshold
            AND status = 'ACTIVE'
            AND is_deleted = 0
        `);

      return result.recordset.map(row => new Wallet(row));
    } catch (error) {
      logger.error('getLowBalanceWallets error:', error);
      throw error;
    }
  }
}

module.exports = new WalletRepository();
```

---

# **FILE 19: src/services/authService.js**

```javascript
/*******************************************************************************
 * Authentication Service
 * Business logic for authentication and authorization
 ******************************************************************************/

const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const encryption = require('../utils/encryption');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  /**
   * Register new user (agent/admin)
   * @param {Object} userData - Registration data
   * @returns {Promise<Object>}
   */
  async registerUser(userData) {
    try {
      // Check if email exists
      const emailExists = await userRepository.emailExists(userData.email);
      if (emailExists) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await encryption.hashPassword(userData.password);

      // Create user
      const newUser = await userRepository.create({
        user_uuid: uuidv4(),
        email: userData.email,
        username: userData.username,
        password_hash: passwordHash,
        password_salt: 'salt', // Bcrypt handles salt internally
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        user_type: userData.user_type || 'AGENT',
        agent_tier: userData.agent_tier || 'SILVER',
      });

      // Create wallet for agents
      if (userData.user_type === 'AGENT') {
        await walletRepository.createWallet(newUser.user_id);
        logger.info(`Wallet created for agent: ${newUser.user_id}`);
      }

      logger.info(`User registered: ${newUser.email}`);

      return {
        success: true,
        message: 'Registration successful',
        user: newUser.toJSON(),
      };
    } catch (error) {
      logger.error('registerUser error:', error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - Email
   * @param {string} password - Password
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Object>}
   */
  async login(email, password, ipAddress) {
    try {
      // Find user
      const user = await userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new Error(`Account is ${user.status.toLowerCase()}`);
      }

      // Verify password
      const isPasswordValid = await encryption.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const accessToken = encryption.generateAccessToken({
        user_id: user.user_id,
        email: user.email,
        user_type: user.user_type,
        tenant_id: user.user_id, // For single-tenant, user_id as tenant
      });

      const refreshToken = encryption.generateRefreshToken({
        user_id: user.user_id,
        email: user.email,
      });

      // Update last login
      await userRepository.updateLastLogin(user.user_id, ipAddress);

      logger.info(`User logged in: ${email}`);

      return {
        success: true,
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: user.toJSON(),
      };
    } catch (error) {
      logger.error('login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>}
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = encryption.verifyRefreshToken(refreshToken);

      // Generate new access token
      const newAccessToken = encryption.generateAccessToken({
        user_id: decoded.user_id,
        email: decoded.email,
      });

      logger.info(`Token refreshed for user: ${decoded.user_id}`);

      return {
        success: true,
        message: 'Token refreshed',
        accessToken: newAccessToken,
      };
    } catch (error) {
      logger.error('refreshToken error:', error);
      throw error;
    }
  }

  /**
   * Change password
   * @param {number} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>}
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password
      const isPasswordValid = await encryption.verifyPassword(oldPassword, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await encryption.hashPassword(newPassword);

      // Update password
      await userRepository.update(userId, {
        password_hash: newPasswordHash,
      });

      logger.info(`Password changed for user: ${userId}`);

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      logger.error('changePassword error:', error);
      throw error;
    }
  }

  /**
   * Verify email
   * @param {number} userId - User ID
   * @returns {Promise<Object>}
   */
  async verifyEmail(userId) {
    try {
      await userRepository.update(userId, {
        is_email_verified: 1,
      });

      logger.info(`Email verified for user: ${userId}`);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      logger.error('verifyEmail error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();
```

---

# **FILE 20: src/services/walletService.js**

```javascript
/*******************************************************************************
 * Wallet Service
 * Business logic for wallet operations
 ******************************************************************************/

const walletRepository = require('../repositories/walletRepository');
const logger = require('../utils/logger');

class WalletService {
  /**
   * Get wallet summary for agent
   * @param {number} agentId - Agent ID
   * @returns {Promise<Object>}
   */
  async getWalletSummary(agentId) {
    try {
      const wallet = await walletRepository.getWalletByAgentId(agentId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check for discrepancies
      const discrepancy = await walletRepository.checkBalanceDiscrepancy(wallet.wallet_id);

      if (discrepancy.hasDiscrepancy) {
        logger.warn(`Balance discrepancy detected for wallet ${wallet.wallet_id}`);
      }

      return {
        success: true,
        data: {
          walletId: wallet.wallet_id,
          currentBalance: wallet.current_balance,
          totalCredited: wallet.total_credited,
          totalDebited: wallet.total_debited,
          status: wallet.status,
          isLowBalance: wallet.isLowBalance(),
          lastTransactionAt: wallet.last_transaction_at,
          lastRechargeAt: wallet.last_recharge_at,
          discrepancyCheck: {
            hasDiscrepancy: discrepancy.hasDiscrepancy,
            difference: discrepancy.difference,
          },
        },
      };
    } catch (error) {
      logger.error('getWalletSummary error:', error);
      throw error;
    }
  }

  /**
   * Process wallet recharge
   * @param {number} agentId - Agent ID
   * @param {number} amount - Recharge amount
   * @param {number} paymentId - Payment ID
   * @param {Object} context - Request context (userId, ipAddress)
   * @returns {Promise<Object>}
   */
  async processRecharge(agentId, amount, paymentId, context = {}) {
    try {
      // Validate amount
      if (amount < 1000) {
        throw new Error('Minimum recharge amount is ₹1,000');
      }

      if (amount > 500000) {
        throw new Error('Maximum recharge amount is ₹5,00,000');
      }

      // Get wallet
      const wallet = await walletRepository.getWalletByAgentId(agentId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.isActive()) {
        throw new Error('Wallet is not active');
      }

      // Check maximum balance limit
      if ((wallet.current_balance + amount) > 10000000) {
        throw new Error('Recharge exceeds maximum wallet balance limit');
      }

      // Process recharge
      const result = await walletRepository.rechargeWallet(
        agentId,
        amount,
        paymentId,
        `Wallet recharge of ₹${amount}`
      );

      logger.info(`Recharge processed: Agent ${agentId}, Amount: ₹${amount}`);

      return {
        success: true,
        message: 'Recharge processed successfully',
        data: {
          newBalance: result.newBalance,
          amount: amount,
          transactionId: result.transactionId,
        },
      };
    } catch (error) {
      logger.error('processRecharge error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   * @param {number} agentId - Agent ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getTransactionHistory(agentId, page = 1, limit = 20) {
    try {
      const wallet = await walletRepository.getWalletByAgentId(agentId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const history = await walletRepository.getTransactionHistory(
        wallet.wallet_id,
        page,
        limit
      );

      return {
        success: true,
        data: history.data,
        pagination: {
          page: history.page,
          limit: history.limit,
          total: history.total,
          pages: history.pages,
        },
      };
    } catch (error) {
      logger.error('getTransactionHistory error:', error);
      throw error;
    }
  }

  /**
   * Check wallet balance before booking
   * @param {number} agentId - Agent ID
   * @param {number} requiredAmount - Amount needed
   * @returns {Promise<Object>}
   */
  async checkBalance(agentId, requiredAmount) {
    try {
      const wallet = await walletRepository.getWalletByAgentId(agentId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const hasSufficientBalance = wallet.hasSufficientBalance(requiredAmount);

      return {
        success: true,
        data: {
          hasSufficientBalance,
          currentBalance: wallet.current_balance,
          requiredAmount: requiredAmount,
          shortfall: Math.max(0, requiredAmount - wallet.current_balance),
        },
      };
    } catch (error) {
      logger.error('checkBalance error:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();
```

---

# **FILE 21: src/controllers/authController.js**

```javascript
/*******************************************************************************
 * Authentication Controller
 * HTTP request handlers for authentication
 ******************************************************************************/

const authService = require('../services/authService');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register new user
   */
  register = asyncHandler(async (req, res) => {
    const { email, username, password, first_name, last_name, phone, user_type } = req.body;

    // Validate required fields
    if (!email || !username || !password || !first_name || !last_name || !phone) {
      return ResponseHandler.badRequest(res, 'All fields are required');
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return ResponseHandler.badRequest(res, 
        'Password must be at least 8 characters with uppercase, number, and special character'
      );
    }

    const result = await authService.registerUser({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      first_name,
      last_name,
      phone,
      user_type: user_type || 'AGENT',
    });

    return ResponseHandler.created(res, result.user, result.message);
  });

  /**
   * POST /api/v1/auth/login
   * Login user
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return ResponseHandler.badRequest(res, 'Email and password are required');
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await authService.login(email.toLowerCase(), password, ipAddress);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Don't send refresh token in response (it's in cookie)
    const response = { ...result };
    delete response.refreshToken;

    return ResponseHandler.success(res, response, result.message);
  });

  /**
   * POST /api/v1/auth/refresh-token
   * Refresh access token
   */
  refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return ResponseHandler.unauthorized(res, 'Refresh token not found');
    }

    const result = await authService.refreshToken(refreshToken);

    return ResponseHandler.success(res, result, result.message);
  });

  /**
   * POST /api/v1/auth/change-password
   * Change user password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.user_id;

    if (!oldPassword || !newPassword) {
      return ResponseHandler.badRequest(res, 'Old and new password are required');
    }

    const result = await authService.changePassword(userId, oldPassword, newPassword);

    return ResponseHandler.success(res, {}, result.message);
  });

  /**
   * GET /api/v1/auth/me
   * Get current user details
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    return ResponseHandler.success(res, {
      user: req.user,
    }, 'User details retrieved');
  });

  /**
   * POST /api/v1/auth/logout
   * Logout user
   */
  logout = asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken');
    logger.info(`User logged out: ${req.user.email}`);

    return ResponseHandler.success(res, {}, 'Logged out successfully');
  });
}

module.exports = new AuthController();
```

---

# **FILE 22: src/controllers/walletController.js**

```javascript
/*******************************************************************************
 * Wallet Controller
 * HTTP request handlers for wallet operations
 ******************************************************************************/

const walletService = require('../services/walletService');
const walletRepository = require('../repositories/walletRepository');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

class WalletController {
  /**
   * GET /api/v1/wallet/summary
   * Get wallet summary for agent
   */
  getWalletSummary = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;

    const result = await walletService.getWalletSummary(agentId);

    return ResponseHandler.success(res, result.data, 'Wallet summary retrieved');
  });

  /**
   * GET /api/v1/wallet/balance
   * Get current wallet balance
   */
  getBalance = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;

    const result = await walletService.checkBalance(agentId, 0);

    return ResponseHandler.success(res, result.data, 'Balance retrieved');
  });

  /**
   * POST /api/v1/wallet/recharge
   * Recharge wallet
   */
  rechargeWallet = asyncHandler(async (req, res) => {
    const { amount, paymentId } = req.body;
    const agentId = req.user.user_id;

    if (!amount || !paymentId) {
      return ResponseHandler.badRequest(res, 'Amount and paymentId are required');
    }

    const result = await walletService.processRecharge(
      agentId,
      parseFloat(amount),
      paymentId,
      {
        userId: req.user.user_id,
        ipAddress: req.ip,
      }
    );

    return ResponseHandler.success(res, result.data, result.message);
  });

  /**
   * GET /api/v1/wallet/transactions
   * Get transaction history (paginated)
   */
  getTransactionHistory = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (limit > 100) {
      return ResponseHandler.badRequest(res, 'Limit cannot exceed 100');
    }

    const result = await walletService.getTransactionHistory(agentId, page, limit);

    return ResponseHandler.paginated(
      res,
      result.data,
      result.pagination,
      'Transaction history retrieved'
    );
  });

  /**
   * POST /api/v1/wallet/check-balance
   * Check if wallet has sufficient balance for booking
   */
  checkBalance = asyncHandler(async (req, res) => {
    const { requiredAmount } = req.body;
    const agentId = req.user.user_id;

    if (!requiredAmount) {
      return ResponseHandler.badRequest(res, 'Required amount is mandatory');
    }

    const result = await walletService.checkBalance(agentId, parseFloat(requiredAmount));

    return ResponseHandler.success(res, result.data, 'Balance check completed');
  });

  /**
   * GET /api/v1/wallet/reconciliation
   * Check for wallet balance discrepancies
   */
  reconcileBalance = asyncHandler(async (req, res) => {
    const agentId = req.user.user_id;

    const wallet = await walletRepository.getWalletByAgentId(agentId);
    if (!wallet) {
      return ResponseHandler.notFound(res, 'Wallet not found');
    }

    const discrepancy = await walletRepository.checkBalanceDiscrepancy(wallet.wallet_id);

    if (discrepancy.hasDiscrepancy) {
      logger.warn(`Balance discrepancy for wallet ${wallet.wallet_id}:`, discrepancy);
    }

    return ResponseHandler.success(res, discrepancy, 'Reconciliation check completed');
  });
}

module.exports = new WalletController();
```

---

# **FILE 23: src/routes/index.js**

```javascript
/*******************************************************************************
 * Main Route Handler
 * Aggregate all API routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const walletRoutes = require('./walletRoutes');

// Route mounting
router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;
```

---

# **FILE 24: src/routes/authRoutes.js**

```javascript
/*******************************************************************************
 * Authentication Routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verifyToken, verifyRefreshToken } = require('../middlewares/auth');
const { validators, handleValidationErrors } = require('../middlewares/validator');
const { loginLimiter } = require('../config/security');

// Public Routes
router.post(
  '/register',
  validators.email,
  validators.password,
  validators.phone,
  handleValidationErrors,
  authController.register
);

router.post(
  '/login',
  loginLimiter,
  validators.email,
  handleValidationErrors,
  authController.login
);

router.post(
  '/refresh-token',
  verifyRefreshToken,
  authController.refreshToken
);

// Protected Routes
router.get('/me', verifyToken, authController.getCurrentUser);

router.post(
  '/change-password',
  verifyToken,
  validators.password,
  handleValidationErrors,
  authController.changePassword
);

router.post('/logout', verifyToken, authController.logout);

module.exports = router;
```

---

# **FILE 25: src/routes/walletRoutes.js**

```javascript
/*******************************************************************************
 * Wallet Routes
 ******************************************************************************/

const express = require('express');
const router = express.Router();

const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middlewares/auth');
const { checkRole } = require('../middlewares/rbac');
const { validators, handleValidationErrors } = require('../middlewares/validator');

// All wallet routes are protected and only for agents
router.use(verifyToken); // Authentication required
router.use(checkRole(['AGENT', 'ADMIN'])); // Authorization check

// Wallet Management
router.get('/summary', walletController.getWalletSummary);

router.get('/balance', walletController.getBalance);

router.post(
  '/recharge',
  validators.amount,
  handleValidationErrors,
  walletController.rechargeWallet
);

router.get(
  '/transactions',
  ...validators.pagination,
  handleValidationErrors,
  walletController.getTransactionHistory
);

router.post(
  '/check-balance',
  validators.amount,
  handleValidationErrors,
  walletController.checkBalance
);

router.get(
  '/reconciliation',
  walletController.reconcileBalance
);

module.exports = router;
```

---

# **FILE 26: server.js**

```javascript
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
```

---

# **Installation & Setup**

```bash
# 1. Clone and install
git clone <repo>
cd flight-booking-backend
npm install

# 2. Environment setup
cp .env.example .env
# Edit .env with your SQL Server credentials

# 3. Run migrations (if using migrations)
npm run migrate

# 4. Development mode
npm run dev

# 5. Production mode
npm start
```

---

## 🎯 **Next Steps**

This is a complete, production-ready foundation! What would you like me to create next?

1. ✅ **Booking Controller & Service** (Core booking logic)
2. ✅ **Commission Service** (Calculation & tracking)
3. ✅ **Admin Controller & Routes** (Agent management)
4. ✅ **API Documentation** (Swagger/OpenAPI)
5. ✅ **Docker Setup** (Dockerfile & docker-compose)
6. ✅ **Test Suite** (Jest unit tests)

**Reply: "CONTINUE" to proceed with Booking Services or specify what you need!** 🚀