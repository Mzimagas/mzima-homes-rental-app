# Property Availability Logic - Comprehensive System

## Overview

This document outlines the property availability logic that balances client commitment, deposit payments, and marketplace availability to ensure fair and efficient property transactions.

## Property Status Hierarchy

### 1. **AVAILABLE** (Marketplace Visible)

- **Condition**: `handover_status = 'PENDING'` AND `committed_client_id IS NULL` AND `deposit_paid = false`
- **Description**: Property is fully available for new interest expressions
- **Marketplace**: ✅ Visible to all clients
- **Actions Allowed**: Express interest, save property

### 2. **INTERESTED** (Client Saved)

- **Condition**: Client has expressed interest but not committed
- **Database**: `client_property_interests.status = 'ACTIVE'`
- **Description**: Client has saved property but no commitment made
- **Marketplace**: ✅ Still visible to other clients
- **Actions Allowed**: Move to My Properties, Remove from Saved, Due Diligence

### 3. **COMMITTED** (Reserved but No Deposit)

- **Condition**: `client_property_interests.status = 'COMMITTED'` AND `deposit_paid = false`
- **Description**: Client has committed but not paid deposit (48-72 hour grace period)
- **Marketplace**: ❌ Hidden from marketplace
- **Grace Period**: 72 hours to pay deposit or commitment expires
- **Actions Allowed**: Pay deposit, Start handover (with deposit), Cancel commitment

### 4. **DEPOSIT_PAID** (Secured)

- **Condition**: `deposit_paid = true` AND `deposit_amount > 0`
- **Description**: Client has paid deposit, property is secured
- **Marketplace**: ❌ Permanently hidden from marketplace
- **Actions Allowed**: Continue with handover process, Full payment

### 5. **IN_HANDOVER** (Transaction in Progress)

- **Condition**: `handover_status = 'IN_PROGRESS'`
- **Description**: Handover process is active
- **Marketplace**: ❌ Hidden from marketplace
- **Actions Allowed**: Complete handover steps, Make payments

### 6. **COMPLETED** (Sold)

- **Condition**: `handover_status = 'COMPLETED'`
- **Description**: Property transaction completed
- **Marketplace**: ❌ Permanently hidden
- **Actions Allowed**: View completed transaction details

## Commitment Grace Period Logic

### Purpose

Prevent indefinite property holding without payment while allowing reasonable time for deposit processing.

### Implementation

```sql
-- Check for expired commitments (72 hours)
SELECT p.id, p.name, cpi.client_id, cpi.created_at
FROM properties p
JOIN client_property_interests cpi ON p.committed_client_id = cpi.client_id
WHERE cpi.status = 'COMMITTED'
  AND p.deposit_paid = false
  AND cpi.updated_at < NOW() - INTERVAL '72 hours';
```

### Auto-Expiry Process

1. **Warning at 48 hours**: Email/SMS reminder to pay deposit
2. **Final warning at 66 hours**: Last chance notification
3. **Auto-expiry at 72 hours**:
   - Set `committed_client_id = NULL`
   - Set `client_property_interests.status = 'EXPIRED'`
   - Property returns to marketplace
   - Notify client of expiry

## Database Schema Updates

### Properties Table

```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS (
  committed_client_id UUID REFERENCES clients(id),
  commitment_date TIMESTAMPTZ,
  deposit_paid BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(12,2) DEFAULT 0,
  deposit_date TIMESTAMPTZ,
  commitment_expires_at TIMESTAMPTZ
);
```

### Client Property Interests Table

```sql
-- Status values: 'ACTIVE', 'COMMITTED', 'EXPIRED', 'INACTIVE', 'CONVERTED'
ALTER TABLE client_property_interests
DROP CONSTRAINT IF EXISTS client_property_interests_status_check;

ALTER TABLE client_property_interests
ADD CONSTRAINT client_property_interests_status_check
CHECK (status = ANY (ARRAY[
  'ACTIVE'::text,      -- Expressed interest
  'COMMITTED'::text,   -- Committed but no deposit
  'EXPIRED'::text,     -- Commitment expired
  'INACTIVE'::text,    -- Removed/cancelled
  'CONVERTED'::text    -- Successfully purchased
]));
```

## API Endpoints

### 1. Commit Property

- **Endpoint**: `POST /api/clients/commit-property`
- **Action**: Move from INTERESTED to COMMITTED
- **Sets**: 72-hour expiry timer
- **Effect**: Removes from marketplace

### 2. Pay Deposit

- **Endpoint**: `POST /api/clients/pay-deposit`
- **Action**: Secure property with payment
- **Effect**: Permanent marketplace removal

### 3. Cancel Commitment

- **Endpoint**: `POST /api/clients/cancel-commitment`
- **Action**: Return property to marketplace
- **Effect**: Property becomes available again

## Marketplace Filtering Logic

### Current Implementation

```sql
SELECT * FROM properties
WHERE handover_status = 'PENDING'
  AND committed_client_id IS NULL
  AND deposit_paid = false;
```

### Enhanced Implementation

```sql
SELECT * FROM properties
WHERE handover_status = 'PENDING'
  AND (
    committed_client_id IS NULL
    OR (
      committed_client_id IS NOT NULL
      AND deposit_paid = false
      AND commitment_expires_at < NOW()
    )
  );
```

## Client Experience Flow

### Happy Path

1. **Browse** → Express Interest → **Save Property**
2. **Due Diligence** → Complete checklist
3. **Commit** → 72-hour grace period starts
4. **Pay Deposit** → Property secured
5. **Handover** → Complete transaction

### Alternative Paths

- **Skip Due Diligence**: Direct commit with warning
- **Commitment Expiry**: Property returns to market
- **Cancel Commitment**: Manual return to market

## Benefits of This System

### For Clients

- **Fair opportunity**: 72-hour window to secure property
- **Due diligence support**: Guided checklist for informed decisions
- **Flexibility**: Can cancel commitment if needed
- **Transparency**: Clear status and timelines

### For Business

- **Prevents property hoarding**: Automatic expiry mechanism
- **Encourages deposits**: Clear incentive to pay quickly
- **Reduces conflicts**: Clear rules for property availability
- **Improves conversion**: Due diligence increases confidence

### For Other Clients

- **Fair access**: Properties don't stay off-market indefinitely
- **Clear status**: Know when properties become available again
- **Reduced frustration**: Transparent availability rules

## Implementation Priority

### Phase 1 (Current)

- ✅ Basic commitment system
- ✅ Marketplace filtering
- ✅ Due diligence checklist

### Phase 2 (Next)

- 🔄 Deposit payment integration
- 🔄 Commitment expiry automation
- 🔄 Email/SMS notifications

### Phase 3 (Future)

- 📋 Advanced payment tracking
- 📋 Automated refund processing
- 📋 Analytics and reporting

This system provides a balanced approach that protects both client interests and business efficiency while maintaining fairness in the marketplace.
