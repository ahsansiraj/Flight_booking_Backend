# Flight Booking Platform - Database Schema Diagram
## Complete Entity Relationship Diagram (ERD)

---

## LEGEND:
```text
═══════════════════════════════════════════════════════════════
│ PK = Primary Key                                             │
│ FK = Foreign Key                                             │
│ ──── = One-to-Many Relationship                             │
│ ═══> = Foreign Key Reference                                │
│ [1:N] = One to Many                                          │
│ [N:M] = Many to Many (with junction table)                  │
═══════════════════════════════════════════════════════════════
```

---

## CORE B2B & IDENTITY LAYER
```text
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────┐
│        USERS            │ (Admin, Agents, Staff)
├─────────────────────────┤
│ PK  user_id            │
│     user_uuid          │
│     username (UNIQUE)  │
│     email (UNIQUE)     │
│     password_hash      │
│     first_name         │
│     last_name          │
│     user_type          │
│     status             │
│     created_at         │
└─────────────────────────┘
         │
         │ [1:1]
         │
         ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│       WALLETS           │         │    WALLET_TRANSACTIONS  │
├─────────────────────────┤         ├─────────────────────────┤
│ PK  wallet_id          │         │ PK  transaction_id     │
│ FK  user_id ═══════════>│ [1:N]   │ FK  wallet_id ════════>│
│     balance            │────┬───>│     transaction_type   │
│     commission_balance │    │     │     amount             │
│     status             │    │     │     balance_before     │
│     created_at         │    │     │     balance_after      │
└─────────────────────────┘    │     │     transaction_status │
                               │     │     reference_type     │
                               │     │     reference_id       │
                               │     └─────────────────────────┘
                               │
                               │ [1:N]
                               ▼
                        ┌─────────────────────────┐
                        │        PAYOUTS          │
                        ├─────────────────────────┤
                        │ PK  payout_id          │
                        │ FK  user_id ═══════════>│
                        │     amount             │
                        │     status             │
                        │     payout_method      │
                        │     bank_details       │
                        │     processed_by       │
                        │     created_at         │
                        └─────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## CUSTOMER MANAGEMENT LAYER
```text
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                        CUSTOMERS                            │
├─────────────────────────────────────────────────────────────┤
│ PK  customer_id (BIGINT)                                   │
│     customer_uuid (UNIQUEIDENTIFIER)                       │
│ FK  referred_by_user_id ═════> USERS                       │
│     email (UNIQUE)                                         │
│     phone (UNIQUE)                                         │
│     password_hash                                          │
│     first_name, last_name                                  │
│     date_of_birth                                          │
│     nationality                                            │
│     primary_id_type, primary_id_number                     │
│     address_line1, city, state, country                    │
│     customer_type, loyalty_tier, loyalty_points            │
│     status                                                 │
│     registered_at, last_login_at                           │
│     total_bookings, total_spent                            │
└─────────────────────────────────────────────────────────────┘
         │
         │ [1:N]
         │
         ├──────────────────┬───────────────────┐
         ▼                  ▼                   ▼
┌──────────────────┐  ┌────────────────┐  ┌──────────────────────┐
│   TRAVELERS      │  │   BOOKINGS     │  │   NOTIFICATIONS      │
├──────────────────┤  │  (see below)   │  ├──────────────────────┤
│ PK traveler_id  │  └────────────────┘  │ PK notification_id  │
│ FK customer_id ═>│                     │ FK customer_id ═════>│
│    first_name   │                     │    title, message   │
│    last_name    │                     │    priority         │
│    date_of_birth│                     │    is_read          │
│    nationality  │                     │    created_at       │
│    document_type│                     └──────────────────────┘
│    document_no  │
│    traveler_type│
│    is_primary   │
└──────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## BOOKING MANAGEMENT LAYER (CORE)
```text
═══════════════════════════════════════════════════════════════════════════════

                        ┌──────────────────────────────────────────────────────┐
                        │                    BOOKINGS (Master)                 │
                        ├──────────────────────────────────────────────────────┤
                        │ PK  booking_id (BIGINT)                             │
                        │     booking_uuid (UNIQUEIDENTIFIER)                 │
                        │     booking_reference (UNIQUE) "BKG2025012345"      │
                        │ FK  customer_id ═══════> CUSTOMERS                  │
                        │ FK  booked_by_user_id ═> USERS (agent who booked)  │
                        │     pnr (supplier reference)                        │
                        │     booking_type: 'FLIGHT'                          │
                        │     booking_source: 'WEB', 'MOBILE', 'API'          │
                        │     origin_code, destination_code                   │
                        │     journey_type: 'ONE_WAY', 'ROUND_TRIP'           │
                        │     travel_start_date, travel_end_date              │
                        │     total_travelers, adults_count, children_count   │
                        │     currency, base_fare, taxes, fees                │
                        │     total_amount                                    │
                        │     commission_amount, commission_percentage        │
                        │     payment_status: 'PENDING', 'PAID', etc.         │
                        │     booking_status: 'CONFIRMED', 'CANCELLED', etc.  │
                        │     supplier_code, supplier_booking_id              │
                        │     confirmation_number, ticket_numbers (JSON)      │
                        │     cancellation_charges, refund_amount             │
                        │     contact_email, contact_phone                    │
                        │     booking_date, confirmed_at, cancelled_at        │
                        │     created_at, updated_at                          │
                        └──────────────────────────────────────────────────────┘
                                    │
                                    │ [1:N]
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌───────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  FLIGHT_BOOKINGS      │ │  BOOKING_TRAVELERS   │ │    PAYMENTS          │
├───────────────────────┤ │   (Junction Table)   │ ├──────────────────────┤
│ PK flight_booking_id │ ├──────────────────────┤ │ PK payment_id       │
│ FK booking_id ═══════>│ │ PK booking_traveler_id│ │ FK booking_id ══════>│
│    airline_code      │ │ FK booking_id ════════>│ │    payment_reference│
│    airline_name      │ │ FK traveler_id ═════> │ │    transaction_id   │
│    flight_number     │ │    traveler_type     │ │    amount           │
│    origin_airport    │ │    ticket_number     │ │    amount           │
│    destination_airport│ │    seat_number       │ │    payment_method   │
│    departure_datetime│ │    meal_preference   │ │    payment_gateway  │
│    arrival_datetime  │ │    baggage_allowance │ │    payment_status   │
│    cabin_class       │ └──────────────────────┘ │    gateway_order_id │
│    booking_class     │          │               │    card_last_four   │
│    fare_type         │          │ [N:M]         │    initiated_at     │
│    baggage_allowance │          │               │    captured_at      │
│    is_direct         │          ▼               │    gateway_response │
│    flight_status     │  TRAVELERS (above)       │    is_reconciled    │
│    supplier_data     │                          └──────────────────────┘
└───────────────────────┘                                  │
          │                                                │ [1:N]
          │ [1:1]                                          │
          ▼                                                ▼
┌───────────────────────┐                        ┌──────────────────────┐
│  FLIGHT_FARE_RULES    │                        │      REFUNDS         │
├───────────────────────┤                        ├──────────────────────┤
│ PK fare_rule_id      │                        │ PK refund_id        │
│ FK booking_id ═══════>│                        │ FK booking_id ══════>│
│ FK flight_booking_id >│                        │ FK payment_id ══════>│
│    fare_basis_code   │                        │    refund_reference │
│    fare_type         │                        │    refund_amount    │
│    is_cancellable    │                        │    cancellation_chg │
│    cancellation_rules│                        │    net_refund_amt   │
│    (JSON)            │                        │    refund_reason    │
│    date_change_rules │                        │    refund_status    │
│    baggage_rules     │                        │    initiated_by     │
│    terms_conditions  │                        │    processed_at     │
└───────────────────────┘                        └──────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## FINANCIAL & COMMISSION LAYER
```text
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                      COMMISSIONS                            │
├─────────────────────────────────────────────────────────────┤
│ PK  commission_id                                          │
│     commission_uuid                                        │
│ FK  booking_id ════════> BOOKINGS                          │
│ FK  user_id ═══════════> USERS (specific agent)            │
│     booking_type: 'FLIGHT'                                 │
│     base_amount                                            │
│     commission_percentage                                  │
│     commission_amount                                      │
│     incentive_amount                                       │
│     total_commission                                       │
│     tds_percentage, tds_amount                             │
│     net_commission                                         │
│     commission_status: 'PENDING', 'APPROVED', 'PAID'       │
│     settlement_cycle: 'WEEKLY', 'MONTHLY'                  │
│     settlement_date, settlement_reference                  │
│     created_at, paid_at                                    │
└─────────────────────────────────────────────────────────────┘
         │
         │ Referenced by
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMMISSION_RULES                           │
├─────────────────────────────────────────────────────────────┤
│ PK  rule_id                                                │
│ FK  user_id (NULL for global rules)                        │
│     rule_name                                              │
│     rule_type: 'PERCENTAGE', 'FLAT', 'TIERED'              │
│     booking_type, cabin_class, airline_code                │
│     is_domestic (filter)                                   │
│     commission_percentage, flat_amount                     │
│     tier_structure (JSON for tiered)                       │
│     valid_from, valid_until                                │
│     priority                                               │
│     is_active                                              │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                        INVOICES                             │
├─────────────────────────────────────────────────────────────┤
│ PK  invoice_id                                             │
│     invoice_uuid                                           │
│ FK  booking_id ════════> BOOKINGS                          │
│ FK  customer_id ═══════> CUSTOMERS                         │
│     invoice_number (UNIQUE) "INV-2025-00001"               │
│     invoice_date, due_date                                 │
│     financial_year: '2024-25'                              │
│     bill_to_name, bill_to_email, bill_to_gstin             │
│     bill_from_name, bill_from_gstin                        │
│     base_fare                                              │
│     cgst_percentage, cgst_amount (Central GST - India)     │
│     sgst_percentage, sgst_amount (State GST)               │
│     igst_percentage, igst_amount (Integrated GST)          │
│     service_fee, convenience_fee                           │
│     discount_amount                                        │
│     grand_total                                            │
│     payment_status: 'PAID', 'UNPAID', 'OVERDUE'            │
│     invoice_status: 'DRAFT', 'SENT', 'PAID'                │
│     pdf_url                                                │
│     created_at, updated_at                                 │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## MASTER DATA LAYER (Reference Tables)
```text
═══════════════════════════════════════════════════════════════════════════════

┌────────────────────────┐              ┌────────────────────────┐
│      AIRLINES          │              │      AIRPORTS          │
├────────────────────────┤              ├────────────────────────┤
│ PK  airline_id        │              │ PK  airport_id        │
│     iata_code (UNIQUE)│              │     iata_code (UNIQUE)│
│     icao_code         │              │     icao_code         │
│     airline_name      │              │     airport_name      │
│     country           │              │     city              │
│     website           │              │     city_code         │
│     logo_url          │              │     state             │
│     airline_type      │              │     country           │
│     alliance          │              │     latitude          │
│     is_active         │              │     longitude         │
└────────────────────────┘              │     timezone          │
         │                              │     airport_type      │
         │ Referenced in               │     is_active         │
         │ flight_bookings             └────────────────────────┘
         │                                      │
         │                                      │ Referenced in
         │                                      │ flight_bookings
         │                                      │
         └──────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## SEARCH & INVENTORY LAYER
```text
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                  FLIGHT_SEARCH_CACHE                        │
├─────────────────────────────────────────────────────────────┤
│ PK  search_cache_id                                        │
│     search_key (MD5 hash of search params)                 │
│     origin, destination                                    │
│     departure_date, return_date                            │
│     journey_type, cabin_class                              │
│     adults_count, children_count, infants_count            │
│     supplier_code                                          │
│     search_results (JSON - array of flights)               │
│     results_count                                          │
│     min_price, max_price                                   │
│     searched_at                                            │
│     expires_at (cache expiry - 5-15 mins)                  │
│     api_response_time_ms                                   │
└─────────────────────────────────────────────────────────────┘
        Note: This table is for caching flight search results
              from third-party APIs to reduce API calls

═══════════════════════════════════════════════════════════════════════════════
```


## COMMUNICATION LAYER
```text
═══════════════════════════════════════════════════════════════════════════════

┌────────────────────────┐              ┌────────────────────────┐
│     EMAIL_LOGS         │              │      SMS_LOGS          │
├────────────────────────┤              ├────────────────────────┤
│ PK  email_log_id      │              │ PK  sms_log_id        │
│ FK  tenant_id         │              │ FK  tenant_id         │
│     to_email          │              │     phone_number      │
│     subject           │              │     message_text      │
│     body_html         │              │     sms_type          │
│     email_type        │              │     reference_type    │
│     reference_type    │              │     reference_id      │
│     reference_id ═════╬═════> BOOKINGS│     provider          │
│     provider          │              │     provider_msg_id   │
│     provider_msg_id   │              │     sms_status        │
│     email_status      │              │     sent_at           │
│     sent_at           │              │     delivered_at      │
│     delivered_at      │              │     cost              │
│     opened_at         │              │     created_at        │
│     bounced_at        │              └────────────────────────┘
│     created_at        │
└────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## SECURITY & SESSION MANAGEMENT SCHEMA (sec)
```text
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                    sec.USER_SESSIONS                        │
├─────────────────────────────────────────────────────────────┤
│ PK  session_id (VARCHAR - UUID)                            │
│ FK  user_id ═══════════> USERS (for agents/staff)          │
│ FK  customer_id ═══════> CUSTOMERS (for end customers)     │
│     session_token (hashed JWT)                             │
│     refresh_token                                          │
│     device_type: 'DESKTOP', 'MOBILE', 'TABLET'             │
│     browser, operating_system                              │
│     ip_address, country, city                              │
│     is_active                                              │
│     created_at, last_activity_at                           │
│     expires_at, logged_out_at                              │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                      sec.API_KEYS                           │
├─────────────────────────────────────────────────────────────┤
│ PK  api_key_id                                             │
│ FK  user_id ═══════════> USERS                             │
│     key_name                                               │
│     api_key (hashed)                                       │
│     api_secret (hashed)                                    │
│     scopes (JSON: permissions array)                       │
│     rate_limit_per_minute, rate_limit_per_day              │
│     allowed_ips (JSON whitelist)                           │
│     is_active                                              │
│     last_used_at, total_requests                           │
│     expires_at, created_at                                 │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## AUDIT SCHEMA (audit)
```text
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                  audit.ACTIVITY_LOGS                        │
├─────────────────────────────────────────────────────────────┤
│ PK  activity_log_id                                        │
│     actor_type: 'USER', 'CUSTOMER', 'SYSTEM', 'API'        │
│     actor_id (user_id or customer_id)                      │
│     actor_email                                            │
│     action: 'USER_LOGIN', 'BOOKING_CREATED', etc.          │
│     entity_type: 'BOOKING', 'CUSTOMER', 'PAYMENT'          │
│     entity_id                                              │
│     description                                            │
│     changes (JSON: old vs new values)                      │
│     ip_address, user_agent                                 │
│     request_method, request_url                            │
│     session_id                                             │
│     status: 'SUCCESS', 'FAILED'                            │
│     error_message                                          │
│     response_time_ms                                       │
│     created_at                                             │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│               audit.DATA_CHANGE_LOGS                        │
│               (Populated by triggers)                       │
├─────────────────────────────────────────────────────────────┤
│ PK  change_log_id                                          │
│     schema_name, table_name                                │
│     operation_type: 'INSERT', 'UPDATE', 'DELETE'           │
│     primary_key_value                                      │
│     old_values (JSON - for UPDATE/DELETE)                  │
│     new_values (JSON - for INSERT/UPDATE)                  │
│     changed_columns (JSON array)                           │
│     changed_by (user_id)                                   │
│     application_name                                       │
│     changed_at                                             │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## ANALYTICS SCHEMA (analytics)
```text
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│            analytics.DAILY_BOOKING_SUMMARY                  │
│            (Pre-aggregated metrics)                         │
├─────────────────────────────────────────────────────────────┤
│ PK  summary_id                                             │
│     summary_date (DATE)                                    │
│     booking_type: 'FLIGHT'                                 │
│     origin_code, destination_code                          │
│     total_bookings, confirmed_bookings                     │
│     cancelled_bookings, failed_bookings                    │
│     total_passengers                                       │
│     total_revenue, total_commission                        │
│     total_refunds, net_revenue                             │
│     total_paid_amount, pending_payment_amount              │
│     new_customers, returning_customers                     │
│     avg_booking_value, conversion_rate                     │
│     calculated_at                                          │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│            analytics.AGENT_PERFORMANCE                      │
├─────────────────────────────────────────────────────────────┤
│ PK  performance_id                                         │
│     period_type: 'DAILY', 'WEEKLY', 'MONTHLY'              │
│     period_start_date, period_end_date                     │
│ FK  user_id ═══════════> USERS                             │
│     total_bookings, successful_bookings                    │
│     cancelled_bookings                                     │
│     total_revenue, total_commission_earned                 │
│     commission_paid, commission_pending                    │
│     customers_acquired, total_customers                    │
│     avg_booking_value, avg_commission_per_booking          │
│     customer_satisfaction_score                            │
│     rank_in_tenant, rank_overall                           │
│     calculated_at                                          │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│       analytics.MV_AGENT_PERFORMANCE_DAILY                  │
│       (Materialized View - Refreshed Nightly)               │
├─────────────────────────────────────────────────────────────┤
│ PK  (user_id, performance_date)                            │
│ FK  user_id                                                │
│     performance_date                                       │
│     bookings_count, revenue_generated                      │
│     commission_earned, customers_acquired                  │
│     last_updated                                           │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## SYSTEM CONFIGURATION
```text
═══════════════════════════════════════════════════════════════════════════════

┌────────────────────────┐
│  SYSTEM_SETTINGS       │
│  (Global Config)       │
├────────────────────────┤
│ PK  setting_id        │
│     setting_key       │
│     setting_value     │
│     setting_type      │
│     category          │
│     is_encrypted      │
│     is_public         │
└────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
```


## COMPLETE RELATIONSHIP FLOW DIAGRAM
```text
═══════════════════════════════════════════════════════════════════════════════

                                USERS (Admin/Agent)
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
                 WALLETS         SESSIONS       CUSTOMERS
                    │               │               │
              ┌─────┼─────┐         ▼          ┌────┼────┐
              ▼           ▼      API_KEYS      ▼         ▼
        TRANSACTIONS   PAYOUTS               TRAVELERS  BOOKINGS
                                                        │
                                              ┌─────────┼─────────┐
                                              ▼         ▼         ▼
                                      FLIGHT_   BOOKING_   PAYMENTS
                                      BOOKINGS  TRAVELERS      │
                                          │                    ▼
                                          ▼                 REFUNDS
                                    FARE_RULES
                                    
        BOOKINGS also connects to:
            ├─> COMMISSIONS
            ├─> INVOICES
            ├─> EMAIL_LOGS
            ├─> SMS_LOGS
            └─> NOTIFICATIONS

═══════════════════════════════════════════════════════════════════════════════
```


## KEY RELATIONSHIPS SUMMARY
```text
═══════════════════════════════════════════════════════════════════════════════

1. USERS (Admin/Agents) - Root entity
   └─> Has one WALLET
   └─> Has many WALLET_TRANSACTIONS and PAYOUTS
   └─> Has many CUSTOMERS (registered through them)
   └─> Has many BOOKINGS
   └─> Has API_KEYS

2. CUSTOMERS
   └─> Belong to USER
   └─> Have many TRAVELERS (saved passenger profiles)
   └─> Have many BOOKINGS
   └─> Receive NOTIFICATIONS

3. BOOKINGS (Central entity)
   └─> Belongs to CUSTOMER
   └─> Created by USER (Agent)
   └─> Has one FLIGHT_BOOKING (for flight type)
   └─> Has many BOOKING_TRAVELERS (N:M with TRAVELERS)
   └─> Has many PAYMENTS
   └─> Generates COMMISSION
   └─> Generates INVOICE
   └─> Triggers EMAIL_LOGS and SMS_LOGS
   └─> Has FLIGHT_FARE_RULES

4. PAYMENTS
   └─> Belong to BOOKING
   └─> Can have REFUNDS

5. FLIGHT_BOOKINGS
   └─> Belongs to BOOKING
   └─> References AIRLINES (master data)
   └─> References AIRPORTS (master data)
   └─> Has FLIGHT_FARE_RULES

6. COMMISSIONS
   └─> Generated from BOOKINGS
   └─> Assigned to USER
   └─> Follows COMMISSION_RULES

7. AUDIT & SECURITY
   └─> ACTIVITY_LOGS track all user actions
   └─> DATA_CHANGE_LOGS track all database changes
   └─> USER_SESSIONS manage authentication
   └─> API_KEYS manage API access

8. ANALYTICS
   └─> DAILY_BOOKING_SUMMARY (aggregated daily metrics)
   └─> AGENT_PERFORMANCE (periodic performance reports)
   └─> MV_AGENT_PERFORMANCE_DAILY (materialized view)

═══════════════════════════════════════════════════════════════════════════════
```


## DATABASE SCHEMAS ORGANIZATION
```text
═══════════════════════════════════════════════════════════════════════════════

dbo (default schema)
├── Core business tables (users, wallets, customers, bookings, etc.)
├── Master data (airlines, airports)
└── Configuration (settings, commission_rules)

sec (security schema)
├── user_sessions
└── api_keys

audit (audit schema)
├── activity_logs
└── data_change_logs

analytics (analytics schema)
├── daily_booking_summary
├── agent_performance
└── mv_agent_performance_daily

archive (archive schema)
└── bookings (archived old bookings)

═══════════════════════════════════════════════════════════════════════════════
```


## INDEXES SUMMARY (Critical for Performance)
```text
═══════════════════════════════════════════════════════════════════════════════

HIGH-PRIORITY INDEXES:

bookings:
  - Clustered: booking_id
  - Unique: booking_uuid, booking_reference
  - Non-Clustered: (booked_by_user_id, booking_status, booking_date)
  - Non-Clustered: (customer_id, booking_date)
  - Non-Clustered: (pnr)
  - Columnstore: For analytics queries

customers:
  - Clustered: customer_id
  - Unique: email, phone, customer_uuid
  - Non-Clustered: (referred_by_user_id, status)

payments:
  - Clustered: payment_id
  - Non-Clustered: (booking_id)
  - Non-Clustered: (payment_status, created_at)
  - Non-Clustered: (is_reconciled, settlement_date)

flight_bookings:
  - Clustered: flight_booking_id
  - Non-Clustered: (booking_id)
  - Non-Clustered: (origin_airport, destination_airport, departure_datetime)

commissions:
  - Clustered: commission_id
  - Non-Clustered: (user_id, commission_status, created_at)
  - Non-Clustered: (settlement_date)

flight_search_cache:
  - Non-Clustered: (origin, destination, departure_date, expires_at)
  - Auto-cleanup: DELETE WHERE expires_at < GETUTCDATE() - 1 hour

airports, airlines:
  - Full-text index for search functionality

═══════════════════════════════════════════════════════════════════════════════
```


## DATA FLOW: TYPICAL FLIGHT BOOKING TRANSACTION
```text
═══════════════════════════════════════════════════════════════════════════════

1. Customer searches for flights
   ↓
   flight_search_cache (cache results for 5-15 mins)

2. Customer selects flight and proceeds
   ↓
   INSERT INTO bookings (status: 'INITIATED', payment_status: 'PENDING')
   ↓
   INSERT INTO flight_bookings (flight details)
   ↓
   INSERT INTO booking_travelers (passenger details)
   ↓
   INSERT INTO flight_fare_rules (cancellation policy)

3. Customer makes payment
   ↓
   INSERT INTO payments (status: 'INITIATED')
   ↓
   UPDATE payments (status: 'SUCCESS' after gateway confirmation)
   ↓
   UPDATE bookings (payment_status: 'PAID', booking_status: 'CONFIRMED')

4. System processes booking
   ↓
   Call third-party API to confirm booking
   ↓
   UPDATE bookings (pnr, confirmation_number, status: 'TICKETED')
   ↓
   INSERT INTO commissions (calculate and record commission)
   ↓
   INSERT INTO invoices (generate tax invoice)
   ↓
   INSERT INTO email_logs (send confirmation email)
   ↓
   INSERT INTO sms_logs (send confirmation SMS)
   ↓
   INSERT INTO notifications (in-app notification)

5. Audit trail
   ↓
   INSERT INTO audit.activity_logs (log all actions)
   ↓
   Triggers populate audit.data_change_logs

6. Analytics (end of day)
   ↓
   analytics.sp_RefreshAgentPerformance
   ↓
   UPDATE analytics.daily_booking_summary
   ↓
   UPDATE analytics.mv_agent_performance_daily

═══════════════════════════════════════════════════════════════════════════════
```


## TOTAL TABLE COUNT: 36 TABLES
```text
═══════════════════════════════════════════════════════════════════════════════

Core Schema (dbo): 21 tables
├── users
├── wallets
├── wallet_transactions
├── payouts
├── customers
├── travelers
├── bookings
├── booking_travelers
├── flight_bookings
├── flight_fare_rules
├── payments
├── refunds
├── commissions
├── commission_rules
├── invoices
├── airlines
├── airports
├── flight_search_cache
├── notifications
├── email_logs
├── sms_logs
└── system_settings

Security Schema (sec): 2 tables
├── user_sessions
└── api_keys

Audit Schema (audit): 2 tables
├── activity_logs
└── data_change_logs

Analytics Schema (analytics): 3 tables
├── daily_booking_summary
├── agent_performance
└── mv_agent_performance_daily

Archive Schema (archive): 1 table
└── bookings

Views: 5+
├── vw_TenantMonthlyRevenue (indexed view)
├── vw_CurrentBlockingQueries
├── vw_LongRunningQueries
├── vw_DatabaseSizeStats
└── (additional custom views as needed)

═══════════════════════════════════════════════════════════════════════════════
```