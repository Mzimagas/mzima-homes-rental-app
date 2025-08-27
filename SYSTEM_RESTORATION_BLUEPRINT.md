# Mzima Homes System Restoration Blueprint

_Complete system state as of August 20, 2025_

## 🎯 Overview

This document serves as a complete restoration guide for the Mzima Homes property management system. If the system needs to be rebuilt from scratch, this blueprint contains all the specifications, configurations, and business logic needed to restore it to its current functional state.

## 🏗️ System Architecture

### Core Technologies

- **Frontend**: Next.js 15.4.2 with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI Framework**: Tailwind CSS with custom components
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React hooks and context

### Database Schema Overview

```sql
-- Core Tables
properties (main property records)
property_subdivisions (subdivision plans)
subdivision_plots (individual plots within subdivisions)
property_subdivision_history (audit trail for subdivision changes)
tenants (tenant management)
rental_agreements (lease contracts)
purchase_pipeline (property acquisition workflow)
property_acquisition_costs (purchase-related expenses)
property_subdivision_costs (subdivision-related expenses)
payment_installments (payment tracking)
```

## 🏠 Property Management System

### Property Types & Categories

- **Homes**: Residential properties
- **Hostels**: Student/worker accommodation
- **Stalls**: Commercial retail spaces

### Property Status Workflow

```
ACTIVE → (can be marked for subdivision) → SUB_DIVISION_STARTED → SUBDIVIDED
ACTIVE → (can be marked for handover) → PENDING/IN_PROGRESS/COMPLETED
```

### Key Features

1. **Property Lifecycle Management**
   - Status tracking (Active, Subdivided, Handed Over)
   - Independent subdivision and handover workflows
   - Area conversion (hectares to acres: 1 hectare = 2.47105 acres)

2. **Access Control**
   - Role-based permissions (OWNER, PROPERTY_MANAGER)
   - Property-specific edit permissions
   - Soft delete functionality with restoration

3. **Financial Integration**
   - Property Finances tab with cost tracking
   - Acquisition costs management
   - Payment installment tracking

## 🔄 Subdivision Management System

### Subdivision Workflow

1. **Property Selection**: Only ACTIVE properties can be subdivided
2. **Status Update**: Mark property as "Sub-Division Started"
3. **Plan Creation**: Create detailed subdivision plan with mandatory fields
4. **Plot Management**: Add individual plots with specifications
5. **History Tracking**: Complete audit trail of all changes

### Mandatory Fields (Required for Change Tracking)

```typescript
subdivisionName: string (required) *
totalPlotsPlanned: number (required) *
surveyorName: string (required) *
surveyorContact: string (required) *
surveyCost: number (required) *
expectedPlotValue: number (required) *
targetCompletionDate: string (required) *
```

### Optional Fields

```typescript
approvalAuthority: string(optional)
approvalFees: number(optional)
subdivisionNotes: string(optional)
```

### Change Tracking & History

- **Complete audit trail** for all subdivision modifications
- **Before/after value comparison** with human-readable format
- **User attribution** with proper name display (Abel Gichimu)
- **Confirmation dialogs** showing exact changes before updates
- **Visual change indicators**: Red strikethrough → Green new values

### Subdivision History Display Format

```
👤 Abel Gichimu
🕒 20/08/2025, 18:15:30
✏️ Plan Modified
Reason: Subdivision plan updated through property management interface

Changes Made:
Survey Cost (KES): 45000 → 50000
Surveyor Name: (new) → ABC Surveyors Ltd
Total Plots Planned: 8 → 7
```

## 💰 Purchase Pipeline System

### 9-Stage Purchase Workflow

1. **Initial Search** - Property identification and preliminary assessment
2. **Survey & Mapping** - Land surveying and boundary mapping
3. **Legal Verification** - Title verification and legal due diligence
4. **Agreement & Documentation** - Purchase agreement preparation
5. **Down Payment** - Initial payment processing
6. **Subsequent Payments** - Installment payment management
7. **Land Control Board Meeting** - Regulatory approval process
8. **Seller Signed Transfer Forms** - Transfer documentation
9. **Title Registration** - Final ownership transfer

### Pipeline Features

- **Sequential stage progression** with validation requirements
- **Document upload functionality** for each stage
- **Automatic status synchronization** between vendor/buyer views
- **Manual override capabilities** with visual indicators
- **Property status integration** (PENDING → IN_PROGRESS on selection)

## 👥 Tenant Management System

### Tenant Lifecycle

- **Creation**: Flexible due date controls and property defaults
- **Management**: Inline interfaces without property filtering
- **Move Management**: Flexible due date controls
- **Soft Delete**: Consistent deletion/restoration patterns

### Integration Points

- **Property-level defaults** replicated across tenant forms
- **Consistent UI patterns** and validation across all forms
- **Authentication and authorization** aligned with property access

## 🎨 User Interface Standards

### Design Principles

- **WCAG accessibility compliance** throughout
- **Consistent brand color usage** with clear visual hierarchy
- **Professional modern aesthetics** with mobile responsiveness
- **Compact workflow cards** with tab navigation dimensions

### Navigation Patterns

- **Clickable workflow cards** serving as both display and navigation
- **Consolidated navigation** removing redundant tab structures
- **Context-appropriate action buttons** (e.g., 'Start Subdivision' vs 'Start Sale')
- **Simplified inline management** interfaces

### Form Standards

- **Red asterisks (\*)** for required fields
- **Consistent validation patterns** across all forms
- **Auto-save vs explicit save** based on field criticality
- **Change warnings** for critical fields with audit trails

## 🔐 Authentication & Authorization

### User Management

- **Supabase Auth** integration with user metadata
- **Role-based access control** (OWNER, PROPERTY_MANAGER)
- **Property-specific permissions** with edit access validation

### User Profile Structure

```typescript
{
  id: string
  email: string
  raw_user_meta_data: {
    full_name: string // "Abel Gichimu"
    role: string
    email_verified: boolean
  }
}
```

## 📊 Financial Management

### Cost Tracking Systems

1. **Property Acquisition Costs**
   - Purchase price with change tracking
   - Legal fees and documentation costs
   - Survey and valuation expenses

2. **Subdivision Costs** (Kenya-specific categories)
   - Statutory fees
   - Survey fees
   - Registration fees
   - Legal compliance costs
   - Paid/pending status tracking

3. **Payment Installments**
   - Flexible payment scheduling
   - Status tracking and management
   - Integration with property finances

## 🗄️ Database Functions & Procedures

### Key Database Functions

```sql
-- Subdivision history management
get_subdivision_history(property_uuid UUID)
record_subdivision_history(...)

-- User access control
get_user_accessible_properties(user_id UUID)
checkPropertyEditAccess(user_id, property_id)
```

### RLS (Row Level Security) Policies

- Property access based on ownership/management roles
- Subdivision history access tied to property permissions
- Tenant data access controls

## 🔧 Technical Implementation Details

### Form Validation (Zod Schemas)

```typescript
const subdivisionSchema = z.object({
  subdivisionName: z.string().min(1, 'Subdivision name is required'),
  totalPlotsPlanned: z.number().int().positive('Must be a positive number'),
  surveyorName: z.string().min(1, 'Surveyor name is required'),
  surveyorContact: z.string().min(1, 'Surveyor contact is required'),
  surveyCost: z.number().min(0, 'Survey cost must be 0 or positive'),
  expectedPlotValue: z.number().positive('Expected plot value must be positive'),
  targetCompletionDate: z.string().min(1, 'Target completion date is required'),
  approvalAuthority: z.string().optional(),
  approvalFees: z.number().min(0).optional(),
  subdivisionNotes: z.string().optional(),
})
```

### API Endpoints Structure

```
/api/properties/[id]/subdivision-history (GET, POST)
/api/properties/[id]/subdivision-costs (GET, POST, DELETE, PATCH)
/api/properties/[id]/acquisition-costs (GET, POST, PATCH)
/api/properties/[id]/payment-installments (GET, POST)
/api/purchase-pipeline/[id]/financial (GET, POST)
```

### Component Architecture

```
components/
├── properties/
│   ├── SubdivisionProcessManager.tsx (main subdivision interface)
│   ├── SubdivisionHistoryModal.tsx (history display)
│   └── PropertyManagementTabs.tsx (property lifecycle)
├── ui/ (reusable components)
│   ├── Modal.tsx
│   ├── Button.tsx
│   ├── TextField.tsx
│   └── FormField.tsx
└── purchase-pipeline/ (acquisition workflow)
```

## 🚀 Deployment Configuration

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://ajrxvnakphkpkcssisxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_key]
```

### Supabase Project Details

- **Project ID**: ajrxvnakphkpkcssisxm
- **Region**: eu-north-1
- **Database**: PostgreSQL with RLS enabled

## 📋 Current System State Checklist

### ✅ Completed Features

- [x] Property management with lifecycle tracking
- [x] Subdivision system with mandatory field validation
- [x] Complete change tracking and audit trails
- [x] User-friendly confirmation dialogs
- [x] Purchase pipeline with 9-stage workflow
- [x] Tenant management with soft delete
- [x] Financial cost tracking systems
- [x] Role-based access control
- [x] Mobile-responsive UI design
- [x] Proper user name display (Abel Gichimu)

### 🎯 Key Business Rules

1. **Only ACTIVE properties** can be marked for subdivision
2. **Subdivision and handover statuses** are independent
3. **Properties marked SUBDIVIDED or HANDED_OVER** not available for new rentals
4. **All subdivision changes** require confirmation and create audit trails
5. **Mandatory fields ensure** complete change tracking from creation
6. **Property selection in workflows** automatically updates status and removes from available lists

## 🔄 Restoration Process

### Phase 1: Infrastructure Setup

1. Create new Supabase project
2. Set up database schema with all tables
3. Configure RLS policies and database functions
4. Set up authentication and user roles

### Phase 2: Core Application

1. Initialize Next.js project with TypeScript
2. Install and configure dependencies
3. Set up UI component library
4. Implement authentication integration

### Phase 3: Feature Implementation

1. Property management system
2. Subdivision workflow and tracking
3. Purchase pipeline implementation
4. Tenant management system
5. Financial tracking systems

### Phase 4: Testing & Validation

1. Test all workflows end-to-end
2. Verify change tracking and audit trails
3. Validate access control and permissions
4. Confirm UI/UX standards compliance

## 📚 Detailed Database Schema

### Properties Table

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  location VARCHAR,
  size_acres DECIMAL(10,4),
  property_type VARCHAR CHECK (property_type IN ('Homes', 'Hostels', 'Stalls')),
  subdivision_status VARCHAR DEFAULT 'NOT_STARTED'
    CHECK (subdivision_status IN ('NOT_STARTED', 'SUB_DIVISION_STARTED', 'SUBDIVIDED')),
  handover_status VARCHAR DEFAULT 'PENDING'
    CHECK (handover_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
  handover_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  owner_id UUID REFERENCES auth.users(id)
);
```

### Property Subdivisions Table

```sql
CREATE TABLE property_subdivisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  subdivision_name VARCHAR NOT NULL,
  total_plots_planned INTEGER NOT NULL CHECK (total_plots_planned > 0),
  total_plots_created INTEGER DEFAULT 0,
  subdivision_status VARCHAR DEFAULT 'PLANNING',
  surveyor_name VARCHAR NOT NULL,
  surveyor_contact VARCHAR NOT NULL,
  approval_authority VARCHAR,
  survey_cost_kes DECIMAL(15,2) NOT NULL CHECK (survey_cost_kes >= 0),
  approval_fees_kes DECIMAL(15,2) CHECK (approval_fees_kes >= 0),
  expected_plot_value_kes DECIMAL(15,2) NOT NULL CHECK (expected_plot_value_kes > 0),
  target_completion_date DATE NOT NULL,
  subdivision_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id)
);
```

### Subdivision History Table

```sql
CREATE TABLE property_subdivision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  subdivision_id UUID REFERENCES property_subdivisions(id) ON DELETE CASCADE,
  action_type VARCHAR NOT NULL CHECK (action_type IN ('PLAN_CREATED', 'PLAN_MODIFIED', 'STATUS_CHANGED', 'PLOT_ADDED', 'PLOT_MODIFIED')),
  previous_status VARCHAR,
  new_status VARCHAR,
  subdivision_name VARCHAR,
  total_plots_planned INTEGER,
  change_reason TEXT NOT NULL CHECK (length(change_reason) >= 10),
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name VARCHAR NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB DEFAULT '{}'::jsonb
);
```

### Subdivision Plots Table

```sql
CREATE TABLE subdivision_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdivision_id UUID REFERENCES property_subdivisions(id) ON DELETE CASCADE,
  plot_number VARCHAR NOT NULL,
  plot_size_sqm DECIMAL(10,2) CHECK (plot_size_sqm > 0),
  plot_size_acres DECIMAL(10,4),
  plot_status VARCHAR DEFAULT 'PLANNED' CHECK (plot_status IN ('PLANNED', 'SURVEYED', 'APPROVED', 'SOLD', 'TRANSFERRED')),
  estimated_value_kes DECIMAL(15,2) CHECK (estimated_value_kes > 0),
  property_id UUID REFERENCES properties(id),
  plot_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subdivision_id, plot_number)
);
```

## 🔧 Critical Database Functions

### Subdivision History Recording Function

```sql
CREATE OR REPLACE FUNCTION record_subdivision_history(
  property_uuid UUID,
  subdivision_uuid UUID,
  action_type_param TEXT,
  previous_status_param TEXT,
  new_status_param TEXT,
  subdivision_name_param TEXT,
  total_plots_param INTEGER,
  reason TEXT,
  details_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  history_id UUID;
  user_name TEXT;
BEGIN
  -- Validate reason length
  IF length(reason) < 10 THEN
    RAISE EXCEPTION 'Change reason must be at least 10 characters long';
  END IF;

  -- Get user info from auth.users
  SELECT
    COALESCE(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      email,
      'Abel Gichimu'
    )
  INTO user_name
  FROM auth.users
  WHERE id = auth.uid();

  -- Fallback if no user found
  IF user_name IS NULL THEN
    user_name := 'Abel Gichimu';
  END IF;

  -- Insert history record
  INSERT INTO property_subdivision_history (
    property_id, subdivision_id, action_type, previous_status, new_status,
    subdivision_name, total_plots_planned, change_reason, changed_by,
    changed_by_name, details
  ) VALUES (
    property_uuid, subdivision_uuid, action_type_param, previous_status_param,
    new_status_param, subdivision_name_param, total_plots_param, reason,
    auth.uid(), user_name, details_param
  ) RETURNING id INTO history_id;

  RETURN history_id;
END;
$$;
```

## 🎨 UI Component Specifications

### Modal Component Standards

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
```

### Form Field Component Standards

```typescript
interface FormFieldProps {
  name: string
  label: string
  error?: string
  required?: boolean
  children: (props: { id: string }) => React.ReactNode
}
```

### Button Variant Standards

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
```

## 🔐 Row Level Security Policies

### Properties RLS Policy

```sql
CREATE POLICY "Users can view properties they have access to" ON properties
  FOR SELECT USING (
    auth.uid() = owner_id OR
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'Property Manager'
    )
  );
```

### Subdivision History RLS Policy

```sql
CREATE POLICY "Users can view subdivision history for accessible properties"
  ON property_subdivision_history FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_subdivision_history.property_id
      AND (p.owner_id = auth.uid() OR p.created_by = auth.uid())
    )
  );
```

## 📱 Mobile Responsiveness Standards

### Breakpoint System

```css
/* Tailwind CSS breakpoints used throughout */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
```

### Grid Layouts

```typescript
// Standard responsive grid patterns
'grid grid-cols-1 md:grid-cols-2 gap-4' // 2-column on medium+
'grid grid-cols-1 md:grid-cols-3 gap-4' // 3-column on medium+
'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' // Progressive scaling
```

## 🎯 Business Logic Validation Rules

### Property Status Transitions

```typescript
const validTransitions = {
  NOT_STARTED: ['SUB_DIVISION_STARTED'],
  SUB_DIVISION_STARTED: ['SUBDIVIDED'],
  SUBDIVIDED: [], // Terminal state
}

const validHandoverTransitions = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [], // Terminal state
}
```

### Subdivision Validation Rules

```typescript
const subdivisionRules = {
  minPlotsPlanned: 1,
  maxPlotsPlanned: 1000,
  minSurveyCost: 0,
  minExpectedPlotValue: 1,
  reasonMinLength: 10,
  nameMinLength: 1,
  contactMinLength: 1,
}
```

## 🔄 Data Migration Patterns

### Property Area Conversion

```typescript
// Convert hectares to acres: 1 hectare = 2.47105 acres
const convertHectaresToAcres = (hectares: number): number => {
  return Math.round(hectares * 2.47105 * 10000) / 10000 // Round to 4 decimal places
}
```

### Status Migration Logic

```sql
-- Update properties that need status migration
UPDATE properties
SET subdivision_status = 'SUB_DIVISION_STARTED'
WHERE id IN (
  SELECT DISTINCT original_property_id
  FROM property_subdivisions
) AND subdivision_status = 'NOT_STARTED';
```

---

## 🚨 Emergency Restoration Commands

### Quick Database Reset (Nuclear Option)

```sql
-- WARNING: This deletes ALL data!
TRUNCATE TABLE property_subdivision_history CASCADE;
TRUNCATE TABLE subdivision_plots CASCADE;
TRUNCATE TABLE property_subdivisions CASCADE;
TRUNCATE TABLE properties CASCADE;
-- Add other tables as needed
```

### Selective Data Cleanup

```sql
-- Clean specific property data
DELETE FROM property_subdivision_history WHERE property_id = '[property_id]';
DELETE FROM subdivision_plots WHERE subdivision_id IN (
  SELECT id FROM property_subdivisions WHERE original_property_id = '[property_id]'
);
DELETE FROM property_subdivisions WHERE original_property_id = '[property_id]';
UPDATE properties SET subdivision_status = 'NOT_STARTED' WHERE id = '[property_id]';
```

---

_This blueprint represents the complete state of the Mzima Homes system as of August 20, 2025. Use this document to restore the system to its current functional state if needed._

**For your daughter: This file contains everything needed to rebuild Dad's property management system if you accidentally delete it while making room for games! 😄🎮**
