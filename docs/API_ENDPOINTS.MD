🎯 API ENDPOINTS SUMMARY
========================

text

```
AUTH
─────────────────────────────
POST   /api/v1/auth/register        Register agent
POST   /api/v1/auth/login           Login
POST   /api/v1/auth/refresh-token   Refresh token
GET    /api/v1/auth/me              Get current user
POST   /api/v1/auth/change-password Change password
POST   /api/v1/auth/logout          Logout

WALLET (Agent only)
─────────────────────────────
GET    /api/v1/wallet/summary        Wallet summary
GET    /api/v1/wallet/balance        Current balance
POST   /api/v1/wallet/recharge       Recharge wallet
GET    /api/v1/wallet/transactions   Transaction history
POST   /api/v1/wallet/check-balance  Check if sufficient
GET    /api/v1/wallet/reconciliation Balance verification

BOOKINGS (Agent only)
─────────────────────────────
GET    /api/v1/bookings/search       Search flights
POST   /api/v1/bookings              Create booking
GET    /api/v1/bookings              List bookings
GET    /api/v1/bookings/:ref         Booking details
POST   /api/v1/bookings/:id/cancel   Cancel booking

COMMISSIONS (Agent only)
─────────────────────────────
GET    /api/v1/commissions/summary          Commission summary
GET    /api/v1/commissions/history          Commission history
POST   /api/v1/commissions/payout/request   Request payout
GET    /api/v1/commissions/payout/history   Payout history

ADMIN
─────────────────────────────
GET    /api/v1/admin/bookings              All bookings
POST   /api/v1/admin/commission-rules     Create commission rule
GET    /api/v1/admin/payouts/pending       Pending payouts
POST   /api/v1/admin/payouts/:id/process   Approve/reject payout
```