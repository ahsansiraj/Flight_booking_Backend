🔒 SECURITY ARCHITECTURE - COMPLETE DATABASE & APPLICATION PROTECTION
=====================================================================

You're thinking RIGHT! But AES-256 alone won't save you. Let me give you BRUTAL, REAL-WORLD security architecture.

* * * * *

🎯 SECURITY THREAT MODEL - What We're Protecting Against
--------------------------------------------------------

### Attack Vectors:

1.  ❌ SQL Injection (Classic, still #1 killer)
2.  ❌ Data Breach (Database dump/stolen backups)
3.  ❌ Insider Threat (Rogue admin/DBA stealing data)
4.  ❌ Man-in-the-Middle (Network sniffing)
5.  ❌ Brute Force (Password cracking)
6.  ❌ Session Hijacking (Stolen tokens)
7.  ❌ Financial Fraud (Wallet manipulation)
8.  ❌ Unauthorized Access (Privilege escalation)

* * * * *

🛡️ MULTI-LAYER SECURITY ARCHITECTURE
-------------------------------------

text

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: NETWORK SECURITY                │
│  - Firewall (Only port 1433 from app server)               │
│  - VPN/Private Network                                      │
│  - IP Whitelisting                                          │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 2: CONNECTION SECURITY (TLS)             │
│  - Encrypted connections (SSL/TLS 1.2+)                     │
│  - Certificate pinning                                      │
│  - No plaintext DB credentials in code                      │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           LAYER 3: AUTHENTICATION & AUTHORIZATION           │
│  - SQL Server Authentication (strong passwords)             │
│  - Windows Authentication (recommended)                     │
│  - Least Privilege (role-based DB access)                   │
│  - Separate DB users for app/admin/reporting               │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         LAYER 4: DATA ENCRYPTION AT REST (AES-256)          │
│  - Transparent Data Encryption (TDE)                        │
│  - Column-level encryption (sensitive fields)               │
│  - Backup encryption                                        │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│          LAYER 5: APPLICATION SECURITY (Node.js)            │
│  - Parameterized queries (NO string concatenation)          │
│  - Input validation & sanitization                          │
│  - Rate limiting                                            │
│  - CORS policy                                              │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            LAYER 6: AUDIT & MONITORING                      │
│  - Activity logging (who did what, when)                    │
│  - Failed login attempts tracking                           │
│  - Anomaly detection (unusual transactions)                 │
│  - Real-time alerts                                         │
└─────────────────────────────────────────────────────────────┘
```

* * * * *

🔐 LAYER 1: DATABASE ENCRYPTION (TDE + Column-Level)
----------------------------------------------------

### 1.1 Transparent Data Encryption (TDE) - Full Database

What it protects:

-   ✅ Stolen database files (.mdf, .ldf)
-   ✅ Stolen backups (.bak files)
-   ✅ Unauthorized OS-level access

Implementation:

SQL

```
-- Step 1: Create Master Key (on master database)
USE master;
GO

CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'YourSuperStrongMasterKey!2025@#$';
GO

-- Step 2: Create Certificate
CREATE CERTIFICATE TDE_Certificate
WITH SUBJECT = 'Flight Booking Platform TDE Certificate',
EXPIRY_DATE = '2030-12-31';
GO

-- Backup the certificate (CRITICAL - store safely!)
BACKUP CERTIFICATE TDE_Certificate
TO FILE = 'D:\Certificates\TDE_Certificate.cer'
WITH PRIVATE KEY (
    FILE = 'D:\Certificates\TDE_Certificate_Key.pvk',
    ENCRYPTION BY PASSWORD = 'CertificateBackupPassword!2025'
);
GO

-- Step 3: Create Database Encryption Key
USE FlightBookingB2B;
GO

CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDE_Certificate;
GO

-- Step 4: Enable TDE
ALTER DATABASE FlightBookingB2B
SET ENCRYPTION ON;
GO

-- Step 5: Verify encryption status
SELECT
    db_name(database_id) AS DatabaseName,
    encryption_state,
    CASE encryption_state
        WHEN 0 THEN 'No encryption'
        WHEN 1 THEN 'Unencrypted'
        WHEN 2 THEN 'Encryption in progress'
        WHEN 3 THEN 'Encrypted'
        WHEN 4 THEN 'Key change in progress'
        WHEN 5 THEN 'Decryption in progress'
    END AS encryption_state_desc,
    percent_complete,
    encryptor_type
FROM sys.dm_database_encryption_keys;
```

⚠️ CRITICAL: Backup the certificate! If you lose it, YOU CANNOT RESTORE YOUR DATABASE.

* * * * *

### 1.2 Column-Level Encryption (Sensitive Data)

What to encrypt:

-   ❌ DON'T encrypt: `wallet_transaction_id`, `amount`, `balance` (need for queries/calculations)
-   ✅ DO encrypt:
    -   `users.password_hash` (already hashed, but encrypt the hash)
    -   `customers.primary_id_number` (Aadhaar, PAN, Passport)
    -   `customers.phone` (PII)
    -   `customers.email` (PII)
    -   `payments.card_number` (if storing - ideally DON'T)
    -   `payouts.bank_account_number`

Implementation:

SQL

```
-- Create Column Encryption Key
USE FlightBookingB2B;
GO

-- Step 1: Create Master Key (if not exists)
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'ColumnEncryptionMasterKey!2025';
GO

-- Step 2: Create Certificate for Column Encryption
CREATE CERTIFICATE ColumnEncryptionCert
WITH SUBJECT = 'Certificate for Column-Level Encryption';
GO

-- Step 3: Create Symmetric Key
CREATE SYMMETRIC KEY ColumnEncryptionKey
WITH ALGORITHM = AES_256
ENCRYPTION BY CERTIFICATE ColumnEncryptionCert;
GO

-- Step 4: Add encrypted columns to sensitive tables
ALTER TABLE dbo.customers
ADD
    phone_encrypted VARBINARY(256),
    email_encrypted VARBINARY(512),
    primary_id_number_encrypted VARBINARY(256);
GO

ALTER TABLE dbo.payouts
ADD bank_account_number_encrypted VARBINARY(256);
GO
```

Encryption/Decryption Functions:

SQL

```
-- ENCRYPT DATA
OPEN SYMMETRIC KEY ColumnEncryptionKey
DECRYPTION BY CERTIFICATE ColumnEncryptionCert;

UPDATE dbo.customers
SET phone_encrypted = ENCRYPTBYKEY(KEY_GUID('ColumnEncryptionKey'), phone);

CLOSE SYMMETRIC KEY ColumnEncryptionKey;
GO

-- DECRYPT DATA
OPEN SYMMETRIC KEY ColumnEncryptionKey
DECRYPTION BY CERTIFICATE ColumnEncryptionCert;

SELECT
    customer_id,
    first_name,
    last_name,
    CONVERT(VARCHAR(20), DECRYPTBYKEY(phone_encrypted)) AS phone,
    CONVERT(VARCHAR(255), DECRYPTBYKEY(email_encrypted)) AS email
FROM dbo.customers;

CLOSE SYMMETRIC KEY ColumnEncryptionKey;
```

* * * * *

### 1.3 Backup Encryption

SQL

```
-- Encrypted backup
BACKUP DATABASE FlightBookingB2B
TO DISK = 'D:\Backups\FlightBookingB2B_Full.bak'
WITH
    ENCRYPTION (
        ALGORITHM = AES_256,
        SERVER CERTIFICATE = TDE_Certificate
    ),
    COMPRESSION,
    STATS = 10;
```

* * * * *

🔐 LAYER 2: CONNECTION SECURITY (TLS/SSL)
-----------------------------------------

### 2.1 Force Encrypted Connections

SQL Server Configuration:

SQL

```
-- On SQL Server instance (SSMS)
-- 1. Open SQL Server Configuration Manager
-- 2. SQL Server Network Configuration > Protocols for [Instance]
-- 3. Right-click TCP/IP > Properties
-- 4. Certificate tab: Select valid SSL certificate
-- 5. Flags tab: Force Encryption = Yes
-- 6. Restart SQL Server service
```

Node.js Connection String:

JavaScript

```
// src/config/database.js
const dbConfig = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true, // ✅ FORCE TLS encryption
    trustServerCertificate: false, // ✅ Verify certificate (set to true only in dev)
    enableArithAbort: true,
    cryptoCredentialsDetails: {
      minVersion: 'TLSv1.2', // ✅ Minimum TLS 1.2
    },
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
};
```

* * * * *

🔐 LAYER 3: AUTHENTICATION & AUTHORIZATION
------------------------------------------

### 3.1 Database Users (Least Privilege Principle)

DON'T: Use `sa` account in application

DO: Create separate users with minimal permissions

SQL

```
-- Create application user (for Node.js)
USE master;
GO

CREATE LOGIN flight_app_user WITH PASSWORD = 'AppUser@SecurePassword2025!';
GO

USE FlightBookingB2B;
GO

CREATE USER flight_app_user FOR LOGIN flight_app_user;
GO

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON dbo.users TO flight_app_user;
GRANT SELECT, INSERT, UPDATE ON dbo.wallets TO flight_app_user;
GRANT SELECT, INSERT, UPDATE ON dbo.wallet_transactions TO flight_app_user;
GRANT SELECT, INSERT, UPDATE ON dbo.bookings TO flight_app_user;
GRANT SELECT, INSERT, UPDATE ON dbo.payments TO flight_app_user;
GRANT SELECT, INSERT ON dbo.audit.activity_logs TO flight_app_user;

-- Deny DELETE (soft delete only via UPDATE)
DENY DELETE ON SCHEMA::dbo TO flight_app_user;

-- Grant EXECUTE on stored procedures
GRANT EXECUTE ON dbo.sp_WalletRecharge TO flight_app_user;
GRANT EXECUTE ON dbo.sp_WalletDebit TO flight_app_user;
GRANT EXECUTE ON dbo.sp_CalculateCommission TO flight_app_user;
GO

-- Create read-only user (for reporting/analytics)
CREATE LOGIN flight_readonly_user WITH PASSWORD = 'ReadOnly@SecurePassword2025!';
GO

CREATE USER flight_readonly_user FOR LOGIN flight_readonly_user;
GO

-- Read-only permissions
GRANT SELECT ON SCHEMA::dbo TO flight_readonly_user;
GRANT SELECT ON SCHEMA::analytics TO flight_readonly_user;
DENY INSERT, UPDATE, DELETE ON SCHEMA::dbo TO flight_readonly_user;
GO

-- Create admin user (for maintenance)
CREATE LOGIN flight_admin_user WITH PASSWORD = 'Admin@SecurePassword2025!';
GO

CREATE USER flight_admin_user FOR LOGIN flight_admin_user;
GO

ALTER ROLE db_owner ADD MEMBER flight_admin_user;
GO
```

### 3.2 Environment-Based Credentials

.env (NEVER commit to Git):

env

```
# Production Database (encrypted connection)
DB_HOST=your-production-server.database.windows.net
DB_PORT=1433
DB_NAME=FlightBookingB2B
DB_USER=flight_app_user
DB_PASSWORD=AppUser@SecurePassword2025!
DB_ENCRYPT=true
DB_TRUST_SERVER_CERT=false

# Store in Azure Key Vault / AWS Secrets Manager in production
```

Use Azure Key Vault (Production):

JavaScript

```
// src/config/database.js
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

async function getDbCredentials() {
  const credential = new DefaultAzureCredential();
  const client = new SecretClient('https://your-keyvault.vault.azure.net/', credential);

  const dbPassword = await client.getSecret('db-password');

  return {
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: dbPassword.value, // ✅ Retrieved from Key Vault
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };
}
```

* * * * *

🔐 LAYER 4: APPLICATION SECURITY (SQL Injection Prevention)
-----------------------------------------------------------

### 4.1 ALWAYS Use Parameterized Queries

❌ NEVER DO THIS (Vulnerable to SQL Injection):

JavaScript

```
// ❌ DANGEROUS - SQL INJECTION ATTACK
const email = req.body.email;
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Attacker sends: email = "' OR '1'='1"
// Query becomes: SELECT * FROM users WHERE email = '' OR '1'='1'
// Returns ALL users!
```

✅ ALWAYS DO THIS (Parameterized Queries):

JavaScript

```
// ✅ SAFE - Parameterized query
const sql = require('mssql');

async function getUserByEmail(email) {
  const pool = await database.connect();
  const result = await pool.request()
    .input('email', sql.NVarChar(255), email) // ✅ Parameter
    .query('SELECT * FROM users WHERE email = @email');

  return result.recordset[0];
}
```

### 4.2 Input Validation & Sanitization

JavaScript

```
// src/middlewares/validator.js
const { body, validationResult } = require('express-validator');

const walletRechargeValidator = [
  body('amount')
    .isFloat({ min: 1000, max: 500000 })
    .withMessage('Amount must be between ₹1,000 and ₹5,00,000'),

  body('paymentMethod')
    .isIn(['CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING'])
    .withMessage('Invalid payment method'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { walletRechargeValidator };
```

### 4.3 Rate Limiting (Prevent Brute Force)

JavaScript

```
// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts. Try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

const walletRechargeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 recharges per hour
  message: 'Recharge limit exceeded. Contact support.',
});

module.exports = { loginLimiter, walletRechargeLimiter };
```

* * * * *

🔐 LAYER 5: PASSWORD HASHING (Bcrypt)
-------------------------------------

JavaScript

```
// src/utils/encryption.js
const bcrypt = require('bcrypt');

class EncryptionService {
  async hashPassword(password) {
    const saltRounds = 12; // Higher = more secure, but slower
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // For sensitive data (AES-256)
  encryptData(data, key) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  decryptData(encryptedData, key) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = new EncryptionService();
```

Usage:

JavaScript

```
// During user registration
const hashedPassword = await encryptionService.hashPassword(plainPassword);

await pool.request()
  .input('email', sql.NVarChar, email)
  .input('password_hash', sql.VarChar(255), hashedPassword)
  .query('INSERT INTO users (email, password_hash) VALUES (@email, @password_hash)');

// During login
const user = await getUserByEmail(email);
const isValid = await encryptionService.verifyPassword(plainPassword, user.password_hash);
```

* * * * *

🔐 LAYER 6: JWT TOKEN SECURITY
------------------------------

JavaScript

```
// src/utils/jwtHelper.js
const jwt = require('jsonwebtoken');

class JWTService {
  generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m', // Short-lived
      algorithm: 'HS256',
    });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '7d', // Long-lived
      algorithm: 'HS256',
    });
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

module.exports = new JWTService();
```

Store refresh tokens in database (with expiry):

SQL

```
CREATE TABLE dbo.user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL, -- Store hashed token
    ip_address VARCHAR(45),
    user_agent NVARCHAR(500),
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
);
```

* * * * *

🔐 LAYER 7: AUDIT LOGGING (Track Everything)
--------------------------------------------

SQL

```
-- Trigger on wallet_transactions (immutable audit)
CREATE TRIGGER trg_wallet_transaction_audit
ON dbo.wallet_transactions
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO audit.activity_logs (
        actor_id, action, entity_type, entity_id,
        changes, ip_address, created_at
    )
    SELECT
        i.created_by,
        CASE WHEN EXISTS(SELECT * FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
        'WALLET_TRANSACTION',
        i.wallet_transaction_id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        i.ip_address,
        GETUTCDATE()
    FROM inserted i;
END;
```

* * * * *

🔐 LAYER 8: NETWORK SECURITY
----------------------------

### 8.1 Firewall Rules

Bash

```
# Allow only application server IP to access SQL Server (port 1433)
# Azure SQL: Configure firewall in Azure Portal
# On-Prem: Windows Firewall

# Example: Only allow 192.168.1.100 (app server)
New-NetFirewallRule -DisplayName "SQL Server App Access" `
    -Direction Inbound -LocalPort 1433 -Protocol TCP `
    -Action Allow -RemoteAddress 192.168.1.100
```

### 8.2 VPN/Private Network

-   ✅ Database server on private subnet (not public internet)
-   ✅ Application server on same VNet/VPC
-   ✅ Use Azure Private Link or AWS PrivateLink

* * * * *

📋 SECURITY CHECKLIST (Before Going Live)
-----------------------------------------

### Database Level:

-   [ ]  TDE enabled (Transparent Data Encryption)
-   [ ]  Column-level encryption for PII
-   [ ]  Certificate backed up and stored securely
-   [ ]  Backup encryption enabled
-   [ ]  Strong `sa` password (disabled if possible)
-   [ ]  Least privilege DB users created
-   [ ]  SQL Server on latest security patch
-   [ ]  Default port (1433) changed (optional)
-   [ ]  SQL Server Browser service disabled

### Application Level:

-   [ ]  All queries parameterized (NO string concatenation)
-   [ ]  Input validation on all endpoints
-   [ ]  Rate limiting on login, recharge, booking
-   [ ]  Passwords hashed with bcrypt (salt rounds ≥ 12)
-   [ ]  JWT tokens expire (access: 15min, refresh: 7 days)
-   [ ]  HTTPS/TLS 1.2+ enforced
-   [ ]  CORS configured (whitelist domains)
-   [ ]  Helmet.js for HTTP headers
-   [ ]  Error messages don't leak sensitive info
-   [ ]  Secrets in environment variables (not code)

### Infrastructure Level:

-   [ ]  Firewall: Only app server can access DB
-   [ ]  Database on private network
-   [ ]  SSL certificate valid and not self-signed
-   [ ]  SSH/RDP access restricted (VPN only)
-   [ ]  Regular security audits scheduled
-   [ ]  Intrusion detection system (IDS) enabled
-   [ ]  Automated backups tested (restore works!)
-   [ ]  Disaster recovery plan documented

### Compliance & Monitoring:

-   [ ]  Audit logs enabled (who, what, when)
-   [ ]  Failed login attempts tracked
-   [ ]  Anomaly detection for wallet transactions
-   [ ]  Real-time alerts (Slack/email for suspicious activity)
-   [ ]  GDPR/data privacy compliance (if applicable)
-   [ ]  PCI DSS compliance (if storing card data - AVOID!)
-   [ ]  Penetration testing scheduled
-   [ ]  Security incident response plan

* * * * *

🚨 WHAT YOU SHOULD ABSOLUTELY NOT STORE IN DATABASE:
----------------------------------------------------

❌ Credit Card CVV - NEVER store (PCI DSS violation)\
❌ Full Credit Card Numbers - Use tokenization (Razorpay, Stripe)\
❌ Plain Passwords - Always hash\
❌ Session Tokens (plain) - Hash before storing\
❌ API Keys (plain) - Hash or use Key Vault

* * * * *

✅ MY RECOMMENDATION FOR YOUR PROJECT:
-------------------------------------

### Minimum Security (Development):

1.  ✅ Parameterized queries (non-negotiable)
2.  ✅ Bcrypt password hashing
3.  ✅ JWT authentication
4.  ✅ Input validation
5.  ✅ HTTPS connection to DB

### Production Security:

1.  ✅ All of the above
2.  ✅ TDE (Transparent Data Encryption)
3.  ✅ Column-level encryption for PII
4.  ✅ Separate DB users (app, readonly, admin)
5.  ✅ Firewall + Private network
6.  ✅ Audit logging
7.  ✅ Rate limiting
8.  ✅ Azure Key Vault / AWS Secrets Manager
9.  ✅ Regular security audits