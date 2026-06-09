# Product Requirements Document (PRD)
## B2B Agent Booking Platform

### Version: 1.0
### Date: January 2025
### Status: Initial Design

---

## 1. Executive Summary

### 1.1 Product Vision
Build a single-tenant, scalable B2B integrated platform where the admin is the supreme controller and registered agents book flights, hotels, and bus services for customers. It includes a comprehensive wallet ledger system, automated agent commission tracking, and payout mechanisms.

### 1.2 Business Objectives
- Handle 10,000+ concurrent users
- Support a large base of booking agents (B2B model)
- Process 1000+ bookings per hour
- 99.9% uptime SLA
- Real-time inventory management
- Robust ledger-based Wallet system for agent recharge and booking deductions
- Complete accounting proof for commission tracking and payout settlements

---

## 2. Stakeholders

### 2.1 Primary Users
- **Admin**: Platform owner and supreme controller managing the software, agent approvals, wallet recharges, and payouts.
- **Agents (B2B)**: Registered travel agents who maintain a wallet balance to book tickets for their customers and earn commissions.
- **Customers**: End passengers whose travel services are booked through agents.
- **API Partners**: Third-party service providers

---

## 3. Functional Requirements

### 3.1 Customer Panel

#### 3.1.1 User Management
- **FR-001**: User registration with email/phone verification
- **FR-002**: Social login (Google, Facebook)
- **FR-003**: Profile management (personal details, preferences)
- **FR-004**: Password reset and account recovery
- **FR-005**: Multi-factor authentication (MFA)

#### 3.1.2 Search & Discovery
- **FR-006**: Flight search (one-way, round-trip, multi-city)
- **FR-007**: Hotel search with filters (location, price, amenities)
- **FR-008**: Bus search with route and operator filters
- **FR-009**: Advanced filters (price range, timing, class)
- **FR-010**: Sort results (price, duration, rating)
- **FR-011**: Search history and saved searches

#### 3.1.3 Booking Management
- **FR-012**: Select and hold inventory
- **FR-013**: Passenger details entry
- **FR-014**: Seat/room selection
- **FR-015**: Add-ons (meals, baggage, insurance)
- **FR-016**: Price calculation with taxes and fees
- **FR-017**: Multiple payment options
- **FR-018**: Booking confirmation with PNR/reference
- **FR-019**: E-ticket generation (PDF)
- **FR-020**: Booking modification and cancellation
- **FR-021**: Refund processing

#### 3.1.4 User Dashboard
- **FR-022**: View upcoming bookings
- **FR-023**: View booking history
- **FR-024**: Download invoices and tickets
- **FR-025**: Manage travelers (frequent flyers)
- **FR-026**: Wishlist/saved itineraries

### 3.2 Agent Panel

#### 3.2.1 Dashboard & Analytics
- **FR-027**: Wallet balance and Commission balance overview
- **FR-028**: Wallet transaction ledger (recharges, booking deductions, payouts)
- **FR-029**: Commission dashboard (daily, monthly, yearly)
- **FR-030**: Booking analytics (volume, revenue)
- **FR-031**: Top performing routes/services

#### 3.2.2 Wallet & Payouts
- **FR-031a**: Wallet recharge requests (topping up account balance)
- **FR-031b**: Payout/withdrawal requests from commission balance
- **FR-031c**: Download wallet ledger statements

#### 3.2.2 Booking Management
- **FR-032**: Create bookings on behalf of customers
- **FR-033**: Manage customer bookings
- **FR-034**: Bulk booking capabilities
- **FR-035**: Corporate client management
- **FR-036**: Commission tracking per booking

#### 3.2.3 Customer Management
- **FR-037**: View registered customers
- **FR-038**: Customer booking history
- **FR-039**: Customer segmentation
- **FR-040**: Communication tools (email, SMS)

#### 3.2.4 Financial Management
- **FR-041**: Ledger transaction tracking (double-entry proof)
- **FR-042**: Payment and recharge reconciliation
- **FR-043**: Invoice generation
- **FR-044**: Tax reports (GST compliance)

### 3.3 Admin Panel

#### 3.3.1 Platform & Agent Management
- **FR-045**: Agent onboarding, approval, and suspension
- **FR-046**: Manage agent wallet balances and approve recharge transactions
- **FR-047**: Approve and process agent payout requests
- **FR-048**: Configure global and agent-specific commission rules
- **FR-049**: Service provider (API) management
- **FR-049a**: Platform configuration and settings
- **FR-049b**: Fee and markup management
- **FR-049c**: Global wallet ledger and accounting oversight

#### 3.3.2 Operations
- **FR-050**: System-wide booking management
- **FR-051**: Dispute resolution
- **FR-052**: Refund approval workflow
- **FR-053**: Customer support ticketing
- **FR-054**: Fraud detection and prevention

#### 3.3.3 Reporting & Analytics
- **FR-055**: Platform-wide revenue reports
- **FR-056**: Agent performance reports
- **FR-057**: Customer behavior analytics
- **FR-058**: System performance monitoring
- **FR-059**: Audit logs and compliance reports

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR-001**: API response time < 200ms (95th percentile)
- **NFR-002**: Search results load time < 2 seconds
- **NFR-003**: Support 10,000 concurrent users
- **NFR-004**: Database query time < 100ms
- **NFR-005**: Page load time < 3 seconds

### 4.2 Scalability
- **NFR-006**: Horizontal scaling capability
- **NFR-007**: Auto-scaling based on load
- **NFR-008**: Database sharding support
- **NFR-009**: Cache layer (Redis) for frequent queries
- **NFR-010**: CDN for static assets

### 4.3 Security
- **NFR-011**: SSL/TLS encryption for all communications
- **NFR-012**: PCI DSS compliance for payments
- **NFR-013**: Data encryption at rest
- **NFR-014**: Role-based access control (RBAC)
- **NFR-015**: SQL injection prevention
- **NFR-016**: XSS and CSRF protection
- **NFR-017**: Rate limiting and DDoS protection
- **NFR-018**: Regular security audits
- **NFR-019**: GDPR and data privacy compliance
- **NFR-020**: Session management and timeout

### 4.4 Reliability
- **NFR-021**: 99.9% uptime SLA
- **NFR-022**: Automatic failover
- **NFR-023**: Database replication (master-slave)
- **NFR-024**: Regular automated backups
- **NFR-025**: Disaster recovery plan (RPO < 1 hour, RTO < 4 hours)

### 4.5 Maintainability
- **NFR-026**: Comprehensive API documentation
- **NFR-027**: Code coverage > 80%
- **NFR-028**: Logging and monitoring (ELK stack)
- **NFR-029**: Automated deployment (CI/CD)
- **NFR-030**: Database migration management

### 4.6 Usability
- **NFR-031**: Mobile-responsive design
- **NFR-032**: Multi-language support (English, Hindi)
- **NFR-033**: Accessibility compliance (WCAG 2.1)
- **NFR-034**: Intuitive user interface

---

## 5. System Architecture Overview

### 5.1 Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: MS SQL Server (replacing MySQL references)
- **ORM**: Sequelize (configured for MS SQL Server)
- **Caching**: Redis
- **Message Queue**: RabbitMQ/Bull
- **Container**: Docker
- **Orchestration**: Kubernetes (future)
- **API Gateway**: Kong/Express Gateway

### 5.2 Integration Points
- Third-party flight API providers
- Payment gateways (Razorpay, PayU, Stripe)
- SMS gateway (Twilio, MSG91)
- Email service (SendGrid, AWS SES)
- Hotel booking APIs
- Bus booking APIs

---

## 6. User Stories

### 6.1 Customer Stories
- **US-001**: As a customer, I want to search for flights by route and date
- **US-002**: As a customer, I want to compare prices across different airlines
- **US-003**: As a customer, I want to book a flight and receive confirmation
- **US-004**: As a customer, I want to cancel my booking and get a refund
- **US-005**: As a customer, I want to save my frequent travelers

### 6.2 Agent Stories
- **US-006**: As an agent, I want to recharge my wallet to maintain a booking balance
- **US-007**: As an agent, I want ticket costs automatically deducted from my wallet
- **US-008**: As an agent, I want to track my wallet ledger for complete accounting proof
- **US-009**: As an agent, I want to view my total commission earned and request payouts

### 6.3 Admin Stories
- **US-010**: As an admin, I want to be the supreme leader with full control over the platform
- **US-011**: As an admin, I want to approve agent wallet recharges and payout requests
- **US-012**: As an admin, I want to monitor the global wallet ledger and agent balances
- **US-013**: As an admin, I want to configure commission structures and generate financial reports

---

## 7. Data Requirements

### 7.1 Data Retention
- Active bookings: Real-time access
- Completed bookings: 7 years (tax compliance)
- User activity logs: 2 years
- Search history: 90 days

### 7.2 Data Privacy
- PII encryption
- Right to be forgotten (GDPR)
- Data masking for non-production environments
- Audit trail for data access

---

## 8. Success Metrics

### 8.1 Technical KPIs
- System uptime: 99.9%
- Average response time: < 200ms
- Error rate: < 0.1%
- Concurrent users supported: 10,000+

### 8.2 Business KPIs
- Booking conversion rate: > 3%
- Customer retention: > 60%
- Agent growth: 20% MoM
- Revenue growth: 30% QoQ

---

## 9. Release Plan

### Phase 1 (MVP - 3 months)
- User registration and authentication
- Flight search and booking
- Basic agent dashboard
- Admin panel (core features)

### Phase 2 (4-6 months)
- Hotel booking integration
- Bus booking integration
- Advanced analytics
- Mobile app

### Phase 3 (7-12 months)
- AI-powered recommendations
- Dynamic pricing
- Loyalty program
- International expansion

---

## 10. Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Third-party API downtime | High | Medium | Multiple API providers, fallback mechanisms |
| Payment gateway failures | High | Low | Multiple payment options, retry logic |
| Data breach | Critical | Low | Security audits, encryption, compliance |
| Scalability issues | High | Medium | Load testing, auto-scaling, caching |
| Regulatory changes | Medium | Medium | Legal consultation, flexible architecture |

---

## 11. Assumptions and Dependencies

### Assumptions
- Third-party APIs provide reliable data
- Payment gateways have 99%+ uptime
- Users have stable internet connectivity

### Dependencies
- API provider contracts
- Payment gateway integration
- SMS/Email service providers
- Cloud infrastructure availability

---

## 12. Glossary

- **PNR**: Passenger Name Record
- **GDS**: Global Distribution System
- **PCI DSS**: Payment Card Industry Data Security Standard
- **GDPR**: General Data Protection Regulation
- **MFA**: Multi-Factor Authentication
- **SLA**: Service Level Agreement