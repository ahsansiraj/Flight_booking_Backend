# SRS – B2B Flight Ticket Booking Platform

**Version:** 1.0
**Date:** June 2026
**Status:** In Development


---

# 1. Introduction

## 1.1 Purpose

This SRS defines the functional and non-functional requirements for a **B2B Flight Ticket Booking Platform** where:

* The **Admin** (platform owner) manages agents, commissions, payouts, and global settings.
* **Agents** book flight tickets for their customers using a prepaid wallet, earn commissions, and can request payouts.
* The system supports booking, cancellation, refunds, and a full financial ledger (wallet + commissions).

This document is intended to be used for:

* Backend implementation
* Frontend implementation
* Writing test cases
* QA planning
* UAT planning

---

# 2. System Overview

## 2.1 Actors

### 1. Admin

* Owns and manages the platform
* Onboards and controls agents
* Defines commission rules
* Approves payouts and handles disputes

### 2. Agent

* Business partner / travel agency
* Books tickets for customers
* Uses wallet balance for bookings
* Earns commission
* Requests payout

### 3. Customer

* End traveler
* Does not directly use the system (v1)
* Interacts through the agent

### 4. External Systems

* Flight API Provider (search & booking)
* Payment Gateway (wallet recharge)
* Email Provider
* SMS Provider
* Microsoft SQL Server Database

---

# 3. Tech Stack

## 3.1 Backend

* Node.js (v24.16.0)
* Express.js (v5.x)
* mssql (v12.x)
* JSON Web Tokens (JWT)
* bcrypt

## 3.2 Database

* Microsoft SQL Server 2019+
* Dedicated database: `FlightBookingB2B`

### Core Tables

* `users`
* `wallets`
* `wallet_transactions`
* `bookings`
* `flight_bookings`
* `booking_travelers`
* `payments`
* `refunds`
* `commissions`
* `commission_rules`
* `payouts`

### Audit & Security Tables

* `audit.activity_logs`
* `audit.data_change_logs`
* `sec.user_sessions`

## 3.3 Frontend

### Next.js

* `/admin` → Admin Portal
* `/agent` → Agent Portal

## 3.4 Supporting Libraries

* Winston + Morgan (Logging)
* Helmet (Security Headers)
* express-rate-limit
* express-validator
* xss
* hpp
* express-mongo-sanitize

---

# 4. High-Level Architecture

```text
Next.js (Admin UI)          Next.js (Agent UI)
        │                            │
        └──────────── HTTP(S) ───────┘
                     Backend API
                 (Express 5, Node.js)
                         │
                Microsoft SQL Server
                         │
      Flight API / Payment Gateway / Email / SMS
```

---

# 5. Roles & Interactions

## 5.1 Admin ↔ Agent Interaction

### Admin Responsibilities

* Creates agent accounts
* Activates or suspends agents
* Defines commission structures
* Defines wallet policies
* Monitors bookings
* Monitors wallets
* Monitors commissions

### Agent Responsibilities

* Logs into portal
* Recharges wallet
* Searches flights
* Creates bookings
* Requests commission payout
* Downloads tickets and invoices

---

# 6. Core Business Flows

## 6.1 Agent Booking & Commission Flow

### Step 1: Agent Login

* Agent logs in using email/password
* Receives:

  * `accessToken`
  * `refreshToken`

### Step 2: Wallet Check

Agent can view:

* Current balance
* Wallet transactions
* Commission summary

### Step 3: Flight Search

Agent searches flights using:

* Origin
* Destination
* Travel Date
* Passenger Count
* Cabin Class

Backend:

* Checks cache
* Calls Flight API on cache miss
* Returns available flights

### Step 4: Pre-Booking Validation

Backend validates:

* Sufficient wallet balance
* Traveler details
* Contact information

### Step 5: Booking Creation

Creates:

* `bookings`
* `flight_bookings`
* `booking_travelers`

Initial booking status:

```text
INITIATED
```

### Step 6: Supplier Booking

Flight API returns:

* PNR
* Ticket Numbers
* Supplier Booking ID

Booking updated:

```text
CONFIRMED → TICKETED
```

### Step 7: Wallet Debit

Execute:

```sql
sp_WalletDebit
```

Creates wallet transaction:

```text
BOOKING_PAYMENT
```

Stores:

* Debit Amount
* Balance Before
* Balance After

### Step 8: Commission Calculation

Based on:

* Agent Tier
* Airline
* Route Type
* Cabin Class

Commission Record:

```text
PENDING
```

Available after:

```text
24 hours
```

### Step 9: Customer Confirmation

Send:

* Email
* SMS

Includes:

* PNR
* Ticket Details
* Invoice

---

## 6.2 Cancellation & Refund Flow

### Step 1: Cancellation Request

Endpoint:

```http
POST /bookings/:bookingId/cancel
```

Validation:

* Booking exists
* Ownership verification
* Valid booking status
* Cancellation window check

### Step 2: Cancellation Rules

Determine:

* Cancellation charges
* Refund amount
* Non-refundable fees

Formula:

```text
Refund Amount =
Total Amount
- Cancellation Charges
- Non-Refundable Fees
```

### Step 3: Supplier Cancellation

Call Flight API cancellation endpoint.

Receive:

* Cancellation status
* Refund eligibility

### Step 4: Wallet Refund

Execute:

```sql
sp_WalletRefund
```

Creates transaction:

```text
REFUND
```

### Step 5: Commission Reversal

Update commission:

```text
commission_status = REVERSED
```

### Step 6: Booking Status Update

```text
booking_status = CANCELLED
refund_status = PROCESSED
```

### Step 7: Customer Notification

Send:

* Cancellation confirmation
* Refund information

---

## 6.3 Commission & Payout Flow

### Step 1: Commission Accrual

Booking success creates:

```text
commission_status = PENDING
```

### Step 2: Cooling Period

After:

```text
24 hours
```

System updates:

```text
PENDING → APPROVED
```

### Step 3: Payout Request

Endpoint:

```http
POST /commissions/payout/request
```

Validation:

* Minimum amount = ₹500
* Available commission check

Create:

```text
payout_status = REQUESTED
```

Lock related commissions.

### Step 4: Admin Approval

View pending payouts:

```http
GET /admin/payouts/pending
```

Process:

```http
POST /admin/payouts/:id/process
```

### Step 5: Approval Outcome

#### APPROVED

```text
APPROVED → SUCCESS
```

Commissions:

```text
PAID
```

#### REJECTED

```text
LOCKED → APPROVED
```

---

# 7. Functional Requirements

## 7.1 Admin Functional Requirements

### Authentication

* FR-ADMIN-01: Admin can log in using email/password.
* FR-ADMIN-02: Admin receives JWT authentication tokens.

### Agent Management

* FR-ADMIN-03: Create agent.
* FR-ADMIN-04: Update agent.
* FR-ADMIN-05: Deactivate agent.
* FR-ADMIN-06: View wallet, bookings, commissions.
* FR-ADMIN-07: Manual wallet credit/debit.

### Commission Management

* FR-ADMIN-08: Create commission rules.
* FR-ADMIN-09: View commission transactions.
* FR-ADMIN-10: Approve payout requests.
* FR-ADMIN-11: Reject payout requests.

### Booking Management

* FR-ADMIN-12: View all bookings.
* FR-ADMIN-13: Cancel bookings.

### Reporting

* FR-ADMIN-14: Daily booking report.
* FR-ADMIN-15: Revenue report.
* FR-ADMIN-16: Agent performance report.
* FR-ADMIN-17: Wallet summary report.
* FR-ADMIN-18: Payout report.

---

## 7.2 Agent Functional Requirements

### Authentication

* FR-AGENT-01: Login.
* FR-AGENT-02: View profile.

### Wallet

* FR-AGENT-03: View wallet balance.
* FR-AGENT-04: View wallet history.
* FR-AGENT-05: Recharge wallet.
* FR-AGENT-06: Check balance before booking.

### Flight Search & Booking

* FR-AGENT-07: Search flights.
* FR-AGENT-08: Create bookings.
* FR-AGENT-09: Confirm booking only with sufficient balance.

### Cancellation & Refund

* FR-AGENT-10: Cancel booking.
* FR-AGENT-11: Receive wallet refund.
* FR-AGENT-12: Commission reversal.

### Commission & Payout

* FR-AGENT-13: View commission summary.
* FR-AGENT-14: View commission history.
* FR-AGENT-15: Request payout.
* FR-AGENT-16: View payout history.

---

# 8. API Endpoints

> All responses follow:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "pagination": {},
  "timestamp": "2026-06-01T10:00:00Z"
}
```

## 8.1 Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh-token
GET  /api/v1/auth/me
POST /api/v1/auth/change-password
POST /api/v1/auth/logout
```

## 8.2 Wallet

```http
GET  /api/v1/wallet/summary
GET  /api/v1/wallet/balance
POST /api/v1/wallet/recharge
GET  /api/v1/wallet/transactions
POST /api/v1/wallet/check-balance
GET  /api/v1/wallet/reconciliation
```

## 8.3 Bookings

```http
GET  /api/v1/bookings/search
POST /api/v1/bookings
GET  /api/v1/bookings
GET  /api/v1/bookings/:bookingReference
POST /api/v1/bookings/:bookingId/cancel
```

## 8.4 Commissions

```http
GET  /api/v1/commissions/summary
GET  /api/v1/commissions/history
POST /api/v1/commissions/payout/request
GET  /api/v1/commissions/payout/history
```

## 8.5 Admin

```http
GET  /api/v1/admin/bookings
GET  /api/v1/admin/bookings/:bookingReference
POST /api/v1/admin/bookings/:bookingId/cancel
GET  /api/v1/admin/payouts/pending
POST /api/v1/admin/payouts/:payoutId/process
POST /api/v1/admin/commission-rules
GET  /api/v1/admin/commission-rules
```

---

# 9. Security Implementation

## Authentication

* JWT Authentication
* Access Token: 15 Minutes
* Refresh Token: 7 Days
* HttpOnly Cookies

## Authorization

* Role-Based Access Control (RBAC)
* Admin
* Agent

## Data Protection

* bcrypt (12 rounds)
* AES-256 encryption
* SQL Server TDE

## API Protection

* Helmet
* CORS
* Rate Limiting
* Input Validation
* XSS Protection
* HPP Protection
* Parameterized Queries

## Audit Logging

* User Activity Logs
* Security Events
* Login Failures
* Database Change Logs

---

# 10. Non-Functional Requirements

## Performance

* API p95 latency < 200 ms
* Flight search p95 latency < 2 seconds

## Scalability

* Horizontal API scaling
* Database indexing
* Partitioned ledger tables

## Availability

* Target uptime: 99.9%
* Automated backups
* Restore testing

## Security

* Periodic security reviews
* Secure secrets management
* Vulnerability monitoring

---

# 11. Usage for Test Cases

This SRS defines:

* Booking workflows
* Cancellation workflows
* Refund workflows
* Wallet workflows
* Commission workflows
* Payout workflows
* Security requirements
* API requirements

QA Engineers can derive:

* Positive test cases
* Negative test cases
* Boundary value tests
* Security test cases
* Integration test cases
* End-to-end booking tests

### Example E2E Flow

```text
Agent Registration
    ↓
Login
    ↓
Wallet Recharge
    ↓
Flight Search
    ↓
Booking Creation
    ↓
Commission Earned
    ↓
Payout Request
    ↓
Admin Approval
```
