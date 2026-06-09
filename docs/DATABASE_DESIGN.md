# Database Design Document
## Multi-Tenant Booking Platform

### Version: 1.0
### Database: Microsoft SQL Server 2019+


---

## Table of Contents
1. [Database Architecture Overview](#1-database-architecture-overview)
2. [Schema Design](#2-schema-design)
3. [Detailed Table Specifications](#3-detailed-table-specifications)
4. [Indexing Strategy](#4-indexing-strategy)
5. [Partitioning Strategy](#5-partitioning-strategy)
6. [Security Implementation](#6-security-implementation)
7. [Backup and Recovery](#7-backup-and-recovery)
8. [Performance Optimization](#8-performance-optimization)
9. [Database Maintenance Plan](#9-database-maintenance-plan)
10. [Monitoring and Health Checks](#10-monitoring-and-health-checks)
11. [Stored Procedures for Common Operations](#11-stored-procedures-for-common-operations)
12. [Complete Database Initialization Script](#12-complete-database-initialization-script)
13. [Database Deployment Checklist](#13-database-deployment-checklist)

---

## 1. Database Architecture Overview

### 1.1 Architecture Pattern
**Selected Pattern**: B2B Single-Tenant Database

**Rational**:
- Integrated system where Admin has full control
- Agent wallets acting as an immutable ledger
- Secure and simplified reporting
- Efficient for standard B2B workflows

### 1.2 Database Organization

* **BookingPlatformDB (Primary Database)**
    * **Core Schema (dbo)**
    * **Security Schema (sec)**
    * **Audit Schema (audit)**
    * **Analytics Schema (analytics)**
    * **Archive Schema (archive)**


### 1.3 High-Level Design Principles

1. **Normalization**: 3NF for transactional tables
2. **Denormalization**: Strategic denormalization for reporting tables
3. **Soft Deletes**: All records use `is_deleted` flag
4. **Audit Trail**: Complete history tracking
5. **Optimistic Locking**: Using `row_version` for concurrency
6. **UUID + Sequential**: Hybrid ID strategy (clustered on sequential, unique on UUID)
7. **Temporal Tables**: For critical data history

---

## 2. Schema Design

### 2.1 Entity Relationship Diagram (ERD)

* **Core Entities**
    * **Users** (Admin, Agents)
        * `1:1` → **Wallets**
            * `1:N` → **Wallet Transactions**
        * `1:N` → **Payouts**
        * `1:N` → **Customers**
            * `1:N` → **Bookings**
                * `1:1` → **Flight Bookings**
        * `1:N` → **Commission Rules**
    * **Travelers**
        * `N:M` → **Bookings**


### 2.2 Schema Categories

#### Core Schemas
2. **B2B Identity**: Users (Admin, Agents), Roles, Permissions
3. **Wallet System**: Wallets, Wallet Transactions, Payouts
3. **Customer Management**: Customers, Travelers
4. **Booking Management**: Bookings, Booking Items
5. **Service Specific**: Flights, Hotels, Buses
6. **Financial**: Payments, Commissions, Invoices
7. **Inventory**: Availability, Pricing

---

## 3. Detailed Table Specifications

### 3.1 CORE SCHEMA - single-Tenancy & Identity

#### 3.1.1 Table: wallets
**Purpose**: Store agent ledger balances

```sql

CREATE TABLE dbo.wallets (
    wallet_id BIGINT IDENTITY(1,1) NOT NULL,
    user_id BIGINT NOT NULL,
    
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    commission_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    row_version ROWVERSION,
    
    CONSTRAINT PK_wallets PRIMARY KEY CLUSTERED (wallet_id),
    CONSTRAINT UQ_wallets_user UNIQUE (user_id)
);

CREATE NONCLUSTERED INDEX IX_wallets_status ON dbo.wallets(status);
```

#### 3.1.1b Table: wallet_transactions
**Purpose**: Immutable double-entry ledger for wallet balances

```sql
CREATE TABLE dbo.wallet_transactions (
    transaction_id BIGINT IDENTITY(1,1) NOT NULL,
    wallet_id BIGINT NOT NULL,
    
    transaction_type VARCHAR(50) NOT NULL, -- 'RECHARGE', 'BOOKING_DEDUCTION', 'COMMISSION_CREDIT', 'PAYOUT'
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    
    transaction_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    reference_type VARCHAR(50), -- 'BOOKING', 'PAYOUT_REQUEST', 'PAYMENT_GATEWAY'
    reference_id BIGINT,
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_wallet_transactions PRIMARY KEY CLUSTERED (transaction_id),
    CONSTRAINT FK_wallet_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES dbo.wallets(wallet_id)
);
CREATE NONCLUSTERED INDEX IX_wallet_transactions_wallet ON dbo.wallet_transactions(wallet_id);
```

#### 3.1.1c Table: payouts
**Purpose**: Agent requests to withdraw commission to bank

```sql
CREATE TABLE dbo.payouts (
    payout_id BIGINT IDENTITY(1,1) NOT NULL,
    user_id BIGINT NOT NULL,
    
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'
    payout_method VARCHAR(50) NOT NULL, -- 'BANK_TRANSFER', 'UPI'
    bank_details NVARCHAR(MAX), -- JSON with account no, IFSC
    
    processed_by BIGINT, -- admin user_id
    processed_at DATETIME2,
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_payouts PRIMARY KEY CLUSTERED (payout_id)
);
CREATE NONCLUSTERED INDEX IX_payouts_user ON dbo.payouts(user_id);
```

#### 3.1.2 Table: users

Purpose: Platform users (admins, agents, staff)

```sql

CREATE TABLE dbo.users (
    -- Primary Key
    user_id BIGINT IDENTITY(1,1) NOT NULL,
    user_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    -- Multi-Tenant
    tenant_id BIGINT NOT NULL,
    
    -- Identity
    username VARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    -- Authentication
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    password_changed_at DATETIME2,
    must_change_password BIT DEFAULT 0,
    
    -- Personal Information
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    display_name NVARCHAR(255),
    profile_image_url NVARCHAR(500),
    
    -- Contact
    date_of_birth DATE,
    gender CHAR(1), -- 'M', 'F', 'O'
    
    -- Status
    user_type VARCHAR(50) NOT NULL, -- 'SUPER_ADMIN', 'TENANT_ADMIN', 'AGENT', 'STAFF'
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED'
    
    -- Security
    email_verified BIT DEFAULT 0,
    email_verified_at DATETIME2,
    phone_verified BIT DEFAULT 0,
    phone_verified_at DATETIME2,
    two_factor_enabled BIT DEFAULT 0,
    two_factor_secret VARCHAR(255),
    
    -- Session Management
    last_login_at DATETIME2,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME2,
    
    -- Preferences
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    preferences NVARCHAR(MAX), -- JSON
    
    -- Audit Fields
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by BIGINT,
    updated_by BIGINT,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2,
    row_version ROWVERSION,
    
    -- Constraints
    CONSTRAINT PK_users PRIMARY KEY CLUSTERED (user_id),
    CONSTRAINT UQ_users_uuid UNIQUE (user_uuid),
    CONSTRAINT UQ_users_username UNIQUE (username),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT CK_users_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED')),
    CONSTRAINT CK_users_type CHECK (user_type IN ('SUPER_ADMIN', 'ADMIN', 'AGENT', 'STAFF'))
);

-- Indexes
CREATE NONCLUSTERED INDEX IX_users_email ON dbo.users(email) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_users_status ON dbo.users(status) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_users_last_login ON dbo.users(last_login_at DESC);
```

#### 3.1.3 Table: roles
Purpose: Role-based access control

```sql

CREATE TABLE dbo.roles (
    role_id BIGINT IDENTITY(1,1) NOT NULL,
    role_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    role_name NVARCHAR(100) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    description NVARCHAR(500),
    
    is_system_role BIT DEFAULT 0, -- Cannot be deleted
    role_level INT DEFAULT 100, -- Hierarchy: 1 (highest) - 1000 (lowest)
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    is_deleted BIT NOT NULL DEFAULT 0,
    
    CONSTRAINT PK_roles PRIMARY KEY CLUSTERED (role_id),
    CONSTRAINT UQ_roles_uuid UNIQUE (role_uuid),
    CONSTRAINT UQ_roles_code UNIQUE (role_code)
);
```
#### 3.1.4 Table: permissions
Purpose: Granular permissions

```sql

CREATE TABLE dbo.permissions (
    permission_id BIGINT IDENTITY(1,1) NOT NULL,
    permission_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    permission_name NVARCHAR(100) NOT NULL,
    permission_code VARCHAR(100) NOT NULL, -- e.g., 'booking.create', 'user.delete'
    module VARCHAR(50) NOT NULL, -- 'BOOKING', 'USER', 'REPORT', etc.
    description NVARCHAR(500),
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    is_deleted BIT NOT NULL DEFAULT 0,
    
    CONSTRAINT PK_permissions PRIMARY KEY CLUSTERED (permission_id),
    CONSTRAINT UQ_permissions_code UNIQUE (permission_code)
);

CREATE NONCLUSTERED INDEX IX_permissions_module ON dbo.permissions(module) WHERE is_deleted = 0;
```
#### 3.1.5 Table: role_permissions
Purpose: Many-to-many relationship

```sql

CREATE TABLE dbo.role_permissions (
    role_permission_id BIGINT IDENTITY(1,1) NOT NULL,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    
    granted_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    granted_by BIGINT,
    
    CONSTRAINT PK_role_permissions PRIMARY KEY CLUSTERED (role_permission_id),
    CONSTRAINT UQ_role_permissions UNIQUE (role_id, permission_id),
    CONSTRAINT FK_role_permissions_role FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id),
    CONSTRAINT FK_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES dbo.permissions(permission_id)
);

CREATE NONCLUSTERED INDEX IX_role_permissions_role ON dbo.role_permissions(role_id);
CREATE NONCLUSTERED INDEX IX_role_permissions_permission ON dbo.role_permissions(permission_id);
```
#### 3.1.6 Table: user_roles
Purpose: Assign roles to users

```sql

CREATE TABLE dbo.user_roles (
    user_role_id BIGINT IDENTITY(1,1) NOT NULL,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    
    assigned_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    assigned_by BIGINT,
    expires_at DATETIME2, -- For temporary role assignments
    
    is_active BIT DEFAULT 1,
    
    CONSTRAINT PK_user_roles PRIMARY KEY CLUSTERED (user_role_id),
    CONSTRAINT UQ_user_roles UNIQUE (user_id, role_id),
    CONSTRAINT FK_user_roles_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT FK_user_roles_role FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id)
);

CREATE NONCLUSTERED INDEX IX_user_roles_user ON dbo.user_roles(user_id) WHERE is_active = 1;
```
#### 3.2 CUSTOMER MANAGEMENT
3.2.1 Table: customers
Purpose: End customers who book services

```SQL

CREATE TABLE dbo.customers (
    -- Primary Key
    customer_id BIGINT IDENTITY(1,1) NOT NULL,
    customer_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    customer_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    referred_by_user_id BIGINT, -- Agent/user who registered this customer
    
    -- Identity
    email NVARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    
    -- Authentication
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    
    -- Personal Information
    title VARCHAR(10), -- 'Mr', 'Ms', 'Mrs', 'Dr'
    first_name NVARCHAR(100) NOT NULL,
    middle_name NVARCHAR(100),
    last_name NVARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender CHAR(1), -- 'M', 'F', 'O'
    nationality VARCHAR(3), -- ISO 3166-1 alpha-3
    
    -- Document (Primary Identity)
    primary_id_type VARCHAR(50), -- 'PASSPORT', 'AADHAAR', 'PAN', 'DRIVING_LICENSE'
    primary_id_number VARCHAR(100),
    primary_id_issue_date DATE,
    primary_id_expiry_date DATE,
    primary_id_issue_country VARCHAR(3),
    
    -- Contact Address
    address_line1 NVARCHAR(500),
    address_line2 NVARCHAR(500),
    city NVARCHAR(100),
    state NVARCHAR(100),
    country VARCHAR(2) DEFAULT 'IN',
    postal_code VARCHAR(20),
    
    -- Preferences
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(3) DEFAULT 'INR',
    meal_preference VARCHAR(50), -- 'VEG', 'NON_VEG', 'VEGAN', 'HALAL', 'KOSHER'
    special_assistance NVARCHAR(500), -- Wheelchair, etc.
    
    -- Marketing
    marketing_consent BIT DEFAULT 0,
    newsletter_subscribed BIT DEFAULT 0,
    
    -- Customer Segmentation
    customer_type VARCHAR(50) DEFAULT 'RETAIL', -- 'RETAIL', 'CORPORATE', 'VIP'
    loyalty_tier VARCHAR(50) DEFAULT 'SILVER', -- 'SILVER', 'GOLD', 'PLATINUM'
    loyalty_points INT DEFAULT 0,
    
    -- Security
    email_verified BIT DEFAULT 0,
    email_verified_at DATETIME2,
    phone_verified BIT DEFAULT 0,
    phone_verified_at DATETIME2,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'BLOCKED'
    
    -- Activity
    last_login_at DATETIME2,
    last_booking_at DATETIME2,
    total_bookings INT DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    
    -- Audit Fields
    registered_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by BIGINT,
    updated_by BIGINT,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2,
    row_version ROWVERSION,
    
    -- Constraints
    CONSTRAINT PK_customers PRIMARY KEY CLUSTERED (customer_id),
    CONSTRAINT UQ_customers_uuid UNIQUE (customer_uuid),
    CONSTRAINT UQ_customers_email UNIQUE (email),
    CONSTRAINT UQ_customers_phone UNIQUE (phone),
    CONSTRAINT FK_customers_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(tenant_id),
    CONSTRAINT FK_customers_referred_by FOREIGN KEY (referred_by_user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT CK_customers_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED'))
);

-- Indexes
CREATE NONCLUSTERED INDEX IX_customers_tenant ON dbo.customers(tenant_id, status) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_customers_email ON dbo.customers(email) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_customers_phone ON dbo.customers(phone) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX IX_customers_registered_at ON dbo.customers(registered_at DESC);
CREATE NONCLUSTERED INDEX IX_customers_loyalty ON dbo.customers(loyalty_tier, loyalty_points DESC) WHERE is_deleted = 0;
```
#### 3.2.2 Table: travelers
Purpose: Passenger/guest information (can be customer or others)

```SQL

CREATE TABLE dbo.travelers (
    traveler_id BIGINT IDENTITY(1,1) NOT NULL,
    traveler_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    customer_id BIGINT NOT NULL, -- Owner of this traveler profile
    
    -- Personal Information
    title VARCHAR(10),
    first_name NVARCHAR(100) NOT NULL,
    middle_name NVARCHAR(100),
    last_name NVARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender CHAR(1),
    nationality VARCHAR(3),
    
    -- Contact (optional for non-primary travelers)
    email NVARCHAR(255),
    phone VARCHAR(20),
    
    -- Document
    document_type VARCHAR(50), -- 'PASSPORT', 'AADHAAR', 'PAN', 'BIRTH_CERTIFICATE'
    document_number VARCHAR(100),
    document_issue_date DATE,
    document_expiry_date DATE,
    document_issue_country VARCHAR(3),
    
    -- Travel Preferences
    meal_preference VARCHAR(50),
    seat_preference VARCHAR(50), -- 'WINDOW', 'AISLE', 'MIDDLE'
    special_assistance NVARCHAR(500),
    
    -- Frequent Flyer
    frequent_flyer_programs NVARCHAR(MAX), -- JSON: [{airline: 'AI', number: '123'}]
    
    -- Categorization
    traveler_type VARCHAR(50) DEFAULT 'ADULT', -- 'ADULT', 'CHILD', 'INFANT'
    is_primary BIT DEFAULT 0, -- Is this the customer themselves?
    
    -- Status
    is_active BIT DEFAULT 1,
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    is_deleted BIT NOT NULL DEFAULT 0,
    
    CONSTRAINT PK_travelers PRIMARY KEY CLUSTERED (traveler_id),
    CONSTRAINT UQ_travelers_uuid UNIQUE (traveler_uuid),
    CONSTRAINT FK_travelers_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id)
);

CREATE NONCLUSTERED INDEX IX_travelers_customer ON dbo.travelers(customer_id) WHERE is_deleted = 0;
```
#### 3.3 BOOKING MANAGEMENT
3.3.1 Table: bookings
Purpose: Master booking records (parent table for all booking types)

```SQL

CREATE TABLE dbo.bookings (
    -- Primary Key
    booking_id BIGINT IDENTITY(1,1) NOT NULL,
    booking_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    -- Booking Reference
    booking_reference VARCHAR(20) NOT NULL, -- Unique booking number (e.g., 'BKG2025012345')
    pnr VARCHAR(20), -- Supplier PNR (from third-party API)
    
    -- Customer & User
    customer_id BIGINT NOT NULL,
    booked_by_user_id BIGINT, -- Agent/staff who created booking
    
    -- Booking Type
    booking_type VARCHAR(50) NOT NULL, -- 'FLIGHT', 'HOTEL', 'BUS', 'PACKAGE'
    booking_source VARCHAR(50) DEFAULT 'WEB', -- 'WEB', 'MOBILE', 'API', 'AGENT'
    
    -- Journey Details
    origin_code VARCHAR(10), -- Airport/city code (e.g., 'DEL', 'BOM')
    destination_code VARCHAR(10),
    journey_type VARCHAR(50), -- 'ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'
    
    -- Dates
    travel_start_date DATETIME2 NOT NULL,
    travel_end_date DATETIME2,
    
    -- Passengers
    total_travelers INT NOT NULL DEFAULT 1,
    adults_count INT DEFAULT 1,
    children_count INT DEFAULT 0,
    infants_count INT DEFAULT 0,
    
    -- Pricing (in customer's currency)
    currency VARCHAR(3) DEFAULT 'INR',
    base_fare DECIMAL(15,2) NOT NULL,
    taxes DECIMAL(15,2) DEFAULT 0,
    fees DECIMAL(15,2) DEFAULT 0, -- Service fees, convenience fees
    discounts DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Agent Commission
    commission_amount DECIMAL(15,2) DEFAULT 0,
    commission_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Payment
    payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', 
    -- 'PENDING', 'AUTHORIZED', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'
    paid_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Booking Status
    booking_status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
    -- 'INITIATED', 'PENDING_PAYMENT', 'CONFIRMED', 'TICKETED', 'CANCELLED', 'FAILED', 'EXPIRED'
    
    -- Supplier/API Details
    supplier_code VARCHAR(50), -- Third-party API provider code
    supplier_booking_id VARCHAR(100), -- Supplier's booking reference
    supplier_response NVARCHAR(MAX), -- JSON response from supplier
    
    -- Confirmation
    confirmation_number VARCHAR(50),
    ticket_numbers NVARCHAR(MAX), -- JSON array of ticket numbers
    
    -- Cancellation
    is_cancellable BIT DEFAULT 1,
    cancellation_deadline DATETIME2,
    cancellation_charges DECIMAL(15,2) DEFAULT 0,
    cancelled_at DATETIME2,
    cancellation_reason NVARCHAR(500),
    
    -- Refund
    refund_amount DECIMAL(15,2) DEFAULT 0,
    refund_status VARCHAR(50), -- 'NOT_INITIATED', 'PENDING', 'PROCESSED', 'REJECTED'
    refunded_at DATETIME2,
    
    -- Contact Information (for booking communication)
    contact_email NVARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    
    -- Special Requests
    special_requests NVARCHAR(MAX),
    
    -- Timestamps
    booking_date DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    confirmed_at DATETIME2,
    ticketed_at DATETIME2,
    
    -- Expiry (for pending payments)
    expires_at DATETIME2,
    
    -- Audit Fields
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by BIGINT,
    updated_by BIGINT,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2,
    row_version ROWVERSION,
    
    -- Constraints
    CONSTRAINT PK_bookings PRIMARY KEY CLUSTERED (booking_id),
    CONSTRAINT UQ_bookings_uuid UNIQUE (booking_uuid),
    CONSTRAINT UQ_bookings_reference UNIQUE (booking_reference),
    CONSTRAINT FK_bookings_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id),
    CONSTRAINT FK_bookings_booked_by FOREIGN KEY (booked_by_user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT CK_bookings_type CHECK (booking_type IN ('FLIGHT', 'HOTEL', 'BUS', 'PACKAGE')),
    CONSTRAINT CK_bookings_status CHECK (booking_status IN ('INITIATED', 'PENDING_PAYMENT', 'CONFIRMED', 'TICKETED', 'CANCELLED', 'FAILED', 'EXPIRED')),
    CONSTRAINT CK_bookings_payment_status CHECK (payment_status IN ('PENDING', 'AUTHORIZED', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'))
);

-- Indexes (Critical for Performance)
CREATE NONCLUSTERED INDEX IX_bookings_user_status ON dbo.bookings(booked_by_user_id, booking_status, booking_date DESC) 
    INCLUDE (total_amount, payment_status) WHERE is_deleted = 0;

CREATE NONCLUSTERED INDEX IX_bookings_customer ON dbo.bookings(customer_id, booking_date DESC) WHERE is_deleted = 0;

CREATE NONCLUSTERED INDEX IX_bookings_reference ON dbo.bookings(booking_reference) WHERE is_deleted = 0;

CREATE NONCLUSTERED INDEX IX_bookings_travel_dates ON dbo.bookings(travel_start_date, travel_end_date) WHERE is_deleted = 0;

CREATE NONCLUSTERED INDEX IX_bookings_pnr ON dbo.bookings(pnr) WHERE pnr IS NOT NULL AND is_deleted = 0;

CREATE NONCLUSTERED INDEX IX_bookings_payment_status ON dbo.bookings(payment_status, booking_date DESC) 
    WHERE payment_status IN ('PENDING', 'PARTIALLY_PAID') AND is_deleted = 0;

-- Columnstore Index for Analytics
CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_bookings_analytics 
    ON dbo.bookings(booking_date, booked_by_user_id, booking_type, booking_status, total_amount, commission_amount);
```
#### 3.3.2 Table: booking_travelers
Purpose: Link travelers to bookings (many-to-many)

```SQL

CREATE TABLE dbo.booking_travelers (
    booking_traveler_id BIGINT IDENTITY(1,1) NOT NULL,
    
    booking_id BIGINT NOT NULL,
    traveler_id BIGINT NOT NULL,
    
    -- Traveler Type for this booking
    traveler_type VARCHAR(50) NOT NULL, -- 'ADULT', 'CHILD', 'INFANT'
    
    -- Ticket Details
    ticket_number VARCHAR(50),
    seat_number VARCHAR(10),
    
    -- Meal & Preferences (can override traveler defaults)
    meal_preference VARCHAR(50),
    special_requests NVARCHAR(500),
    
    -- Baggage
    baggage_allowance VARCHAR(50),
    extra_baggage_purchased VARCHAR(50),
    
    -- Service-specific fields
    service_details NVARCHAR(MAX), -- JSON for service-specific data
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_booking_travelers PRIMARY KEY CLUSTERED (booking_traveler_id),
    CONSTRAINT UQ_booking_travelers UNIQUE (booking_id, traveler_id),
    CONSTRAINT FK_booking_travelers_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id) ON DELETE CASCADE,
    CONSTRAINT FK_booking_travelers_traveler FOREIGN KEY (traveler_id) REFERENCES dbo.travelers(traveler_id)
);

CREATE NONCLUSTERED INDEX IX_booking_travelers_booking ON dbo.booking_travelers(booking_id);
CREATE NONCLUSTERED INDEX IX_booking_travelers_traveler ON dbo.booking_travelers(traveler_id);
```
#### 3.4 FLIGHT-SPECIFIC TABLES
3.4.1 Table: flight_bookings
Purpose: Flight-specific booking details

``` SQL

CREATE TABLE dbo.flight_bookings (
    flight_booking_id BIGINT IDENTITY(1,1) NOT NULL,
    booking_id BIGINT NOT NULL, -- FK to master bookings table
    
    -- Flight Details
    airline_code VARCHAR(10) NOT NULL, -- IATA code (e.g., 'AI', '6E')
    airline_name NVARCHAR(255) NOT NULL,
    flight_number VARCHAR(20) NOT NULL, -- e.g., 'AI101'
    
    -- Route
    origin_airport VARCHAR(10) NOT NULL, -- IATA code
    origin_city NVARCHAR(100),
    origin_country VARCHAR(2),
    destination_airport VARCHAR(10) NOT NULL,
    destination_city NVARCHAR(100),
    destination_country VARCHAR(2),
    
    -- Schedule
    departure_datetime DATETIME2 NOT NULL,
    arrival_datetime DATETIME2 NOT NULL,
    flight_duration_minutes INT,
    
    -- Aircraft
    aircraft_type VARCHAR(50),
    aircraft_code VARCHAR(10),
    
    -- Cabin & Class
    cabin_class VARCHAR(50) NOT NULL, -- 'ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'
    booking_class VARCHAR(10), -- Fare class (e.g., 'Y', 'J', 'F')
    
    -- Fare Details
    fare_type VARCHAR(50), -- 'REGULAR', 'SPECIAL', 'STUDENT', 'SENIOR_CITIZEN'
    fare_basis_code VARCHAR(50),
    
    -- Baggage
    baggage_allowance VARCHAR(100), -- e.g., '15 KG'
    cabin_baggage VARCHAR(100), -- e.g., '7 KG'
    
    -- Journey Type
    segment_type VARCHAR(50), -- 'OUTBOUND', 'RETURN', 'MULTI_CITY_1', etc.
    segment_number INT DEFAULT 1,
    
    -- Stops
    is_direct BIT DEFAULT 1,
    stops_count INT DEFAULT 0,
    layover_airports NVARCHAR(500), -- Comma-separated
    
    -- Status
    flight_status VARCHAR(50) DEFAULT 'SCHEDULED', 
    -- 'SCHEDULED', 'DELAYED', 'CANCELLED', 'DEPARTED', 'ARRIVED'
    
    -- Check-in
    web_checkin_available BIT DEFAULT 1,
    checkin_url NVARCHAR(500),
    
    -- Terminal & Gate
    departure_terminal VARCHAR(10),
    arrival_terminal VARCHAR(10),
    boarding_gate VARCHAR(10),
    
    -- Supplier Data
    supplier_segment_id VARCHAR(100),
    supplier_data NVARCHAR(MAX), -- JSON
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_flight_bookings PRIMARY KEY CLUSTERED (flight_booking_id),
    CONSTRAINT FK_flight_bookings_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX IX_flight_bookings_booking ON dbo.flight_bookings(booking_id);
CREATE NONCLUSTERED INDEX IX_flight_bookings_route_date ON dbo.flight_bookings(origin_airport, destination_airport, departure_datetime);
CREATE NONCLUSTERED INDEX IX_flight_bookings_airline ON dbo.flight_bookings(airline_code, flight_number, departure_datetime);
```
#### 3.5 HOTEL-SPECIFIC TABLES
3.5.1 Table: hotel_bookings
Purpose: Hotel booking details

``` SQL

CREATE TABLE dbo.hotel_bookings (
    hotel_booking_id BIGINT IDENTITY(1,1) NOT NULL,
    booking_id BIGINT NOT NULL,
    
    -- Hotel Details
    hotel_code VARCHAR(50) NOT NULL,
    hotel_name NVARCHAR(255) NOT NULL,
    hotel_chain NVARCHAR(100),
    star_rating DECIMAL(2,1), -- 3.5, 4.0, 5.0, etc.
    
    -- Location
    address_line1 NVARCHAR(500),
    address_line2 NVARCHAR(500),
    city NVARCHAR(100) NOT NULL,
    state NVARCHAR(100),
    country VARCHAR(2) NOT NULL,
    postal_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Contact
    hotel_phone VARCHAR(20),
    hotel_email NVARCHAR(255),
    
    -- Booking Details
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights_count INT NOT NULL,
    
    -- Room Details
    room_count INT DEFAULT 1,
    room_type NVARCHAR(100), -- 'Deluxe', 'Suite', etc.
    room_category VARCHAR(50), -- 'STANDARD', 'DELUXE', 'SUITE'
    bed_type VARCHAR(50), -- 'SINGLE', 'DOUBLE', 'TWIN', 'KING'
    
    -- Occupancy
    adults_per_room INT DEFAULT 2,
    children_per_room INT DEFAULT 0,
    
    -- Amenities & Facilities
    meal_plan VARCHAR(50), -- 'EP', 'CP', 'MAP', 'AP' (Breakfast, Half-board, Full-board)
    amenities NVARCHAR(MAX), -- JSON array
    
    -- Policies
    cancellation_policy NVARCHAR(MAX),
    check_in_time TIME,
    check_out_time TIME,
    
    -- Special Requests
    special_requests NVARCHAR(MAX),
    
    -- Confirmation
    hotel_confirmation_number VARCHAR(100),
    
    -- Supplier Data
    supplier_hotel_id VARCHAR(100),
    supplier_data NVARCHAR(MAX), -- JSON
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_hotel_bookings PRIMARY KEY CLUSTERED (hotel_booking_id),
    CONSTRAINT FK_hotel_bookings_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX IX_hotel_bookings_booking ON dbo.hotel_bookings(booking_id);
CREATE NONCLUSTERED INDEX IX_hotel_bookings_dates ON dbo.hotel_bookings(check_in_date, check_out_date);
CREATE NONCLUSTERED INDEX IX_hotel_bookings_location ON dbo.hotel_bookings(city, country);
```
#### 3.6 BUS-SPECIFIC TABLES
3.6.1 Table: bus_bookings
Purpose: Bus booking details

``` SQL

CREATE TABLE dbo.bus_bookings (
    bus_booking_id BIGINT IDENTITY(1,1) NOT NULL,
    booking_id BIGINT NOT NULL,
    
    -- Operator Details
    operator_code VARCHAR(50) NOT NULL,
    operator_name NVARCHAR(255) NOT NULL,
    
    -- Bus Details
    bus_number VARCHAR(50),
    bus_type VARCHAR(50), -- 'AC', 'NON_AC', 'SLEEPER', 'SEMI_SLEEPER', 'SEATER'
    bus_category VARCHAR(50), -- 'STANDARD', 'DELUXE', 'VOLVO', 'LUXURY'
    
    -- Route
    boarding_point NVARCHAR(255) NOT NULL,
    boarding_point_address NVARCHAR(500),
    boarding_city NVARCHAR(100),
    
    dropping_point NVARCHAR(255) NOT NULL,
    dropping_point_address NVARCHAR(500),
    dropping_city NVARCHAR(100),
    
    -- Schedule
    departure_datetime DATETIME2 NOT NULL,
    arrival_datetime DATETIME2 NOT NULL,
    journey_duration_minutes INT,
    
    -- Seats
    total_seats_booked INT DEFAULT 1,
    seat_numbers NVARCHAR(200), -- Comma-separated: 'A1, A2, B3'
    
    -- Amenities
    amenities NVARCHAR(MAX), -- JSON: WiFi, Charging, Water, etc.
    
    -- Contact
    boarding_point_contact VARCHAR(20),
    
    -- Cancellation
    cancellation_policy NVARCHAR(MAX),
    
    -- Supplier Data
    supplier_ticket_id VARCHAR(100),
    supplier_data NVARCHAR(MAX), -- JSON
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_bus_bookings PRIMARY KEY CLUSTERED (bus_booking_id),
    CONSTRAINT FK_bus_bookings_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX IX_bus_bookings_booking ON dbo.bus_bookings(booking_id);
CREATE NONCLUSTERED INDEX IX_bus_bookings_route_date ON dbo.bus_bookings(boarding_city, dropping_city, departure_datetime);
```
#### 3.7 PAYMENT & FINANCIAL TABLES
3.7.1 Table: payments
Purpose: Payment transaction records

```SQL

CREATE TABLE dbo.payments (
    payment_id BIGINT IDENTITY(1,1) NOT NULL,
    payment_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    -- Booking Reference
    booking_id BIGINT NOT NULL,
    
    -- Payment Details
    payment_reference VARCHAR(100) NOT NULL, -- Internal reference
    transaction_id VARCHAR(100), -- Gateway transaction ID
    
    -- Amount
    currency VARCHAR(3) DEFAULT 'INR',
    amount DECIMAL(15,2) NOT NULL,
    
    -- Payment Method
    payment_method VARCHAR(50) NOT NULL, 
    -- 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'UPI', 'WALLET', 'CASH', 'BANK_TRANSFER'
    
    -- Payment Gateway
    payment_gateway VARCHAR(50), -- 'RAZORPAY', 'PAYU', 'STRIPE', 'PAYPAL'
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    
    -- Card Details (masked)
    card_type VARCHAR(20), -- 'VISA', 'MASTERCARD', 'AMEX', 'RUPAY'
    card_last_four VARCHAR(4),
    card_brand VARCHAR(50),
    
    -- Bank Details (for net banking/UPI)
    bank_name NVARCHAR(100),
    upi_id VARCHAR(100),
    
    -- Status
    payment_status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
    -- 'INITIATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'
    
    -- Timestamps
    initiated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    authorized_at DATETIME2,
    captured_at DATETIME2,
    failed_at DATETIME2,
    
    -- Response
    gateway_response NVARCHAR(MAX), -- JSON
    error_code VARCHAR(50),
    error_message NVARCHAR(500),
    
    -- Reconciliation
    is_reconciled BIT DEFAULT 0,
    reconciled_at DATETIME2,
    settlement_date DATE,
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_payments PRIMARY KEY CLUSTERED (payment_id),
    CONSTRAINT UQ_payments_uuid UNIQUE (payment_uuid),
    CONSTRAINT UQ_payments_reference UNIQUE (payment_reference),
    CONSTRAINT FK_payments_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id),
    CONSTRAINT CK_payments_status CHECK (payment_status IN ('INITIATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'))
);

CREATE NONCLUSTERED INDEX IX_payments_booking ON dbo.payments(booking_id);
CREATE NONCLUSTERED INDEX IX_payments_status ON dbo.payments(payment_status, created_at DESC);
CREATE NONCLUSTERED INDEX IX_payments_transaction ON dbo.payments(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_payments_reconciliation ON dbo.payments(is_reconciled, settlement_date) WHERE payment_status = 'SUCCESS';
```
#### 3.7.2 Table: refunds
Purpose: Refund transactions

```SQL

CREATE TABLE dbo.refunds (
    refund_id BIGINT IDENTITY(1,1) NOT NULL,
    refund_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    -- References
    booking_id BIGINT NOT NULL,
    payment_id BIGINT NOT NULL,
    
    -- Refund Details
    refund_reference VARCHAR(100) NOT NULL,
    gateway_refund_id VARCHAR(100),
    
    -- Amount
    currency VARCHAR(3) DEFAULT 'INR',
    refund_amount DECIMAL(15,2) NOT NULL,
    cancellation_charges DECIMAL(15,2) DEFAULT 0,
    net_refund_amount DECIMAL(15,2) NOT NULL,
    
    -- Reason
    refund_reason VARCHAR(50) NOT NULL, 
    -- 'CUSTOMER_REQUEST', 'CANCELLATION', 'SERVICE_FAILURE', 'DUPLICATE_PAYMENT', 'FRAUD'
    refund_notes NVARCHAR(500),
    
    -- Status
    refund_status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
    -- 'INITIATED', 'PENDING', 'PROCESSED', 'SUCCESS', 'FAILED', 'REJECTED'
    
    -- Processing
    initiated_by BIGINT, -- User who initiated refund
    approved_by BIGINT,
    processed_at DATETIME2,
    
    -- Refund Mode
    refund_mode VARCHAR(50), -- 'ORIGINAL_SOURCE', 'BANK_TRANSFER', 'WALLET'
    
    -- Gateway Response
    gateway_response NVARCHAR(MAX), -- JSON
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_refunds PRIMARY KEY CLUSTERED (refund_id),
    CONSTRAINT UQ_refunds_uuid UNIQUE (refund_uuid),
    CONSTRAINT UQ_refunds_reference UNIQUE (refund_reference),
    CONSTRAINT FK_refunds_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id),
    CONSTRAINT FK_refunds_payment FOREIGN KEY (payment_id) REFERENCES dbo.payments(payment_id),
    CONSTRAINT CK_refunds_status CHECK (refund_status IN ('INITIATED', 'PENDING', 'PROCESSED', 'SUCCESS', 'FAILED', 'REJECTED'))
);

CREATE NONCLUSTERED INDEX IX_refunds_booking ON dbo.refunds(booking_id);
CREATE NONCLUSTERED INDEX IX_refunds_payment ON dbo.refunds(payment_id);
CREATE NONCLUSTERED INDEX IX_refunds_status ON dbo.refunds(refund_status, created_at DESC);
```
#### 3.7.3 Table: commissions
Purpose: Track agent commissions

```SQL

CREATE TABLE dbo.commissions (
    commission_id BIGINT IDENTITY(1,1) NOT NULL,
    commission_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    -- Agent & Booking
    user_id BIGINT NOT NULL, -- Specific agent/user who earned this
    booking_id BIGINT NOT NULL,
    
    -- Commission Details
    booking_type VARCHAR(50) NOT NULL, -- 'FLIGHT', 'HOTEL', 'BUS'
    
    -- Calculation
    base_amount DECIMAL(15,2) NOT NULL, -- Amount on which commission is calculated
    commission_percentage DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(15,2) NOT NULL,
    
    -- Additional Incentives
    incentive_amount DECIMAL(15,2) DEFAULT 0,
    total_commission DECIMAL(15,2) NOT NULL,
    
    -- Tax
    tds_percentage DECIMAL(5,2) DEFAULT 0, -- Tax Deducted at Source
    tds_amount DECIMAL(15,2) DEFAULT 0,
    net_commission DECIMAL(15,2) NOT NULL,
    
    -- Status
    commission_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    -- 'PENDING', 'APPROVED', 'PAID', 'CANCELLED', 'REVERSED'
    
    -- Settlement
    settlement_cycle VARCHAR(50), -- 'WEEKLY', 'MONTHLY', 'QUARTERLY'
    settlement_date DATE,
    settlement_reference VARCHAR(100),
    paid_at DATETIME2,
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_commissions PRIMARY KEY CLUSTERED (commission_id),
    CONSTRAINT UQ_commissions_uuid UNIQUE (commission_uuid),
    CONSTRAINT FK_commissions_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id),
    CONSTRAINT FK_commissions_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT CK_commissions_status CHECK (commission_status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED', 'REVERSED'))
);

CREATE NONCLUSTERED INDEX IX_commissions_user ON dbo.commissions(user_id, commission_status, created_at DESC);
CREATE NONCLUSTERED INDEX IX_commissions_settlement ON dbo.commissions(settlement_date, commission_status) WHERE commission_status = 'APPROVED';
CREATE NONCLUSTERED INDEX IX_commissions_booking ON dbo.commissions(booking_id);
```


---

### 3.8 INVOICING & BILLING

#### 3.8.1 Table: `invoices`
**Purpose**: Tax invoices for bookings

```sql
CREATE TABLE dbo.invoices (
    invoice_id BIGINT IDENTITY(1,1) NOT NULL,
    invoice_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    
    -- References
    booking_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    
    -- Invoice Details
    invoice_number VARCHAR(50) NOT NULL, -- INV-2025-00001
    invoice_date DATE NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    due_date DATE,
    
    -- Financial Year (for Indian compliance)
    financial_year VARCHAR(10), -- '2024-25'
    
    -- Billing Address
    bill_to_name NVARCHAR(255) NOT NULL,
    bill_to_email NVARCHAR(255),
    bill_to_phone VARCHAR(20),
    bill_to_address NVARCHAR(MAX), -- JSON or text
    bill_to_gstin VARCHAR(15), -- GST Identification Number (India)
    bill_to_pan VARCHAR(10), -- PAN (India)
    
    -- Service Provider (Agent/Company)
    bill_from_name NVARCHAR(255) NOT NULL,
    bill_from_address NVARCHAR(MAX),
    bill_from_gstin VARCHAR(15),
    bill_from_pan VARCHAR(10),
    
    -- Amount Breakup
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Base Fare
    base_fare DECIMAL(15,2) NOT NULL,
    
    -- Taxes (Indian Tax Structure)
    cgst_percentage DECIMAL(5,2) DEFAULT 0, -- Central GST
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_percentage DECIMAL(5,2) DEFAULT 0, -- State GST
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_percentage DECIMAL(5,2) DEFAULT 0, -- Integrated GST (inter-state)
    igst_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Other Charges
    service_fee DECIMAL(15,2) DEFAULT 0,
    convenience_fee DECIMAL(15,2) DEFAULT 0,
    other_charges DECIMAL(15,2) DEFAULT 0,
    
    -- Discounts
    discount_amount DECIMAL(15,2) DEFAULT 0,
    discount_description NVARCHAR(255),
    
    -- Total
    subtotal DECIMAL(15,2) NOT NULL,
    total_tax DECIMAL(15,2) NOT NULL,
    grand_total DECIMAL(15,2) NOT NULL,
    
    -- Payment
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    -- 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'
    amount_paid DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) NOT NULL,
    
    -- Invoice Type
    invoice_type VARCHAR(50) DEFAULT 'TAX_INVOICE', 
    -- 'TAX_INVOICE', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE'
    
    -- Credit/Debit Note References
    original_invoice_id BIGINT, -- For credit/debit notes
    
    -- Status
    invoice_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    -- 'DRAFT', 'SENT', 'VIEWED', 'PAID', 'CANCELLED'
    
    -- File Storage
    pdf_url NVARCHAR(500), -- S3/Azure Blob URL
    pdf_generated_at DATETIME2,
    
    -- Terms & Conditions
    terms_and_conditions NVARCHAR(MAX),
    notes NVARCHAR(MAX),
    
    -- Email Tracking
    email_sent BIT DEFAULT 0,
    email_sent_at DATETIME2,
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by BIGINT,
    is_deleted BIT NOT NULL DEFAULT 0,
    
    CONSTRAINT PK_invoices PRIMARY KEY CLUSTERED (invoice_id),
    CONSTRAINT UQ_invoices_uuid UNIQUE (invoice_uuid),
    CONSTRAINT UQ_invoices_number UNIQUE (invoice_number),
    CONSTRAINT FK_invoices_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id),
    CONSTRAINT FK_invoices_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id),
    CONSTRAINT FK_invoices_original FOREIGN KEY (original_invoice_id) REFERENCES dbo.invoices(invoice_id),
    CONSTRAINT CK_invoices_status CHECK (invoice_status IN ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'CANCELLED')),
    CONSTRAINT CK_invoices_payment_status CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'))
);

CREATE NONCLUSTERED INDEX IX_invoices_booking ON dbo.invoices(booking_id);
CREATE NONCLUSTERED INDEX IX_invoices_customer ON dbo.invoices(customer_id, invoice_date DESC);
CREATE NONCLUSTERED INDEX IX_invoices_payment_status ON dbo.invoices(payment_status, due_date) WHERE payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE');
CREATE NONCLUSTERED INDEX IX_invoices_financial_year ON dbo.invoices(financial_year) WHERE is_deleted = 0;


```
### 3.9 FLIGHT SEARCH & INVENTORY MANAGEMENT
#### 3.9.1 Table: flight_search_cache
Purpose: Cache flight search results from third-party APIs

``` SQL

CREATE TABLE dbo.flight_search_cache (
    search_cache_id BIGINT IDENTITY(1,1) NOT NULL,
    search_key VARCHAR(255) NOT NULL, -- MD5/SHA hash of search parameters
    
    -- Search Parameters
    origin VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE,
    journey_type VARCHAR(20) NOT NULL, -- 'ONE_WAY', 'ROUND_TRIP'
    adults_count INT DEFAULT 1,
    children_count INT DEFAULT 0,
    infants_count INT DEFAULT 0,
    cabin_class VARCHAR(50) DEFAULT 'ECONOMY',
    
    -- Supplier Info
    supplier_code VARCHAR(50) NOT NULL,
    
    -- Search Results (JSON)
    search_results NVARCHAR(MAX) NOT NULL, -- JSON array of flights
    results_count INT DEFAULT 0,
    
    -- Pricing
    min_price DECIMAL(15,2),
    max_price DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Cache Management
    searched_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    expires_at DATETIME2 NOT NULL, -- Cache expiry (typically 5-15 minutes)
    
    -- Performance
    api_response_time_ms INT, -- Track API performance
    
    CONSTRAINT PK_flight_search_cache PRIMARY KEY CLUSTERED (search_cache_id),
    CONSTRAINT UQ_flight_search_key UNIQUE (search_key)
);

-- Indexes
CREATE NONCLUSTERED INDEX IX_flight_search_cache_route_date 
    ON dbo.flight_search_cache(origin, destination, departure_date, expires_at)
    WHERE expires_at > GETUTCDATE();

CREATE NONCLUSTERED INDEX IX_flight_search_cache_expiry 
    ON dbo.flight_search_cache(expires_at);

-- Auto cleanup of expired cache (can be done via scheduled job)
-- DELETE FROM dbo.flight_search_cache WHERE expires_at < DATEADD(HOUR, -1, GETUTCDATE());

```

### 3.9.2 Table: flight_fare_rules
Purpose: Store fare rules and cancellation policies

```sql

CREATE TABLE dbo.flight_fare_rules (
    fare_rule_id BIGINT IDENTITY(1,1) NOT NULL,
    
    -- Reference
    booking_id BIGINT NOT NULL,
    flight_booking_id BIGINT NOT NULL,
    
    -- Fare Information
    fare_basis_code VARCHAR(50),
    fare_type VARCHAR(50), -- 'REFUNDABLE', 'NON_REFUNDABLE', 'PARTIALLY_REFUNDABLE'
    
    -- Cancellation Rules
    is_cancellable BIT DEFAULT 1,
    cancellation_allowed_until DATETIME2, -- Deadline for cancellation
    
    -- Cancellation Charges (Time-based)
    cancellation_rules NVARCHAR(MAX), -- JSON array of rules
    /* Example JSON:
    [
        {"hours_before_departure": 72, "charge_type": "PERCENTAGE", "charge_value": 10},
        {"hours_before_departure": 24, "charge_type": "PERCENTAGE", "charge_value": 50},
        {"hours_before_departure": 2, "charge_type": "FIXED", "charge_value": 0, "note": "No refund"}
    ]
    */
    
    -- Date Change Rules
    is_date_changeable BIT DEFAULT 1,
    date_change_allowed_until DATETIME2,
    date_change_fee DECIMAL(15,2) DEFAULT 0,
    date_change_rules NVARCHAR(MAX), -- JSON
    
    -- Baggage Rules
    baggage_rules NVARCHAR(MAX), -- JSON
    /* Example:
    {
        "check_in": {"pieces": 1, "weight_kg": 15, "dimensions": "158cm"},
        "cabin": {"pieces": 1, "weight_kg": 7, "dimensions": "115cm"}
    }
    */
    
    -- Seat Selection
    seat_selection_allowed BIT DEFAULT 1,
    seat_selection_fee DECIMAL(15,2) DEFAULT 0,
    
    -- Meal Selection
    meal_selection_allowed BIT DEFAULT 1,
    meal_options NVARCHAR(MAX), -- JSON
    
    -- Other Terms
    terms_and_conditions NVARCHAR(MAX),
    
    -- Supplier Data
    supplier_fare_rules NVARCHAR(MAX), -- Original JSON from supplier
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_flight_fare_rules PRIMARY KEY CLUSTERED (fare_rule_id),
    CONSTRAINT FK_flight_fare_rules_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(booking_id),
    CONSTRAINT FK_flight_fare_rules_flight FOREIGN KEY (flight_booking_id) REFERENCES dbo.flight_bookings(flight_booking_id)
);

CREATE NONCLUSTERED INDEX IX_flight_fare_rules_booking ON dbo.flight_fare_rules(booking_id);
CREATE NONCLUSTERED INDEX IX_flight_fare_rules_flight ON dbo.flight_fare_rules(flight_booking_id);
```

#### 3.9.3 Table: airlines
Purpose: Master data for airlines

```sql
CREATE TABLE dbo.airlines (
    airline_id BIGINT IDENTITY(1,1) NOT NULL,
    
    -- Airline Codes
    iata_code VARCHAR(3) NOT NULL, -- 2-letter IATA code (e.g., 'AI', '6E')
    icao_code VARCHAR(4), -- 4-letter ICAO code (e.g., 'AIC', 'IGO')
    
    -- Airline Details
    airline_name NVARCHAR(255) NOT NULL,
    airline_name_local NVARCHAR(255), -- Local language name
    country VARCHAR(2) NOT NULL, -- ISO country code
    
    -- Contact
    website NVARCHAR(500),
    customer_care_phone VARCHAR(50),
    customer_care_email NVARCHAR(255),
    
    -- Logo & Branding
    logo_url NVARCHAR(500),
    
    -- Type
    airline_type VARCHAR(50) DEFAULT 'FULL_SERVICE', 
    -- 'FULL_SERVICE', 'LOW_COST', 'REGIONAL', 'CHARTER'
    
    -- Alliance
    alliance VARCHAR(50), -- 'STAR_ALLIANCE', 'ONE_WORLD', 'SKYTEAM', null
    
    -- Status
    is_active BIT DEFAULT 1,
    is_international BIT DEFAULT 0,
    
    -- Metadata
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_airlines PRIMARY KEY CLUSTERED (airline_id),
    CONSTRAINT UQ_airlines_iata UNIQUE (iata_code),
    CONSTRAINT UQ_airlines_icao UNIQUE (icao_code)
);

CREATE NONCLUSTERED INDEX IX_airlines_country ON dbo.airlines(country) WHERE is_active = 1;
CREATE NONCLUSTERED INDEX IX_airlines_type ON dbo.airlines(airline_type) WHERE is_active = 1;
```

#### 3.9.4 Table: airports
Purpose: Master data for airports

```sql
CREATE TABLE dbo.airports (
    airport_id BIGINT IDENTITY(1,1) NOT NULL,
    
    -- Airport Codes
    iata_code VARCHAR(3) NOT NULL, -- 3-letter IATA code (e.g., 'DEL', 'BOM')
    icao_code VARCHAR(4), -- 4-letter ICAO code (e.g., 'VIDP', 'VABB')
    
    -- Airport Details
    airport_name NVARCHAR(255) NOT NULL,
    airport_name_local NVARCHAR(255),
    
    -- Location
    city NVARCHAR(100) NOT NULL,
    city_code VARCHAR(10), -- Some cities have multiple airports
    state NVARCHAR(100),
    country VARCHAR(2) NOT NULL, -- ISO country code
    country_name NVARCHAR(100),
    
    -- Geography
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    elevation_meters INT,
    timezone VARCHAR(50), -- e.g., 'Asia/Kolkata'
    
    -- Airport Type
    airport_type VARCHAR(50) DEFAULT 'INTERNATIONAL',
    -- 'INTERNATIONAL', 'DOMESTIC', 'REGIONAL', 'HELIPORT'
    
    -- Terminals
    terminals_count INT DEFAULT 1,
    
    -- Status
    is_active BIT DEFAULT 1,
    is_international BIT DEFAULT 1,
    
    -- Metadata
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_airports PRIMARY KEY CLUSTERED (airport_id),
    CONSTRAINT UQ_airports_iata UNIQUE (iata_code),
    CONSTRAINT UQ_airports_icao UNIQUE (icao_code)
);

CREATE NONCLUSTERED INDEX IX_airports_city ON dbo.airports(city, country) WHERE is_active = 1;
CREATE NONCLUSTERED INDEX IX_airports_country ON dbo.airports(country) WHERE is_active = 1;
CREATE NONCLUSTERED INDEX IX_airports_type ON dbo.airports(airport_type) WHERE is_active = 1;

-- Full-text search index for airport search
CREATE FULLTEXT CATALOG ft_catalog AS DEFAULT;
CREATE FULLTEXT INDEX ON dbo.airports(airport_name, city, city_code)
    KEY INDEX UQ_airports_iata;
```

### 3.10 NOTIFICATIONS & COMMUNICATIONS

#### 3.10.1 Table: notifications
Purpose: In-app notifications for users

```sql
CREATE TABLE dbo.notifications (
    notification_id BIGINT IDENTITY(1,1) NOT NULL,
    notification_uuid UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    

    -- Recipient
    user_id BIGINT, -- For agents/staff
    customer_id BIGINT, -- For customers
    
    -- Notification Details
    notification_type VARCHAR(50) NOT NULL,
    /* Types:
        'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED',
        'FLIGHT_DELAYED', 'FLIGHT_CANCELLED', 'CHECKIN_REMINDER', 'REFUND_PROCESSED',
        'COMMISSION_EARNED', 'ACCOUNT_VERIFICATION', 'SYSTEM_ALERT'
    */
    
    title NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    
    -- References
    reference_type VARCHAR(50), -- 'BOOKING', 'PAYMENT', 'COMMISSION'
    reference_id BIGINT,
    
    -- Action/Deep Link
    action_url NVARCHAR(500), -- Link to relevant page
    action_label NVARCHAR(100), -- e.g., 'View Booking'
    
    -- Status
    is_read BIT DEFAULT 0,
    read_at DATETIME2,
    
    -- Channel
    channel VARCHAR(50) DEFAULT 'IN_APP', -- 'IN_APP', 'EMAIL', 'SMS', 'PUSH'
    
    -- Metadata
    metadata NVARCHAR(MAX), -- JSON for additional data
    
    -- Scheduling
    scheduled_for DATETIME2, -- For scheduled notifications
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    expires_at DATETIME2, -- Auto-delete after expiry
    
    CONSTRAINT PK_notifications PRIMARY KEY CLUSTERED (notification_id),
    CONSTRAINT UQ_notifications_uuid UNIQUE (notification_uuid),
    CONSTRAINT FK_notifications_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT FK_notifications_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id),
    CONSTRAINT CK_notifications_recipient CHECK (user_id IS NOT NULL OR customer_id IS NOT NULL)
);

CREATE NONCLUSTERED INDEX IX_notifications_user ON dbo.notifications(user_id, is_read, created_at DESC) WHERE user_id IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_notifications_customer ON dbo.notifications(customer_id, is_read, created_at DESC) WHERE customer_id IS NOT NULL;
```

#### 3.10.2 Table: email_logs
Purpose: Track all email communications

```sql
CREATE TABLE dbo.email_logs (
    email_log_id BIGINT IDENTITY(1,1) NOT NULL,
    

    -- Recipient
    to_email NVARCHAR(255) NOT NULL,
    cc_emails NVARCHAR(MAX), -- JSON array
    bcc_emails NVARCHAR(MAX), -- JSON array
    
    -- Email Details
    subject NVARCHAR(500) NOT NULL,
    body_html NVARCHAR(MAX),
    body_text NVARCHAR(MAX),
    
    -- Attachments
    attachments NVARCHAR(MAX), -- JSON array of file URLs/names
    
    -- Template
    template_name VARCHAR(100), -- e.g., 'booking_confirmation'
    template_variables NVARCHAR(MAX), -- JSON
    
    -- Email Type
    email_type VARCHAR(50) NOT NULL,
    -- 'BOOKING_CONFIRMATION', 'PAYMENT_RECEIPT', 'CANCELLATION', 'PASSWORD_RESET', 'WELCOME', 'INVOICE'
    
    -- Reference
    reference_type VARCHAR(50), -- 'BOOKING', 'CUSTOMER', 'PAYMENT'
    reference_id BIGINT,
    
    -- Email Provider
    provider VARCHAR(50) DEFAULT 'SENDGRID', -- 'SENDGRID', 'SES', 'SMTP'
    provider_message_id VARCHAR(255),
    
    -- Status
    email_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    -- 'PENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'OPENED', 'CLICKED'
    
    sent_at DATETIME2,
    delivered_at DATETIME2,
    opened_at DATETIME2,
    clicked_at DATETIME2,
    bounced_at DATETIME2,
    
    -- Error Tracking
    error_message NVARCHAR(MAX),
    retry_count INT DEFAULT 0,
    
    -- Provider Response
    provider_response NVARCHAR(MAX), -- JSON
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_email_logs PRIMARY KEY CLUSTERED (email_log_id)
);

CREATE NONCLUSTERED INDEX IX_email_logs_to_email ON dbo.email_logs(to_email, created_at DESC);
CREATE NONCLUSTERED INDEX IX_email_logs_status ON dbo.email_logs(email_status, created_at DESC);
CREATE NONCLUSTERED INDEX IX_email_logs_reference ON dbo.email_logs(reference_type, reference_id);
```

#### 3.10.3 Table: sms_logs
Purpose: Track all SMS communications

```sql
CREATE TABLE dbo.sms_logs (
    sms_log_id BIGINT IDENTITY(1,1) NOT NULL,
    

    -- Recipient
    phone_number VARCHAR(20) NOT NULL,
    country_code VARCHAR(5) NOT NULL DEFAULT '+91',
    
    -- Message
    message_text NVARCHAR(1000) NOT NULL,
    message_length INT,
    
    -- SMS Type
    sms_type VARCHAR(50) NOT NULL,
    -- 'BOOKING_CONFIRMATION', 'OTP', 'PAYMENT_SUCCESS', 'FLIGHT_REMINDER', 'CANCELLATION'
    
    -- Reference
    reference_type VARCHAR(50),
    reference_id BIGINT,
    
    -- SMS Provider
    provider VARCHAR(50) DEFAULT 'TWILIO', -- 'TWILIO', 'MSG91', 'AWS_SNS'
    provider_message_id VARCHAR(255),
    
    -- Status
    sms_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    -- 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'UNDELIVERED'
    
    sent_at DATETIME2,
    delivered_at DATETIME2,
    failed_at DATETIME2,
    
    -- Error Tracking
    error_code VARCHAR(50),
    error_message NVARCHAR(500),
    retry_count INT DEFAULT 0,
    
    -- Cost Tracking
    cost DECIMAL(10,4), -- Cost per SMS
    credits_used INT DEFAULT 1,
    
    -- Provider Response
    provider_response NVARCHAR(MAX), -- JSON
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_sms_logs PRIMARY KEY CLUSTERED (sms_log_id)
);

CREATE NONCLUSTERED INDEX IX_sms_logs_phone ON dbo.sms_logs(phone_number, created_at DESC);
CREATE NONCLUSTERED INDEX IX_sms_logs_status ON dbo.sms_logs(sms_status, created_at DESC);
CREATE NONCLUSTERED INDEX IX_sms_logs_reference ON dbo.sms_logs(reference_type, reference_id);
```

### 3.11 AUDIT & SECURITY SCHEMA

#### 3.11.1 Table: audit.activity_logs
Purpose: Comprehensive audit trail for all actions

```sql
CREATE SCHEMA audit;
GO

CREATE TABLE audit.activity_logs (
    activity_log_id BIGINT IDENTITY(1,1) NOT NULL,
    

    -- Actor
    actor_type VARCHAR(50) NOT NULL, -- 'USER', 'CUSTOMER', 'SYSTEM', 'API'
    actor_id BIGINT, -- user_id or customer_id
    actor_email NVARCHAR(255),
    
    -- Action
    action VARCHAR(100) NOT NULL,
    /* Examples:
        'USER_LOGIN', 'USER_LOGOUT', 'BOOKING_CREATED', 'BOOKING_CANCELLED',
        'PAYMENT_INITIATED', 'CUSTOMER_REGISTERED', 'SETTINGS_UPDATED', 'DATA_EXPORTED'
    */
    
    -- Target
    entity_type VARCHAR(50), -- 'BOOKING', 'CUSTOMER', 'PAYMENT', 'USER'
    entity_id BIGINT,
    
    -- Details
    description NVARCHAR(1000),
    changes NVARCHAR(MAX), -- JSON: old vs new values
    
    -- Request Info
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent NVARCHAR(500),
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_url NVARCHAR(500),
    
    -- Session
    session_id VARCHAR(255),
    
    -- Result
    status VARCHAR(50) DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED', 'PARTIAL'
    error_message NVARCHAR(MAX),
    
    -- Performance
    response_time_ms INT,
    
    -- Timestamp
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_activity_logs PRIMARY KEY CLUSTERED (activity_log_id)
);

-- Partitioning by month recommended for this table
CREATE NONCLUSTERED INDEX IX_activity_logs_actor ON audit.activity_logs(actor_type, actor_id, created_at DESC);
CREATE NONCLUSTERED INDEX IX_activity_logs_entity ON audit.activity_logs(entity_type, entity_id);
CREATE NONCLUSTERED INDEX IX_activity_logs_action ON audit.activity_logs(action, created_at DESC);
CREATE NONCLUSTERED INDEX IX_activity_logs_ip ON audit.activity_logs(ip_address, created_at DESC);
```

#### 3.11.2 Table: audit.data_change_logs
Purpose: Track all database changes (via triggers)

```sql
CREATE TABLE audit.data_change_logs (
    change_log_id BIGINT IDENTITY(1,1) NOT NULL,
    
    -- Table Information
    schema_name VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    
    -- Operation
    operation_type VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    
    -- Record
    primary_key_value NVARCHAR(100) NOT NULL,
    
    -- Changes
    old_values NVARCHAR(MAX), -- JSON (for UPDATE and DELETE)
    new_values NVARCHAR(MAX), -- JSON (for INSERT and UPDATE)
    
    -- Changed Columns (for UPDATE)
    changed_columns NVARCHAR(MAX), -- JSON array
    
    -- Actor
    changed_by BIGINT,
    application_name NVARCHAR(255),
    
    -- Timestamp
    changed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_data_change_logs PRIMARY KEY CLUSTERED (change_log_id)
);

CREATE NONCLUSTERED INDEX IX_data_change_logs_table ON audit.data_change_logs(table_name, changed_at DESC);
CREATE NONCLUSTERED INDEX IX_data_change_logs_operation ON audit.data_change_logs(operation_type, changed_at DESC);
CREATE NONCLUSTERED INDEX IX_data_change_logs_pk ON audit.data_change_logs(table_name, primary_key_value);
```

#### 3.11.3 Table: sec.user_sessions
Purpose: Track active user sessions

```sql
CREATE SCHEMA sec;
GO

CREATE TABLE sec.user_sessions (
    session_id VARCHAR(255) NOT NULL,
    
    -- User
    user_id BIGINT, -- NULL for customer sessions
    customer_id BIGINT,
    
    -- Session Details
    session_token VARCHAR(500) NOT NULL, -- Hashed JWT or session token
    refresh_token VARCHAR(500),
    
    -- Device & Browser
    device_type VARCHAR(50), -- 'DESKTOP', 'MOBILE', 'TABLET'
    browser VARCHAR(100),
    operating_system VARCHAR(100),
    
    -- Location
    ip_address VARCHAR(45) NOT NULL,
    country VARCHAR(2),
    city NVARCHAR(100),
    
    -- Status
    is_active BIT DEFAULT 1,
    
    -- Timestamps
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    last_activity_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    expires_at DATETIME2 NOT NULL,
    logged_out_at DATETIME2,
    
    CONSTRAINT PK_user_sessions PRIMARY KEY CLUSTERED (session_id),
    CONSTRAINT FK_user_sessions_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id),
    CONSTRAINT FK_user_sessions_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(customer_id),
    CONSTRAINT CK_user_sessions_actor CHECK (user_id IS NOT NULL OR customer_id IS NOT NULL)
);

CREATE NONCLUSTERED INDEX IX_user_sessions_user ON sec.user_sessions(user_id, is_active) WHERE user_id IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_user_sessions_customer ON sec.user_sessions(customer_id, is_active) WHERE customer_id IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_user_sessions_expires ON sec.user_sessions(expires_at) WHERE is_active = 1;
```

#### 3.11.4 Table: sec.api_keys
Purpose: Manage API keys for tenant integrations

```sql
CREATE TABLE sec.api_keys (
    api_key_id BIGINT IDENTITY(1,1) NOT NULL,
    
    -- User (Agent)
    user_id BIGINT NOT NULL,
    
    -- Key Details
    key_name NVARCHAR(100) NOT NULL,
    api_key VARCHAR(64) NOT NULL, -- Hashed
    api_secret VARCHAR(255), -- Hashed (for HMAC signing)
    
    -- Permissions
    scopes NVARCHAR(MAX), -- JSON array: ['booking:read', 'booking:create', 'customer:read']
    
    -- Rate Limiting
    rate_limit_per_minute INT DEFAULT 60,
    rate_limit_per_day INT DEFAULT 10000,
    
    -- IP Whitelist
    allowed_ips NVARCHAR(MAX), -- JSON array
    
    -- Status
    is_active BIT DEFAULT 1,
    
    -- Usage Stats
    last_used_at DATETIME2,
    total_requests BIGINT DEFAULT 0,
    
    -- Rotation
    expires_at DATETIME2,
    rotated_at DATETIME2,
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by BIGINT,
    revoked_at DATETIME2,
    revoked_by BIGINT,
    
    CONSTRAINT PK_api_keys PRIMARY KEY CLUSTERED (api_key_id),
    CONSTRAINT UQ_api_keys_key UNIQUE (api_key),
    CONSTRAINT FK_api_keys_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
);

CREATE NONCLUSTERED INDEX IX_api_keys_user ON sec.api_keys(user_id, is_active);
```

### 3.12 ANALYTICS & REPORTING SCHEMA

#### 3.12.1 Table: analytics.daily_booking_summary
Purpose: Pre-aggregated daily booking metrics

```sql
CREATE SCHEMA analytics;
GO

CREATE TABLE analytics.daily_booking_summary (
    summary_id BIGINT IDENTITY(1,1) NOT NULL,
    
    -- Dimensions
    summary_date DATE NOT NULL,
    booking_type VARCHAR(50) NOT NULL,
    
    -- Route (for flights)
    origin_code VARCHAR(10),
    destination_code VARCHAR(10),
    
    -- Metrics
    total_bookings INT NOT NULL DEFAULT 0,
    confirmed_bookings INT NOT NULL DEFAULT 0,
    cancelled_bookings INT NOT NULL DEFAULT 0,
    failed_bookings INT NOT NULL DEFAULT 0,
    
    total_passengers INT NOT NULL DEFAULT 0,
    
    -- Financial Metrics (in INR)
    total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_commission DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_refunds DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Payment Metrics
    total_paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    pending_payment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Customer Metrics
    new_customers INT NOT NULL DEFAULT 0,
    returning_customers INT NOT NULL DEFAULT 0,
    
    -- Performance
    avg_booking_value DECIMAL(15,2),
    conversion_rate DECIMAL(5,2), -- Percentage
    
    -- Timestamps
    calculated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_daily_booking_summary PRIMARY KEY CLUSTERED (summary_date, booking_type, summary_id)
);

CREATE NONCLUSTERED INDEX IX_daily_summary_route ON analytics.daily_booking_summary(origin_code, destination_code, summary_date DESC);

-- Columnstore for analytics queries
CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_daily_summary_analytics
    ON analytics.daily_booking_summary(summary_date, booking_type, total_revenue, total_commission);
```

#### 3.12.2 Table: analytics.agent_performance
Purpose: Track agent/user performance metrics

```sql
CREATE TABLE analytics.agent_performance (
    performance_id BIGINT IDENTITY(1,1) NOT NULL,
    
    -- Period
    period_type VARCHAR(20) NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY'
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    
    -- Agent
    user_id BIGINT NOT NULL,
    
    -- Booking Metrics
    total_bookings INT NOT NULL DEFAULT 0,
    successful_bookings INT NOT NULL DEFAULT 0,
    cancelled_bookings INT NOT NULL DEFAULT 0,
    
    -- Revenue Metrics
    total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_commission_earned DECIMAL(15,2) NOT NULL DEFAULT 0,
    commission_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
    commission_pending DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Customer Metrics
    customers_acquired INT NOT NULL DEFAULT 0,
    total_customers INT NOT NULL DEFAULT 0,
    
    -- Performance Indicators
    avg_booking_value DECIMAL(15,2),
    avg_commission_per_booking DECIMAL(15,2),
    customer_satisfaction_score DECIMAL(3,2), -- 0-5 rating
    
    -- Rankings
    rank_overall INT,
    
    -- Timestamps
    calculated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT PK_agent_performance PRIMARY KEY CLUSTERED (performance_id),
    CONSTRAINT FK_agent_performance_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
);

CREATE NONCLUSTERED INDEX IX_agent_performance_user ON analytics.agent_performance(user_id, period_start_date DESC);
```

### 3.13 CONFIGURATION & SETTINGS



#### 3.13.2 Table: system_settings
Purpose: Global system configuration

```sql
CREATE TABLE dbo.system_settings (
    setting_id BIGINT IDENTITY(1,1) NOT NULL,
    
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value NVARCHAR(MAX) NOT NULL,
    setting_type VARCHAR(50) NOT NULL,
    
    category VARCHAR(50), -- 'PAYMENT', 'EMAIL', 'SMS', 'API', 'SECURITY'
    description NVARCHAR(500),
    
    is_encrypted BIT DEFAULT 0, -- For sensitive values
    is_public BIT DEFAULT 0, -- Can be exposed to frontend
    
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_by BIGINT,
    
    CONSTRAINT PK_system_settings PRIMARY KEY CLUSTERED (setting_id)
);

CREATE NONCLUSTERED INDEX IX_system_settings_category ON dbo.system_settings(category);
```

#### 3.13.3 Table: commission_rules
Purpose: Configure commission structures

```sql
CREATE TABLE dbo.commission_rules (
    rule_id BIGINT IDENTITY(1,1) NOT NULL,
    
    -- User (NULL for global rules)
    user_id BIGINT,
    
    -- Rule Details
    rule_name NVARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'PERCENTAGE', 'FLAT', 'TIERED', 'CUSTOM'
    
    -- Applicability
    booking_type VARCHAR(50), -- 'FLIGHT', 'HOTEL', 'BUS', NULL (all)
    cabin_class VARCHAR(50), -- 'ECONOMY', 'BUSINESS', etc., NULL (all)
    airline_code VARCHAR(10), -- Specific airline, NULL (all)
    
    -- Domestic vs International
    is_domestic BIT, -- NULL (both), 1 (domestic only), 0 (international only)
    
    -- Commission Values
    commission_percentage DECIMAL(5,2), -- For percentage type
    flat_amount DECIMAL(15,2), -- For flat type
    
    -- Tiered Structure (JSON)
    tier_structure NVARCHAR(MAX),
    /* Example for TIERED:
    [
        {"min_amount": 0, "max_amount": 5000, "percentage": 2.0},
        {"min_amount": 5001, "max_amount": 10000, "percentage": 2.5},
        {"min_amount": 10001, "max_amount": null, "percentage": 3.0}
    ]
    */
    
    -- Validity
    valid_from DATE NOT NULL,
    valid_until DATE,
    
    -- Priority (higher number = higher priority)
    priority INT DEFAULT 100,
    
    -- Status
    is_active BIT DEFAULT 1,
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by BIGINT,
    
    CONSTRAINT PK_commission_rules PRIMARY KEY CLUSTERED (rule_id),
    CONSTRAINT FK_commission_rules_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
);

CREATE NONCLUSTERED INDEX IX_commission_rules_user ON dbo.commission_rules(user_id, is_active, priority DESC);
CREATE NONCLUSTERED INDEX IX_commission_rules_validity ON dbo.commission_rules(valid_from, valid_until, is_active);

```

## 4. Indexing Strategy

### 4.1 Index Design Principles
Clustered Indexes: On primary sequential key (IDENTITY)
Unique Non-Clustered: On UUID and natural keys (email, booking_reference)
Covering Indexes: Include frequently accessed columns
Filtered Indexes: For common WHERE clauses (is_deleted = 0, is_active = 1)
Columnstore Indexes: For analytics tables
Full-Text Indexes: For search functionality

### 4.2 Critical Performance Indexes

```sql

-- High-Traffic Query Optimization

-- 1. Booking Search by Customer
CREATE NONCLUSTERED INDEX IX_bookings_customer_search 
    ON dbo.bookings(customer_id, booking_date DESC)
    INCLUDE (booking_reference, total_amount, booking_status, payment_status)
    WHERE is_deleted = 0;

-- 2. Agent Dashboard - Today's Bookings
CREATE NONCLUSTERED INDEX IX_bookings_agent_dashboard
    ON dbo.bookings(booked_by_user_id, booking_date)
    INCLUDE (booking_reference, total_amount, commission_amount, booking_status)
    WHERE is_deleted = 0 AND booking_date >= CAST(GETUTCDATE() AS DATE);

-- 3. Pending Payments
CREATE NONCLUSTERED INDEX IX_bookings_pending_payment
    ON dbo.bookings(booked_by_user_id, expires_at)
    INCLUDE (booking_reference, customer_id, total_amount)
    WHERE payment_status IN ('PENDING', 'PARTIALLY_PAID') AND is_deleted = 0;

-- 4. Upcoming Flights
CREATE NONCLUSTERED INDEX IX_flight_bookings_upcoming
    ON dbo.flight_bookings(departure_datetime)
    INCLUDE (booking_id, airline_code, flight_number, origin_airport, destination_airport)
    WHERE departure_datetime >= GETUTCDATE();

-- 5. Commission Settlement
CREATE NONCLUSTERED INDEX IX_commissions_settlement_pending
    ON dbo.commissions(user_id, settlement_date)
    INCLUDE (commission_amount, net_commission, booking_id)
    WHERE commission_status = 'APPROVED' AND settlement_date IS NOT NULL;
```

### 4.3 Missing Index Monitoring

```sql

-- Query to find missing indexes (run periodically)
SELECT 
    CONVERT(VARCHAR(30), getdate(), 126) AS runtime,
    mig.index_group_handle,
    mid.index_handle,
    CONVERT(DECIMAL(28,1), migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans)) AS improvement_measure,
    'CREATE INDEX missing_index_' + CONVERT(VARCHAR, mig.index_group_handle) + '_' + CONVERT(VARCHAR, mid.index_handle)
    + ' ON ' + mid.statement
    + ' (' + ISNULL(mid.equality_columns,'')
    + CASE WHEN mid.equality_columns IS NOT NULL AND mid.inequality_columns IS NOT NULL THEN ',' ELSE '' END
    + ISNULL(mid.inequality_columns, '')
    + ')'
    + ISNULL(' INCLUDE (' + mid.included_columns + ')', '') AS create_index_statement
FROM sys.dm_db_missing_index_groups mig
INNER JOIN sys.dm_db_missing_index_group_stats migs ON migs.group_handle = mig.index_group_handle
INNER JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
WHERE CONVERT(DECIMAL(28,1), migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans)) > 10
ORDER BY improvement_measure DESC;
```

## 5. Partitioning Strategy

### 5.1 Tables Requiring Partitioning
Large tables that grow continuously should be partitioned by date:

- bookings - Partition by booking_date (monthly)
- payments - Partition by created_at (monthly)
- audit.activity_logs - Partition by created_at (monthly)
- email_logs - Partition by created_at (weekly)
- sms_logs - Partition by created_at (weekly)

### 5.2 Partition Implementation Example

```sql
-- Create Partition Function (Monthly partitioning for bookings)
CREATE PARTITION FUNCTION PF_MonthlyBookings (DATETIME2)
AS RANGE RIGHT FOR VALUES (
    '2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01',
    '2025-05-01', '2025-06-01', '2025-07-01', '2025-08-01',
    '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01',
    '2026-01-01' -- Add more as needed
);

-- Create Partition Scheme
CREATE PARTITION SCHEME PS_MonthlyBookings
AS PARTITION PF_MonthlyBookings
ALL TO ([PRIMARY]); -- Or specify different filegroups for each partition

-- Apply to table (during creation or via rebuild)
-- Modify bookings table creation:
ALTER TABLE dbo.bookings DROP CONSTRAINT PK_bookings;

ALTER TABLE dbo.bookings ADD CONSTRAINT PK_bookings 
    PRIMARY KEY CLUSTERED (booking_id, booking_date)
    ON PS_MonthlyBookings(booking_date);

-- Automated partition management stored procedure
CREATE PROCEDURE dbo.sp_ManagePartitions
AS
BEGIN
    -- Add new partition for next month if not exists
    -- Remove old partitions beyond retention period (e.g., 7 years)
    
    DECLARE @NextMonth DATE = DATEADD(MONTH, 1, EOMONTH(GETDATE()));
    DECLARE @OldMonth DATE = DATEADD(YEAR, -7, DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0));
    
    -- Logic to split/merge partitions
    -- (Implementation details depend on specific requirements)
END;
```


---

## 6. Security Implementation

### 6.1 Row-Level Security (RLS) for Multi-Tenancy

```sql
-- Enable Row-Level Security on critical tables

-- 1. Create Security Policy for Agents
CREATE SCHEMA security;
GO

-- Function to get current user_id from session context
CREATE FUNCTION security.fn_UserAccessPredicate(@user_id BIGINT)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN 
    SELECT 1 AS accessResult
    WHERE 
        @user_id = CAST(SESSION_CONTEXT(N'user_id') AS BIGINT)
        OR IS_MEMBER('db_owner') = 1  -- Admins can see all
        OR IS_MEMBER('SuperAdmin') = 1;
GO

-- Apply to bookings table
CREATE SECURITY POLICY security.UserIsolationPolicy
ADD FILTER PREDICATE security.fn_UserAccessPredicate(booked_by_user_id)
ON dbo.bookings,
ADD FILTER PREDICATE security.fn_UserAccessPredicate(referred_by_user_id)
ON dbo.customers,
ADD FILTER PREDICATE security.fn_UserAccessPredicate(user_id)
ON dbo.wallets,
ADD FILTER PREDICATE security.fn_UserAccessPredicate(user_id)
ON dbo.commissions
WITH (STATE = ON);
GO

-- Usage in application:
-- Before executing user-specific queries:
-- EXEC sp_set_session_context @key = N'user_id', @value = @userId;
```

### 6.2 Encryption Strategy

```sql
-- 1. Transparent Data Encryption (TDE) - Database Level
-- Enable on database (run by DBA)
USE master;
GO

CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'StrongP@ssw0rd!2025';
GO

CREATE CERTIFICATE TDECert WITH SUBJECT = 'Booking Platform TDE Certificate';
GO

USE BookingPlatformDB;
GO

CREATE DATABASE ENCRYPTION KEY
WITH ALGORITHM = AES_256
ENCRYPTION BY SERVER CERTIFICATE TDECert;
GO

ALTER DATABASE BookingPlatformDB
SET ENCRYPTION ON;
GO

-- 2. Column-Level Encryption for Sensitive Data
-- Create master key and certificate
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'C0lumnEncrypt!0n2025';
GO

CREATE CERTIFICATE SensitiveDataCert
WITH SUBJECT = 'Certificate for Sensitive Column Encryption';
GO

CREATE SYMMETRIC KEY SensitiveDataKey
WITH ALGORITHM = AES_256
ENCRYPTION BY CERTIFICATE SensitiveDataCert;
GO

-- Example: Encrypt card details (if storing - generally not recommended)
-- Add encrypted columns to payments table
ALTER TABLE dbo.payments
ADD card_number_encrypted VARBINARY(256),
    cvv_encrypted VARBINARY(128);

-- Encryption function
CREATE PROCEDURE dbo.sp_EncryptCardData
    @payment_id BIGINT,
    @card_number VARCHAR(16),
    @cvv VARCHAR(4)
AS
BEGIN
    OPEN SYMMETRIC KEY SensitiveDataKey
    DECRYPTION BY CERTIFICATE SensitiveDataCert;
    
    UPDATE dbo.payments
    SET card_number_encrypted = ENCRYPTBYKEY(KEY_GUID('SensitiveDataKey'), @card_number),
        cvv_encrypted = ENCRYPTBYKEY(KEY_GUID('SensitiveDataKey'), @cvv)
    WHERE payment_id = @payment_id;
    
    CLOSE SYMMETRIC KEY SensitiveDataKey;
END;
GO

-- Decryption function
CREATE FUNCTION dbo.fn_DecryptCardNumber(@payment_id BIGINT)
RETURNS VARCHAR(16)
AS
BEGIN
    DECLARE @decrypted VARCHAR(16);
    
    SELECT @decrypted = CONVERT(VARCHAR(16), DECRYPTBYKEY(card_number_encrypted))
    FROM dbo.payments
    WHERE payment_id = @payment_id;
    
    RETURN @decrypted;
END;
GO
```

### 6.3 Database Roles and Permissions

```sql
-- Create database roles

-- 1. Super Admin Role (Full Access)
CREATE ROLE SuperAdmin;
GRANT CONTROL ON DATABASE::BookingPlatformDB TO SuperAdmin;

-- 2. Admin Role
CREATE ROLE Admin;
GRANT SELECT, INSERT, UPDATE ON SCHEMA::dbo TO Admin;
GRANT SELECT ON SCHEMA::analytics TO Admin;
DENY DELETE ON dbo.bookings TO Admin;  -- Soft delete only
DENY DELETE ON dbo.customers TO Admin;

-- 3. Agent Role
CREATE ROLE Agent;
GRANT SELECT, INSERT, UPDATE ON dbo.bookings TO Agent;
GRANT SELECT, INSERT, UPDATE ON dbo.customers TO Agent;
GRANT SELECT, INSERT ON dbo.travelers TO Agent;
GRANT SELECT ON dbo.payments TO Agent;
GRANT SELECT ON analytics.agent_performance TO Agent;
DENY DELETE ON SCHEMA::dbo TO Agent;

-- 4. Customer Service Role
CREATE ROLE CustomerService;
GRANT SELECT ON dbo.bookings TO CustomerService;
GRANT SELECT ON dbo.customers TO CustomerService;
GRANT SELECT ON dbo.payments TO CustomerService;
GRANT UPDATE ON dbo.bookings TO CustomerService;  -- For cancellations, modifications

-- 5. Finance Role
CREATE ROLE Finance;
GRANT SELECT ON dbo.bookings TO Finance;
GRANT SELECT ON dbo.payments TO Finance;
GRANT SELECT ON dbo.refunds TO Finance;
GRANT SELECT ON dbo.commissions TO Finance;
GRANT SELECT ON dbo.invoices TO Finance;
GRANT UPDATE ON dbo.commissions TO Finance;
GRANT UPDATE ON dbo.refunds TO Finance;

-- 6. Analytics/Reporting Role
CREATE ROLE Reporter;
GRANT SELECT ON SCHEMA::analytics TO Reporter;
GRANT SELECT ON dbo.bookings TO Reporter;
GRANT SELECT ON dbo.customers TO Reporter;
GRANT SELECT ON dbo.payments TO Reporter;
DENY INSERT, UPDATE, DELETE ON SCHEMA::analytics TO Reporter;

-- 7. API Service Account
CREATE ROLE APIService;
GRANT SELECT, INSERT, UPDATE ON dbo.bookings TO APIService;
GRANT SELECT, INSERT ON dbo.customers TO APIService;
GRANT SELECT, INSERT ON dbo.payments TO APIService;
GRANT INSERT ON audit.activity_logs TO APIService;
```

### 6.4 Audit Triggers

```sql
-- Trigger for audit logging on sensitive tables

-- 1. Booking Changes Audit
CREATE TRIGGER tr_bookings_audit
ON dbo.bookings
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @operation VARCHAR(10);
    
    IF EXISTS(SELECT * FROM inserted) AND EXISTS(SELECT * FROM deleted)
        SET @operation = 'UPDATE';
    ELSE IF EXISTS(SELECT * FROM inserted)
        SET @operation = 'INSERT';
    ELSE
        SET @operation = 'DELETE';
    
    INSERT INTO audit.data_change_logs (
        schema_name, table_name, operation_type, primary_key_value,
        old_values, new_values, changed_by, changed_at
    )
    SELECT 
        'dbo', 'bookings', @operation,
        CAST(ISNULL(i.booking_id, d.booking_id) AS NVARCHAR(100)),
        (SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        CAST(SESSION_CONTEXT(N'user_id') AS BIGINT),
        GETUTCDATE()
    FROM inserted i
    FULL OUTER JOIN deleted d ON i.booking_id = d.booking_id;
END;
GO

-- 2. Payment Changes Audit
CREATE TRIGGER tr_payments_audit
ON dbo.payments
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @operation VARCHAR(10) = CASE 
        WHEN EXISTS(SELECT * FROM deleted) THEN 'UPDATE' 
        ELSE 'INSERT' 
    END;
    
    INSERT INTO audit.data_change_logs (
        schema_name, table_name, operation_type, primary_key_value,
        old_values, new_values, changed_by, changed_at
    )
    SELECT 
        'dbo', 'payments', @operation,
        CAST(i.payment_id AS NVARCHAR(100)),
        (SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        CAST(SESSION_CONTEXT(N'user_id') AS BIGINT),
        GETUTCDATE()
    FROM inserted i
    LEFT JOIN deleted d ON i.payment_id = d.payment_id;
END;
GO

-- 3. User Login Audit Trigger
CREATE TRIGGER tr_users_login_audit
ON sec.user_sessions
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO audit.activity_logs (
        actor_type, actor_id, action, 
        description, ip_address, user_agent, status, created_at
    )
    SELECT 
        CASE WHEN i.user_id IS NOT NULL THEN 'USER' ELSE 'CUSTOMER' END,
        ISNULL(i.user_id, i.customer_id),
        'USER_LOGIN',
        'User logged in successfully',
        i.ip_address,
        i.browser,
        'SUCCESS',
        i.created_at
    FROM inserted i;
END;
GO
```

---

## 7. Backup and Recovery Strategy

### 7.1 Backup Configuration

```sql
-- Full database backup (Daily at 2 AM)
BACKUP DATABASE BookingPlatformDB
TO DISK = 'D:\Backups\BookingPlatformDB_Full_' + 
    CONVERT(VARCHAR(8), GETDATE(), 112) + '.bak'
WITH 
    COMPRESSION,
    CHECKSUM,
    STATS = 10,
    DESCRIPTION = 'Full database backup';
GO

-- Differential backup (Every 6 hours)
BACKUP DATABASE BookingPlatformDB
TO DISK = 'D:\Backups\BookingPlatformDB_Diff_' + 
    CONVERT(VARCHAR(14), GETDATE(), 112) + '_' + 
    REPLACE(CONVERT(VARCHAR(8), GETDATE(), 108), ':', '') + '.bak'
WITH 
    DIFFERENTIAL,
    COMPRESSION,
    CHECKSUM,
    STATS = 10,
    DESCRIPTION = 'Differential database backup';
GO

-- Transaction log backup (Every 15 minutes)
BACKUP LOG BookingPlatformDB
TO DISK = 'D:\Backups\BookingPlatformDB_Log_' + 
    CONVERT(VARCHAR(14), GETDATE(), 112) + '_' + 
    REPLACE(CONVERT(VARCHAR(8), GETDATE(), 108), ':', '') + '.trn'
WITH 
    COMPRESSION,
    CHECKSUM,
    STATS = 10,
    DESCRIPTION = 'Transaction log backup';
GO
```

### 7.2 Recovery Procedures

```sql
-- Point-in-time recovery procedure
CREATE PROCEDURE dbo.sp_PointInTimeRecovery
    @RecoveryDateTime DATETIME2,
    @RestoreDatabaseName NVARCHAR(128) = 'BookingPlatformDB_Restored'
AS
BEGIN
    -- Step 1: Restore full backup
    RESTORE DATABASE @RestoreDatabaseName
    FROM DISK = 'D:\Backups\BookingPlatformDB_Full_Latest.bak'
    WITH 
        NORECOVERY,
        REPLACE,
        STATS = 10;
    
    -- Step 2: Restore differential backup
    RESTORE DATABASE @RestoreDatabaseName
    FROM DISK = 'D:\Backups\BookingPlatformDB_Diff_Latest.bak'
    WITH 
        NORECOVERY,
        STATS = 10;
    
    -- Step 3: Restore transaction logs up to recovery point
    RESTORE LOG @RestoreDatabaseName
    FROM DISK = 'D:\Backups\BookingPlatformDB_Log_*.trn'
    WITH 
        STOPAT = @RecoveryDateTime,
        RECOVERY,
        STATS = 10;
    
    PRINT 'Database restored to: ' + CONVERT(VARCHAR, @RecoveryDateTime, 120);
END;
GO
```

### 7.3 Data Retention and Archival

```sql
-- Archive old bookings to archive schema
CREATE SCHEMA archive;
GO

-- Create archive table structure
CREATE TABLE archive.bookings (
    -- Same structure as dbo.bookings
    -- ... (copy all columns)
    archived_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Archival procedure (move bookings older than 2 years to archive)
CREATE PROCEDURE dbo.sp_ArchiveOldBookings
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ArchiveDate DATE = DATEADD(YEAR, -2, GETDATE());
    
    BEGIN TRANSACTION;
    
    -- Move to archive
    INSERT INTO archive.bookings
    SELECT *, GETUTCDATE()
    FROM dbo.bookings
    WHERE booking_date < @ArchiveDate
      AND is_deleted = 0;
    
    -- Soft delete from main table
    UPDATE dbo.bookings
    SET is_deleted = 1, deleted_at = GETUTCDATE()
    WHERE booking_date < @ArchiveDate
      AND is_deleted = 0;
    
    COMMIT TRANSACTION;
    
    PRINT 'Archived ' + CAST(@@ROWCOUNT AS VARCHAR) + ' bookings';
END;
GO

-- Schedule this procedure to run monthly
-- SQL Server Agent Job can be created for automation
```

## 8. Performance Optimization

### 8.1 Query Optimization Guidelines

```sql
-- 1. Indexed views for frequently accessed aggregations
CREATE VIEW dbo.vw_TenantMonthlyRevenue
WITH SCHEMABINDING
AS
SELECT 
    tenant_id,
    YEAR(booking_date) AS booking_year,
    MONTH(booking_date) AS booking_month,
    COUNT_BIG(*) AS total_bookings,
    SUM(ISNULL(total_amount, 0)) AS total_revenue,
    SUM(ISNULL(commission_amount, 0)) AS total_commission
FROM dbo.bookings
WHERE is_deleted = 0 
  AND booking_status IN ('CONFIRMED', 'TICKETED')
GROUP BY tenant_id, YEAR(booking_date), MONTH(booking_date);
GO

-- Create clustered index on the view
CREATE UNIQUE CLUSTERED INDEX IX_vw_TenantMonthlyRevenue
ON dbo.vw_TenantMonthlyRevenue(tenant_id, booking_year, booking_month);
GO

-- 2. Materialized view for agent performance (updated nightly)
CREATE TABLE analytics.mv_agent_performance_daily (
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    performance_date DATE NOT NULL,
    bookings_count INT DEFAULT 0,
    revenue_generated DECIMAL(15,2) DEFAULT 0,
    commission_earned DECIMAL(15,2) DEFAULT 0,
    customers_acquired INT DEFAULT 0,
    last_updated DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT PK_mv_agent_performance PRIMARY KEY (tenant_id, user_id, performance_date)
);

-- Refresh procedure
CREATE PROCEDURE analytics.sp_RefreshAgentPerformance
    @PerformanceDate DATE = NULL
AS
BEGIN
    SET @PerformanceDate = ISNULL(@PerformanceDate, CAST(GETDATE() AS DATE));
    
    MERGE analytics.mv_agent_performance_daily AS target
    USING (
        SELECT 
            b.tenant_id,
            b.booked_by_user_id AS user_id,
            CAST(b.booking_date AS DATE) AS performance_date,
            COUNT(*) AS bookings_count,
            SUM(b.total_amount) AS revenue_generated,
            SUM(b.commission_amount) AS commission_earned,
            COUNT(DISTINCT b.customer_id) AS customers_acquired
        FROM dbo.bookings b
        WHERE CAST(b.booking_date AS DATE) = @PerformanceDate
          AND b.is_deleted = 0
          AND b.booked_by_user_id IS NOT NULL
        GROUP BY b.tenant_id, b.booked_by_user_id, CAST(b.booking_date AS DATE)
    ) AS source
    ON target.tenant_id = source.tenant_id 
       AND target.user_id = source.user_id 
       AND target.performance_date = source.performance_date
    WHEN MATCHED THEN
        UPDATE SET 
            bookings_count = source.bookings_count,
            revenue_generated = source.revenue_generated,
            commission_earned = source.commission_earned,
            customers_acquired = source.customers_acquired,
            last_updated = GETUTCDATE()
    WHEN NOT MATCHED THEN
        INSERT (tenant_id, user_id, performance_date, bookings_count, 
                revenue_generated, commission_earned, customers_acquired)
        VALUES (source.tenant_id, source.user_id, source.performance_date, 
                source.bookings_count, source.revenue_generated, 
                source.commission_earned, source.customers_acquired);
END;
GO
```

### 8.2 Statistics Management

```sql
-- Create statistics on frequently filtered columns
CREATE STATISTICS ST_bookings_status_date 
ON dbo.bookings(booking_status, booking_date)
WITH FULLSCAN;

CREATE STATISTICS ST_bookings_tenant_customer 
ON dbo.bookings(tenant_id, customer_id)
WITH FULLSCAN;

CREATE STATISTICS ST_payments_status_gateway 
ON dbo.payments(payment_status, payment_gateway)
WITH FULLSCAN;

-- Automated statistics update procedure
CREATE PROCEDURE dbo.sp_UpdateStatistics
AS
BEGIN
    -- Update statistics on all user tables
    EXEC sp_updatestats;
    
    -- Update specific critical statistics with FULLSCAN
    UPDATE STATISTICS dbo.bookings WITH FULLSCAN;
    UPDATE STATISTICS dbo.payments WITH FULLSCAN;
    UPDATE STATISTICS dbo.customers WITH FULLSCAN;
    UPDATE STATISTICS dbo.flight_bookings WITH FULLSCAN;
    
    PRINT 'Statistics updated at: ' + CONVERT(VARCHAR, GETUTCDATE(), 120);
END;
GO
```

### 8.3 Query Store Configuration

```sql
-- Enable Query Store for performance monitoring
ALTER DATABASE BookingPlatformDB
SET QUERY_STORE = ON;

ALTER DATABASE BookingPlatformDB
SET QUERY_STORE (
    OPERATION_MODE = READ_WRITE,
    CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
    DATA_FLUSH_INTERVAL_SECONDS = 900,
    INTERVAL_LENGTH_MINUTES = 60,
    MAX_STORAGE_SIZE_MB = 1000,
    QUERY_CAPTURE_MODE = AUTO,
    SIZE_BASED_CLEANUP_MODE = AUTO
);
```

### 8.4 Caching Strategy (Application Level)

```sql
-- Create procedures for frequently accessed data

-- 1. Get active flights cache (to be cached in Redis for 5 mins)
CREATE PROCEDURE dbo.sp_GetActiveFlightSearchResults
    @Origin VARCHAR(10),
    @Destination VARCHAR(10),
    @DepartureDate DATE
AS
BEGIN
    SELECT 
        search_results,
        min_price,
        max_price,
        results_count,
        DATEDIFF(SECOND, searched_at, expires_at) AS cache_ttl_seconds
    FROM dbo.flight_search_cache
    WHERE origin = @Origin
      AND destination = @Destination
      AND departure_date = @DepartureDate
      AND expires_at > GETUTCDATE()
    ORDER BY searched_at DESC;
END;
GO

-- 2. Get customer booking history (cache in Redis for 10 mins)
CREATE PROCEDURE dbo.sp_GetCustomerBookingHistory
    @CustomerId BIGINT,
    @Limit INT = 10
AS
BEGIN
    SELECT TOP (@Limit)
        b.booking_id,
        b.booking_uuid,
        b.booking_reference,
        b.booking_type,
        b.booking_status,
        b.total_amount,
        b.currency,
        b.booking_date,
        b.travel_start_date,
        fb.airline_code,
        fb.flight_number,
        fb.origin_airport,
        fb.destination_airport,
        fb.departure_datetime
    FROM dbo.bookings b
    LEFT JOIN dbo.flight_bookings fb ON b.booking_id = fb.booking_id
    WHERE b.customer_id = @CustomerId
      AND b.is_deleted = 0
    ORDER BY b.booking_date DESC;
END;
GO
```

## 9. Database Maintenance Plan

### 9.1 Index Maintenance

```sql
CREATE PROCEDURE dbo.sp_IndexMaintenance
    @FragmentationThreshold FLOAT = 30.0,
    @RebuildThreshold FLOAT = 50.0
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @SchemaName NVARCHAR(128);
    DECLARE @TableName NVARCHAR(128);
    DECLARE @IndexName NVARCHAR(128);
    DECLARE @Fragmentation FLOAT;
    DECLARE @SQL NVARCHAR(MAX);
    
    -- Cursor to iterate through fragmented indexes
    DECLARE index_cursor CURSOR FOR
    SELECT 
        s.name AS schema_name,
        t.name AS table_name,
        i.name AS index_name,
        ps.avg_fragmentation_in_percent
    FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ps
    INNER JOIN sys.indexes i ON ps.object_id = i.object_id AND ps.index_id = i.index_id
    INNER JOIN sys.tables t ON i.object_id = t.object_id
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE ps.avg_fragmentation_in_percent > @FragmentationThreshold
      AND i.name IS NOT NULL
      AND ps.page_count > 1000  -- Only tables with significant size
    ORDER BY ps.avg_fragmentation_in_percent DESC;
    
    OPEN index_cursor;
    FETCH NEXT FROM index_cursor INTO @SchemaName, @TableName, @IndexName, @Fragmentation;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @Fragmentation > @RebuildThreshold
        BEGIN
            -- Rebuild index
            SET @SQL = 'ALTER INDEX [' + @IndexName + '] ON [' + @SchemaName + '].[' + @TableName + '] REBUILD WITH (ONLINE = ON, MAXDOP = 4);';
            PRINT 'REBUILDING: ' + @SchemaName + '.' + @TableName + '.' + @IndexName + ' (Frag: ' + CAST(@Fragmentation AS VARCHAR(10)) + '%)';
        END
        ELSE
        BEGIN
            -- Reorganize index
            SET @SQL = 'ALTER INDEX [' + @IndexName + '] ON [' + @SchemaName + '].[' + @TableName + '] REORGANIZE;';
            PRINT 'REORGANIZING: ' + @SchemaName + '.' + @TableName + '.' + @IndexName + ' (Frag: ' + CAST(@Fragmentation AS VARCHAR(10)) + '%)';
        END
        
        EXEC sp_executesql @SQL;
        
        FETCH NEXT FROM index_cursor INTO @SchemaName, @TableName, @IndexName, @Fragmentation;
    END
    
    CLOSE index_cursor;
    DEALLOCATE index_cursor;
    
    PRINT 'Index maintenance completed at: ' + CONVERT(VARCHAR, GETUTCDATE(), 120);
END;
GO
```

### 9.2 Database Consistency Checks

```sql
CREATE PROCEDURE dbo.sp_DatabaseIntegrityCheck
AS
BEGIN
    -- Check database consistency
    DBCC CHECKDB(BookingPlatformDB) WITH NO_INFOMSGS, ALL_ERRORMSGS;
    
    -- Check specific critical tables
    DBCC CHECKTABLE('dbo.bookings') WITH NO_INFOMSGS;
    DBCC CHECKTABLE('dbo.payments') WITH NO_INFOMSGS;
    DBCC CHECKTABLE('dbo.customers') WITH NO_INFOMSGS;
    
    PRINT 'Database integrity check completed at: ' + CONVERT(VARCHAR, GETUTCDATE(), 120);
END;
GO
```

### 9.3 Automated Cleanup Jobs

```sql
-- Cleanup expired sessions
CREATE PROCEDURE dbo.sp_CleanupExpiredSessions
AS
BEGIN
    DELETE FROM sec.user_sessions
    WHERE expires_at < DATEADD(DAY, -7, GETUTCDATE());
    
    PRINT 'Cleaned up ' + CAST(@@ROWCOUNT AS VARCHAR) + ' expired sessions';
END;
GO

-- Cleanup old search cache
CREATE PROCEDURE dbo.sp_CleanupSearchCache
AS
BEGIN
    DELETE FROM dbo.flight_search_cache
    WHERE expires_at < DATEADD(HOUR, -2, GETUTCDATE());
    
    PRINT 'Cleaned up ' + CAST(@@ROWCOUNT AS VARCHAR) + ' expired search results';
END;
GO

-- Cleanup old notifications
CREATE PROCEDURE dbo.sp_CleanupOldNotifications
AS
BEGIN
    DELETE FROM dbo.notifications
    WHERE is_read = 1 
      AND created_at < DATEADD(DAY, -90, GETUTCDATE());
    
    PRINT 'Cleaned up ' + CAST(@@ROWCOUNT AS VARCHAR) + ' old notifications';
END;
GO
```

## 10. Monitoring and Health Checks

### 10.1 Performance Monitoring Views

```sql
-- View for monitoring blocking queries
CREATE VIEW dbo.vw_CurrentBlockingQueries
AS
SELECT 
    blocking.session_id AS blocking_session_id,
    blocked.session_id AS blocked_session_id,
    blocked_user.login_name AS blocked_user,
    blocking_user.login_name AS blocking_user,
    blocked.wait_time / 1000.0 AS wait_time_seconds,
    blocked.wait_type,
    blocked_query.text AS blocked_query_text,
    blocking_query.text AS blocking_query_text
FROM sys.dm_exec_requests blocked
INNER JOIN sys.dm_exec_sessions blocked_user ON blocked.session_id = blocked_user.session_id
LEFT JOIN sys.dm_exec_requests blocking ON blocked.blocking_session_id = blocking.session_id
LEFT JOIN sys.dm_exec_sessions blocking_user ON blocking.session_id = blocking_user.session_id
CROSS APPLY sys.dm_exec_sql_text(blocked.sql_handle) AS blocked_query
OUTER APPLY sys.dm_exec_sql_text(blocking.sql_handle) AS blocking_query
WHERE blocked.blocking_session_id > 0;
GO

-- View for monitoring long-running queries
CREATE VIEW dbo.vw_LongRunningQueries
AS
SELECT 
    r.session_id,
    s.login_name,
    DB_NAME(r.database_id) AS database_name,
    r.status,
    r.command,
    r.wait_type,
    r.wait_time / 1000.0 AS wait_time_seconds,
    r.total_elapsed_time / 1000.0 AS elapsed_time_seconds,
    r.cpu_time / 1000.0 AS cpu_time_seconds,
    r.logical_reads,
    r.writes,
    t.text AS query_text,
    qp.query_plan
FROM sys.dm_exec_requests r
INNER JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
CROSS APPLY sys.dm_exec_query_plan(r.plan_handle) qp
WHERE r.total_elapsed_time > 30000  -- Running for more than 30 seconds
  AND s.is_user_process = 1;
GO

-- View for database size monitoring
CREATE VIEW dbo.vw_DatabaseSizeStats
AS
SELECT 
    t.name AS table_name,
    s.name AS schema_name,
    p.rows AS row_count,
    SUM(a.total_pages) * 8 / 1024.0 AS total_space_mb,
    SUM(a.used_pages) * 8 / 1024.0 AS used_space_mb,
    (SUM(a.total_pages) - SUM(a.used_pages)) * 8 / 1024.0 AS unused_space_mb
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.indexes i ON t.object_id = i.object_id
INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
WHERE t.is_ms_shipped = 0
  AND i.object_id > 255
GROUP BY t.name, s.name, p.rows
HAVING SUM(a.total_pages) > 0;
GO
```

### 10.2 Health Check Procedures

```sql
CREATE PROCEDURE dbo.sp_DatabaseHealthCheck
AS
BEGIN
    SET NOCOUNT ON;
    
    PRINT '========================================';
    PRINT 'DATABASE HEALTH CHECK REPORT';
    PRINT 'Generated: ' + CONVERT(VARCHAR, GETUTCDATE(), 120);
    PRINT '========================================';
    PRINT '';
    
    -- 1. Database Size
    PRINT '1. DATABASE SIZE:';
    SELECT 
        DB_NAME() AS database_name,
        SUM(size) * 8 / 1024.0 AS total_size_mb,
        SUM(CASE WHEN type = 0 THEN size ELSE 0 END) * 8 / 1024.0 AS data_size_mb,
        SUM(CASE WHEN type = 1 THEN size ELSE 0 END) * 8 / 1024.0 AS log_size_mb
    FROM sys.database_files;
    PRINT '';
    
    -- 2. Top 10 Largest Tables
    PRINT '2. TOP 10 LARGEST TABLES:';
    SELECT TOP 10 * FROM dbo.vw_DatabaseSizeStats ORDER BY total_space_mb DESC;
    PRINT '';
    
    -- 3. Index Fragmentation (>30%)
    PRINT '3. FRAGMENTED INDEXES (>30%):';
    SELECT 
        OBJECT_NAME(ips.object_id) AS table_name,
        i.name AS index_name,
        ips.avg_fragmentation_in_percent,
        ips.page_count
    FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
    INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
    WHERE ips.avg_fragmentation_in_percent > 30
      AND ips.page_count > 1000
    ORDER BY ips.avg_fragmentation_in_percent DESC;
    PRINT '';
    
    -- 4. Recent Booking Stats (Last 24 hours)
    PRINT '4. BOOKING STATISTICS (Last 24 hours):';
    SELECT 
        booking_status,
        COUNT(*) AS count,
        SUM(total_amount) AS total_revenue,
        AVG(total_amount) AS avg_booking_value
    FROM dbo.bookings
    WHERE booking_date >= DATEADD(HOUR, -24, GETUTCDATE())
      AND is_deleted = 0
    GROUP BY booking_status;
    PRINT '';
    
    -- 5. Payment Success Rate (Last 24 hours)
    PRINT '5. PAYMENT SUCCESS RATE (Last 24 hours):';
    SELECT 
        payment_status,
        COUNT(*) AS count,
        CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() AS DECIMAL(5,2)) AS percentage
    FROM dbo.payments
    WHERE created_at >= DATEADD(HOUR, -24, GETUTCDATE())
    GROUP BY payment_status;
    PRINT '';
    
    -- 6. Active Sessions
    PRINT '6. ACTIVE SESSIONS:';
    SELECT 
        COUNT(*) AS total_active_sessions,
        SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) AS agent_sessions,
        SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END) AS customer_sessions
    FROM sec.user_sessions
    WHERE is_active = 1 AND expires_at > GETUTCDATE();
    PRINT '';
    
    -- 7. Failed Login Attempts (Last hour)
    PRINT '7. SECURITY: Failed Login Attempts (Last hour):';
    SELECT 
        COUNT(*) AS failed_attempts,
        COUNT(DISTINCT ip_address) AS unique_ips
    FROM audit.activity_logs
    WHERE action = 'USER_LOGIN'
      AND status = 'FAILED'
      AND created_at >= DATEADD(HOUR, -1, GETUTCDATE());
    PRINT '';
    
    PRINT '========================================';
    PRINT 'HEALTH CHECK COMPLETED';
    PRINT '========================================';
END;
GO
```

## 11. Stored Procedures for Common Operations

### 11.1 Booking Management Procedures

```sql
-- Create a new flight booking
CREATE PROCEDURE dbo.sp_CreateFlightBooking
    @TenantId BIGINT,
    @CustomerId BIGINT,
    @BookedByUserId BIGINT = NULL,
    @OriginCode VARCHAR(10),
    @DestinationCode VARCHAR(10),
    @TravelStartDate DATETIME2,
    @TotalAmount DECIMAL(15,2),
    @CommissionPercentage DECIMAL(5,2),
    @FlightDetails NVARCHAR(MAX),  -- JSON
    @TravelerDetails NVARCHAR(MAX), -- JSON
    @BookingReference VARCHAR(20) OUTPUT,
    @BookingId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Generate booking reference
        SET @BookingReference = 'BKG' + FORMAT(GETDATE(), 'yyyyMMdd') + 
                               RIGHT('000000' + CAST(ABS(CHECKSUM(NEWID())) % 1000000 AS VARCHAR), 6);
        
        -- Calculate commission
        DECLARE @CommissionAmount DECIMAL(15,2) = @TotalAmount * (@CommissionPercentage / 100.0);
        
        -- Insert booking
        INSERT INTO dbo.bookings (
            tenant_id, customer_id, booked_by_user_id, booking_reference,
            booking_type, origin_code, destination_code, journey_type,
            travel_start_date, total_travelers, base_fare, total_amount,
            commission_amount, commission_percentage, booking_status, payment_status,
            contact_email, contact_phone
        )
        SELECT 
            @TenantId, @CustomerId, @BookedByUserId, @BookingReference,
            'FLIGHT', @OriginCode, @DestinationCode, 'ONE_WAY',
            @TravelStartDate, 1, @TotalAmount, @TotalAmount,
            @CommissionAmount, @CommissionPercentage, 'INITIATED', 'PENDING',
            c.email, c.phone
        FROM dbo.customers c
        WHERE c.customer_id = @CustomerId;
        
        SET @BookingId = SCOPE_IDENTITY();
        
        -- Parse and insert flight details
        -- (Simplified - in production, parse @FlightDetails JSON and insert into flight_bookings)
        
        COMMIT TRANSACTION;
        
        -- Log activity
        INSERT INTO audit.activity_logs (tenant_id, actor_type, actor_id, action, entity_type, entity_id, description)
        VALUES (@TenantId, 'USER', ISNULL(@BookedByUserId, @CustomerId), 'BOOKING_CREATED', 'BOOKING', @BookingId, 
                'Flight booking created: ' + @BookingReference);
                
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Cancel booking
CREATE PROCEDURE dbo.sp_CancelBooking
    @BookingId BIGINT,
    @CancellationReason NVARCHAR(500),
    @CancelledBy BIGINT,
    @RefundAmount DECIMAL(15,2) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        DECLARE @BookingReference VARCHAR(20);
        DECLARE @TotalAmount DECIMAL(15,2);
        DECLARE @CancellationCharges DECIMAL(15,2);
        
        -- Get booking details
        SELECT 
            @BookingReference = booking_reference,
            @TotalAmount = total_amount
        FROM dbo.bookings
        WHERE booking_id = @BookingId AND is_deleted = 0;
        
        -- Calculate cancellation charges (simplified - should use fare rules)
        SET @CancellationCharges = @TotalAmount * 0.10; -- 10% cancellation fee
        SET @RefundAmount = @TotalAmount - @CancellationCharges;
        
        -- Update booking
        UPDATE dbo.bookings
        SET 
            booking_status = 'CANCELLED',
            cancellation_charges = @CancellationCharges,
            cancelled_at = GETUTCDATE(),
            cancellation_reason = @CancellationReason,
            refund_amount = @RefundAmount,
            refund_status = 'PENDING',
            updated_at = GETUTCDATE(),
            updated_by = @CancelledBy
        WHERE booking_id = @BookingId;
        
        -- Log activity
        INSERT INTO audit.activity_logs (actor_type, actor_id, action, entity_type, entity_id, description)
        VALUES ('USER', @CancelledBy, 'BOOKING_CANCELLED', 'BOOKING', @BookingId,
                'Booking cancelled: ' + @BookingReference + '. Refund: ' + CAST(@RefundAmount AS VARCHAR));
        
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
```

### 11.2 Commission Calculation Procedure

```sql
CREATE PROCEDURE dbo.sp_CalculateAndRecordCommission
    @BookingId BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TenantId BIGINT;
    DECLARE @BookingType VARCHAR(50);
    DECLARE @BookingAmount DECIMAL(15,2);
    DECLARE @CommissionPercentage DECIMAL(5,2);
    DECLARE @CommissionAmount DECIMAL(15,2);
    DECLARE @TDSPercentage DECIMAL(5,2) = 5.0; -- 5% TDS
    DECLARE @TDSAmount DECIMAL(15,2);
    DECLARE @NetCommission DECIMAL(15,2);
    
    -- Get booking details
    SELECT 
        @TenantId = tenant_id,
        @BookingType = booking_type,
        @BookingAmount = total_amount,
        @CommissionAmount = commission_amount,
        @CommissionPercentage = commission_percentage
    FROM dbo.bookings
    WHERE booking_id = @BookingId;
    
    -- Calculate TDS
    SET @TDSAmount = @CommissionAmount * (@TDSPercentage / 100.0);
    SET @NetCommission = @CommissionAmount - @TDSAmount;
    
    -- Insert commission record
    INSERT INTO dbo.commissions (
        tenant_id, booking_id, booking_type, base_amount,
        commission_percentage, commission_amount, tds_percentage, tds_amount,
        total_commission, net_commission, commission_status
    )
    VALUES (
        @TenantId, @BookingId, @BookingType, @BookingAmount,
        @CommissionPercentage, @CommissionAmount, @TDSPercentage, @TDSAmount,
        @CommissionAmount, @NetCommission, 'PENDING'
    );
    
    PRINT 'Commission recorded: ' + CAST(@NetCommission AS VARCHAR) + ' for booking: ' + CAST(@BookingId AS VARCHAR);
END;
GO
```

## 12. Complete Database Initialization Script

```sql
-- Master initialization script
-- Run this to set up the complete database

USE master;
GO

-- Drop and create database
IF EXISTS(SELECT * FROM sys.databases WHERE name = 'BookingPlatformDB')
BEGIN
    ALTER DATABASE BookingPlatformDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE BookingPlatformDB;
END
GO

CREATE DATABASE BookingPlatformDB
ON PRIMARY (
    NAME = 'BookingPlatformDB_Data',
    FILENAME = 'D:\SQLData\BookingPlatformDB_Data.mdf',
    SIZE = 1024MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 256MB
)
LOG ON (
    NAME = 'BookingPlatformDB_Log',
    FILENAME = 'D:\SQLData\BookingPlatformDB_Log.ldf',
    SIZE = 512MB,
    MAXSIZE = UNLIMITED,
    FILEGROWTH = 128MB
);
GO

ALTER DATABASE BookingPlatformDB SET RECOVERY FULL;
ALTER DATABASE BookingPlatformDB SET AUTO_UPDATE_STATISTICS ON;
ALTER DATABASE BookingPlatformDB SET AUTO_CREATE_STATISTICS ON;
ALTER DATABASE BookingPlatformDB SET PAGE_VERIFY CHECKSUM;
GO

USE BookingPlatformDB;
GO

-- Run all CREATE TABLE statements (from sections above)
-- Run all CREATE INDEX statements
-- Run all CREATE PROCEDURE statements
-- Run all CREATE VIEW statements

PRINT 'Database initialized successfully!';
GO
```

## 13. Database Deployment Checklist

### Pre-Deployment
- Review all table schemas
- Verify all constraints and foreign keys
- Validate index strategy
- Review partition scheme (if applicable)
- Test backup and restore procedures
- Configure TDE (Transparent Data Encryption)
- Set up Row-Level Security policies

### Deployment
- Execute database creation script
- Create all tables in dependency order
- Apply all indexes
- Create stored procedures and functions
- Set up SQL Server Agent jobs for maintenance
- Configure database mail for alerts
- Enable Query Store
- Set up monitoring and alerting

### Post-Deployment
- Verify all tables created successfully
- Test all stored procedures
- Run sample data insertion scripts
- Perform initial database backup
- Set up automated backup jobs
- Configure log shipping (if HA required)
- Run health check procedure
- Document connection strings
- Update application configuration

