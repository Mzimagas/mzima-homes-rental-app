# Client Property Progression Workflow
## From Reserved to My Properties

### Overview
This document defines the complete workflow for how properties progress from "Reserved" status through agreement review, signing, and deposit payment to become "My Properties" in the client portal, with corresponding admin portal stage transitions.

## Current System Analysis

### Existing Property Statuses
- **INTERESTED**: Client has saved property (Saved Properties tab)
- **RESERVED**: Client has completed due diligence and reserved property (Reserved tab)
- **COMMITTED**: Client has signed agreement and paid deposit (My Properties tab)
- **IN_HANDOVER**: Property is in handover pipeline (My Properties tab)
- **COMPLETED**: Handover completed (My Properties tab)

### Current Admin Portal Stages
- **NOT_STARTED**: Property not yet available
- **AWAITING_START**: Property available in marketplace
- **IN_PROGRESS**: Handover pipeline active
- **COMPLETED**: Handover finished

## Proposed Enhanced Workflow

### Phase 1: Property Reservation (Current - Working)
**Client Portal**: Saved Properties → Reserved Properties
**Admin Portal**: AWAITING_START (no change)
**Trigger**: Due diligence completion + Reserve Property button
**Status**: `client_property_interests.status = 'COMMITTED'` + `properties.reservation_status = 'RESERVED'`

### Phase 2: Agreement Review & Signing (NEW)
**Client Portal**: Reserved Properties (with agreement review section)
**Admin Portal**: AWAITING_START → AGREEMENT_PENDING
**Required Actions**:
1. **Agreement Generation**: Auto-generate purchase agreement based on property details
2. **Agreement Review**: Client reviews terms, conditions, and pricing
3. **Digital Signing**: Client signs agreement electronically
4. **Admin Notification**: Admin receives notification of signed agreement

**Database Changes Needed**:
```sql
-- Add agreement tracking fields
ALTER TABLE client_property_interests ADD COLUMN agreement_generated_at TIMESTAMP;
ALTER TABLE client_property_interests ADD COLUMN agreement_reviewed_at TIMESTAMP;
ALTER TABLE client_property_interests ADD COLUMN agreement_signed_at TIMESTAMP;
ALTER TABLE client_property_interests ADD COLUMN agreement_document_url TEXT;
ALTER TABLE client_property_interests ADD COLUMN digital_signature_data JSONB;

-- Add new handover status
-- Update handover_status enum to include 'AGREEMENT_PENDING', 'DEPOSIT_PENDING'
```

### Phase 3: Deposit Payment (NEW)
**Client Portal**: Reserved Properties (with payment section)
**Admin Portal**: AGREEMENT_PENDING → DEPOSIT_PENDING
**Required Actions**:
1. **Payment Interface**: Secure payment form for deposit
2. **Payment Processing**: Integration with payment gateway (M-Pesa, Bank Transfer)
3. **Payment Verification**: Admin verification of payment receipt
4. **Receipt Generation**: Automatic receipt generation

**Database Changes Needed**:
```sql
-- Add payment tracking fields
ALTER TABLE client_property_interests ADD COLUMN deposit_amount_kes DECIMAL(15,2);
ALTER TABLE client_property_interests ADD COLUMN deposit_paid_at TIMESTAMP;
ALTER TABLE client_property_interests ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE client_property_interests ADD COLUMN payment_reference VARCHAR(100);
ALTER TABLE client_property_interests ADD COLUMN payment_verified_at TIMESTAMP;
ALTER TABLE client_property_interests ADD COLUMN payment_receipt_url TEXT;
```

### Phase 4: Transition to My Properties (ENHANCED)
**Client Portal**: Reserved Properties → My Properties
**Admin Portal**: DEPOSIT_PENDING → IN_PROGRESS
**Trigger**: Agreement signed + Deposit paid + Admin verification
**Automatic Actions**:
1. **Status Update**: `client_property_interests.status = 'IN_HANDOVER'`
2. **Handover Creation**: Create handover pipeline record
3. **Property Update**: `properties.handover_status = 'IN_PROGRESS'`
4. **Client Notification**: Email/SMS notification of progression

## Implementation Phases

### Phase 1: Agreement System (Priority 1)
1. **Agreement Template Engine**: Create dynamic agreement templates
2. **Agreement Review UI**: Client portal interface for reviewing agreements
3. **Digital Signature**: Implement e-signature capability
4. **Admin Dashboard**: Agreement management for admin portal

### Phase 2: Payment System (Priority 2)
1. **Payment Gateway Integration**: M-Pesa, bank transfer integration
2. **Payment UI**: Secure payment forms in client portal
3. **Payment Verification**: Admin tools for payment verification
4. **Receipt System**: Automatic receipt generation and storage

### Phase 3: Workflow Automation (Priority 3)
1. **Status Transition Logic**: Automatic status updates based on conditions
2. **Notification System**: Email/SMS notifications for each stage
3. **Admin Workflow**: Enhanced admin tools for managing progression
4. **Reporting**: Progress tracking and analytics

## User Experience Flow

### Client Portal Experience
1. **Reserved Properties Tab**:
   - Property card shows current status
   - Agreement section (when ready)
   - Payment section (after agreement signed)
   - Progress indicator

2. **Agreement Review**:
   - Download/view agreement PDF
   - Review terms and conditions
   - Digital signature interface
   - Confirmation and next steps

3. **Deposit Payment**:
   - Payment amount display
   - Multiple payment options
   - Payment form with validation
   - Receipt download

4. **Automatic Progression**:
   - Property automatically moves to My Properties
   - Handover progress tracking begins
   - Email/SMS confirmation

### Admin Portal Experience
1. **Enhanced Property Status**:
   - AWAITING_START → AGREEMENT_PENDING → DEPOSIT_PENDING → IN_PROGRESS
   - Clear status indicators and progress tracking

2. **Agreement Management**:
   - Generate agreements for reserved properties
   - Review signed agreements
   - Approve/reject agreements

3. **Payment Verification**:
   - Payment notification dashboard
   - Verify payment receipts
   - Approve deposit payments

4. **Workflow Monitoring**:
   - Track client progression through stages
   - Automated notifications and reminders
   - Performance analytics

## Technical Requirements

### Database Schema Updates
- Agreement tracking fields
- Payment tracking fields
- Enhanced status enums
- Audit trail tables

### API Endpoints Needed
- `/api/clients/generate-agreement`
- `/api/clients/sign-agreement`
- `/api/clients/make-deposit`
- `/api/clients/verify-payment`
- `/api/admin/agreement-management`
- `/api/admin/payment-verification`

### Integration Requirements
- Payment gateway (M-Pesa, bank APIs)
- E-signature service
- PDF generation service
- Email/SMS notification service
- Document storage (Supabase Storage)

## Success Metrics
- Time from reservation to My Properties
- Agreement completion rate
- Payment completion rate
- Client satisfaction scores
- Admin workflow efficiency

## Risk Mitigation
- Payment security and PCI compliance
- Legal agreement validity
- Data backup and recovery
- Fraud prevention measures
- Dispute resolution process
