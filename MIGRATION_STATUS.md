# Backend Migration Status

## Overview
Migration from Base44 SDK + Supabase to Express.js backend (localhost:5000)

## Progress

### ✅ Completed
1. **Backend Structure** - Full Express.js API created
   - Models: Stock, Pledge, PledgeSession, PledgeExecutionRecord, PledgeAccessRequest, FundTransaction, FeatureConfig
   - Controllers: User, Pledge, Fund, Feature
   - Routes: REST API endpoints configured
   - Auth: JWT authentication middleware

2. **Frontend API Client** - Created `src/lib/apiClient.js`
   - Axios-based client with auth interceptors
   - Generic entity API factory
   - 70+ entity exports configured

3. **Critical Components Updated** (~30 files)
   - AdminPanel.jsx
   - FundManager.jsx
   - FundManager_Allocations.jsx
   - FundManager_Reports.jsx
   - PledgePool.jsx
   - FundManager_Transactions.jsx
   - AutomatedExecutionEngine.jsx
   - EntityConfigProvider.jsx
   - And 22 more...

### 🚧 In Progress
**~175 files still need migration** from `@/api/entities` to `@/lib/apiClient`

## How to Complete Migration

### Option 1: Automated Script
Run the migration script:
```bash
node scripts/migrate-api-imports.js
```

This will automatically replace all `@/api/entities` imports with `@/lib/apiClient` across the codebase.

### Option 2: Manual Find & Replace
Use your IDE's find-and-replace:
- **Find:** `from '@/api/entities'`
- **Replace:** `from '@/lib/apiClient'`
- **Scope:** `src/**/*.{js,jsx,ts,tsx}`

### Option 3: Gradual Migration
Update files as you work on them:
```javascript
// Old
import { User, Stock } from '@/api/entities';

// New
import { User, Stock } from '@/lib/apiClient';
```

## Backend Setup

### 1. Start Backend Server
```bash
cd backend_protocall
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

Backend runs on: http://localhost:5000

### 2. Start Frontend
```bash
npm install
npm run dev
```

Frontend runs on: http://localhost:8080

### 3. Configure Environment
Create `.env` in project root:
```
VITE_API_URL=http://localhost:5000/api
```

## API Endpoints Available

### Authentication
- POST `/api/auth/login` - User login
- GET `/api/users/me` - Get current user

### Pledges
- GET `/api/pledges/pledges` - List pledges
- POST `/api/pledges/pledges` - Create pledge
- GET `/api/pledges/sessions` - List sessions
- GET `/api/pledges/executions` - List execution records

### Funds
- GET `/api/funds/transactions` - List transactions
- POST `/api/funds/transactions` - Create transaction

### Features
- GET `/api/features` - List feature configs
- GET `/api/features/:key` - Get specific feature

## Entity APIs Available

All entities use the same interface:
```javascript
import { EntityName } from '@/lib/apiClient';

// List all
const items = await EntityName.list(orderBy, limit, offset);

// Filter
const filtered = await EntityName.filter(filters, orderBy, limit);

// Get one
const item = await EntityName.get(id);

// Create
const newItem = await EntityName.create(data);

// Update
const updated = await EntityName.update(id, data);

// Delete
await EntityName.delete(id);
```

### Available Entities
- **Pledges:** Pledge, PledgeSession, PledgeExecutionRecord, PledgeAccessRequest, PledgeAuditLog
- **Funds:** FundTransaction, FundAllocation, FundPlan, FundWallet, FundWithdrawalRequest, FundPayoutRequest
- **Users:** User, TrustScoreLog, Advisor, UserInvestment
- **Investments:** Investor, InvestmentRequest, InvestorRequest
- **Stock:** Stock
- **Events:** Event, EventTicket, EventAttendee, EventReview, EventCommissionTracking, RefundRequest
- **FinInfluencer:** FinInfluencer, Course, CourseEnrollment
- **Revenue:** RevenueTransaction, PayoutRequest
- **Moderation:** ModerationLog, ContactInquiry, Feedback
- **Subscriptions:** PromoCode, SubscriptionTransaction
- **Polls:** Poll, PollVote
- **Chat:** Message, MessageReaction, ChatRoom, ChatRoomParticipant
- **Notifications:** Notification, NotificationSetting
- **Platform:** PlatformSetting, AlertConfiguration, EntityConfig, FeatureConfig

## Known Issues
1. Need to implement backend controllers for entities not yet covered
2. Some entity endpoints may return 404 until backend routes are added
3. Database schema needs to be created for all entities

## Next Steps
1. ✅ Run migration script to update all remaining imports
2. ⬜ Create missing backend controllers
3. ⬜ Set up database schema
4. ⬜ Test all entity operations
5. ⬜ Add error handling and validation
