# Multi-Store Database Architecture Design

## Overview
Prepare database for multi-store functionality while preserving all existing data and maintaining backward compatibility.

## Schema Changes Required

### 1. User-Store Relationship (Many-to-Many)

**Current:** User → Store (one-to-one via storeId)
**New:** User ←→ UserStoreAccess ←→ Store (many-to-many with roles)

```prisma
// Updated User model
model User {
  id              String   @id @default(uuid())
  username        String   @unique
  password        String
  email           String?
  firstName       String?
  lastName        String?
  isActive        Boolean  @default(true)
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdBy       String?
  
  // Current store selection for UI (session state)
  currentStoreId  String?
  currentStore    Store?  @relation("UserCurrentStore", fields: [currentStoreId], references: [id])
  
  // Many-to-many relationship with stores
  storeAccess     UserStoreAccess[]
  
  @@index([username])
  @@index([currentStoreId])
  @@index([isActive])
}

// New junction table for user-store access
model UserStoreAccess {
  id          String   @id @default(uuid())
  userId      String
  storeId     String
  role        String   // ADMIN, SELLER, VIEWER - per store basis
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  createdBy   String?
  
  // Relationships
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  store       Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@unique([userId, storeId])
  @@index([userId])
  @@index([storeId])
  @@index([userId, isActive])
  @@index([role])
}
```

### 2. Store Soft Deletion

**Current:** Physical deletion of stores
**New:** Soft deletion with data preservation

```prisma
// Updated Store model
model Store {
  id                   String                @id @default(uuid())
  name                 String
  domain               String                @unique
  accessToken          String
  isActive             Boolean               @default(true)  // Soft delete flag
  isArchived           Boolean               @default(false) // Archive instead of delete
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
  
  // Multi-store relationships
  userAccess           UserStoreAccess[]
  currentUsers         User[]                @relation("UserCurrentStore")
  
  // All existing relationships preserved
  adSpends             AdSpend[]
  adSpendIntegrations  AdSpendIntegration[]
  fixedCosts           FixedCost[]
  orders               Order[]
  paymentGateways      PaymentGateway[]
  products             Product[]
  shippingRules        ShippingRule[]
  variableCosts        VariableCost[]
  feeConfiguration     FeeConfiguration?
  additionalCosts      AdditionalCost[]
  subscriptionFees     SubscriptionFee[]
  shopifyOrders        ShopifyOrder[]
  shopifyProducts      ShopifyProduct[]
  syncStatuses         SyncStatus[]
  paymentMethodFees    PaymentMethodFee[]
  
  @@index([isActive])
  @@index([isArchived])
  @@index([domain])
}
```

## Migration Strategy

### Phase 1: Add New Tables (Non-Breaking)
1. Create `UserStoreAccess` table
2. Add `isActive`, `isArchived` to `Store`
3. Add `currentStoreId` to `User`

### Phase 2: Migrate Existing Data
1. Create `UserStoreAccess` records for existing user-store relationships
2. Preserve existing roles
3. Set `currentStoreId` to existing `storeId`

### Phase 3: Remove Old Relationships (Breaking)
1. Remove `User.storeId` column
2. Update all APIs to use new relationships
3. Update UI components

## Benefits

### Data Preservation
- Stores are never deleted, only archived
- All historical data remains intact
- Can reactivate archived stores

### Flexible Access Control
- Users can have different roles per store
- Admin in Store A, Viewer in Store B
- Fine-grained permissions

### Future-Ready Architecture
- Easy to add store switching UI
- Supports enterprise multi-tenant scenarios
- Scalable for agencies managing multiple clients

### Backward Compatibility
- Current functionality preserved during migration
- Gradual rollout possible
- No data loss risk

## Implementation Notes

### API Changes Required
```typescript
// Current: Get user store
const store = user.store

// New: Get user's current store
const store = user.currentStore

// New: Get all user's stores
const stores = user.storeAccess
  .filter(access => access.isActive)
  .map(access => access.store)

// New: Check user role for specific store
const userRole = user.storeAccess
  .find(access => access.storeId === storeId)?.role
```

### UI Components Updates
- Add store selector dropdown
- Update settings to show store-specific access
- Modify user management for per-store roles

### Security Considerations
- Validate user has access to requested store
- Check per-store permissions
- Audit trail for store access changes 