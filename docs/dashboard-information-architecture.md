# Dashboard Information Architecture

## Executive Summary

This document defines the information architecture for the new dashboard system, establishing the layout hierarchy, widget organization, navigation flow, and data relationships based on successful patterns from the properties module and user experience best practices.

## Dashboard Layout Hierarchy

### 1. **Primary Layout Structure**

```
Dashboard Container
├── Header Section
│   ├── Dashboard Title & Breadcrumbs
│   ├── Global Search Bar
│   ├── Notification Center
│   └── User Profile & Settings
├── Navigation Section
│   ├── Tab Navigation (following WorkflowNavigation patterns)
│   ├── Quick Filters
│   └── View Toggle (Grid/List/Compact)
├── Main Content Area
│   ├── Key Metrics Row (Priority Widgets)
│   ├── Analytics Grid (Customizable Layout)
│   ├── Quick Actions Panel
│   └── Recent Activity Feed
└── Footer Section
    ├── Performance Indicators
    ├── Last Updated Timestamp
    └── Export/Share Actions
```

### 2. **Widget Organization Framework**

#### Priority-Based Widget Hierarchy
1. **Critical Metrics (Always Visible)**
   - Total Properties & Units
   - Occupancy Rate & Trends
   - Monthly Revenue (KES)
   - Collection Rate & Outstanding

2. **Secondary Metrics (Customizable)**
   - Tenant Analytics
   - Maintenance Requests
   - Financial Performance
   - Market Insights

3. **Contextual Widgets (Role-Based)**
   - Property Manager: Operational metrics, maintenance, tenant issues
   - Landlord: Financial performance, ROI, market trends
   - Tenant: Payment history, maintenance requests, lease info

#### Widget Size Categories
- **Large Widgets (2x2 grid)**: Revenue trends, occupancy analytics, property performance
- **Medium Widgets (2x1 grid)**: Key metrics, quick stats, notification panels
- **Small Widgets (1x1 grid)**: Single metrics, status indicators, quick actions
- **Full-Width Widgets**: Recent activity, detailed tables, comprehensive reports

### 3. **Navigation Flow Design**

#### Tab-Based Navigation (Following WorkflowNavigation Patterns)
```
Dashboard Tabs:
├── Overview (Default)
│   ├── Key Metrics Summary
│   ├── Performance Highlights
│   └── Critical Alerts
├── Properties
│   ├── Portfolio Overview
│   ├── Occupancy Analytics
│   └── Property Performance
├── Financial
│   ├── Revenue Dashboard
│   ├── Payment Analytics
│   └── Financial Reports
├── Tenants
│   ├── Tenant Overview
│   ├── Payment Behavior
│   └── Satisfaction Metrics
├── Operations
│   ├── Maintenance Dashboard
│   ├── Task Management
│   └── Vendor Performance
└── Analytics
    ├── Trend Analysis
    ├── Comparative Reports
    └── Predictive Insights
```

#### Contextual Navigation
- **Drill-down Capability**: Click metrics to view detailed analytics
- **Cross-tab Context**: Maintain selections across tab switches
- **Breadcrumb Navigation**: Clear path back to previous views
- **Quick Jump**: Direct navigation to related sections

## Widget Specifications

### 1. **Core Metric Widgets**

#### Property Portfolio Widget
```
┌─────────────────────────────────────┐
│ 🏢 Property Portfolio               │
├─────────────────────────────────────┤
│ Total Properties: 24                │
│ Total Units: 156                    │
│ Occupied: 142 (91%)                 │
│ Vacant: 14 (9%)                     │
│                                     │
│ [View Details] [Add Property]       │
└─────────────────────────────────────┘
```

#### Financial Performance Widget
```
┌─────────────────────────────────────┐
│ 💰 Financial Performance (KES)      │
├─────────────────────────────────────┤
│ Monthly Revenue: 2,450,000          │
│ Collection Rate: 94%                │
│ Outstanding: 147,000                │
│ Growth: +12% vs last month          │
│                                     │
│ [View Reports] [Generate Invoice]   │
└─────────────────────────────────────┘
```

#### Tenant Analytics Widget
```
┌─────────────────────────────────────┐
│ 👥 Tenant Analytics                 │
├─────────────────────────────────────┤
│ Active Tenants: 142                 │
│ New This Month: 8                   │
│ Turnover Rate: 5.2%                 │
│ Avg Lease: 18 months                │
│                                     │
│ [View Tenants] [Add Tenant]         │
└─────────────────────────────────────┘
```

### 2. **Analytics Widgets**

#### Revenue Trend Chart
```
┌─────────────────────────────────────┐
│ 📈 Revenue Trends (Last 12 Months)  │
├─────────────────────────────────────┤
│     KES (Millions)                  │
│ 3.0 ┌─────────────────────────────┐ │
│ 2.5 │     ╭─╮     ╭─╮             │ │
│ 2.0 │   ╭─╯ ╰─╮ ╭─╯ ╰─╮           │ │
│ 1.5 │ ╭─╯     ╰─╯     ╰─╮         │ │
│ 1.0 └─────────────────────────────┘ │
│     J F M A M J J A S O N D         │
│                                     │
│ [Export] [Customize Period]         │
└─────────────────────────────────────┘
```

#### Occupancy Heatmap
```
┌─────────────────────────────────────┐
│ 🗺️ Property Occupancy Heatmap       │
├─────────────────────────────────────┤
│ Property A: ████████░░ 80%          │
│ Property B: ██████████ 100%         │
│ Property C: ██████░░░░ 60%          │
│ Property D: ████████░░ 85%          │
│                                     │
│ Legend: █ Occupied ░ Vacant         │
│                                     │
│ [View Map] [Property Details]       │
└─────────────────────────────────────┘
```

### 3. **Interactive Widgets**

#### Quick Actions Panel
```
┌─────────────────────────────────────┐
│ ⚡ Quick Actions                     │
├─────────────────────────────────────┤
│ [➕ Add Property] [👤 Add Tenant]    │
│ [💳 Record Payment] [📋 Generate]    │
│ [🔧 Maintenance] [📊 Reports]        │
│                                     │
│ Recent: Property added (2h ago)     │
│ Recent: Payment recorded (4h ago)   │
└─────────────────────────────────────┘
```

#### Notification Center
```
┌─────────────────────────────────────┐
│ 🔔 Notifications & Alerts           │
├─────────────────────────────────────┤
│ 🔴 3 Overdue Payments               │
│ 🟡 5 Maintenance Requests           │
│ 🟢 2 Lease Renewals Due             │
│ 🔵 1 New Tenant Application         │
│                                     │
│ [View All] [Mark Read]              │
└─────────────────────────────────────┘
```

## Data Relationships and Flow

### 1. **Entity Relationship Mapping**

```
Dashboard Data Flow:
├── Properties
│   ├── Units → Tenants → Payments
│   ├── Maintenance → Requests → Vendors
│   └── Documents → Compliance → Reports
├── Financial
│   ├── Revenue → Collections → Outstanding
│   ├── Expenses → Categories → Budgets
│   └── Reports → Analytics → Forecasts
├── Tenants
│   ├── Profiles → Leases → Payments
│   ├── Communications → Issues → Resolutions
│   └── Satisfaction → Feedback → Improvements
└── Operations
    ├── Tasks → Assignments → Completion
    ├── Vendors → Performance → Contracts
    └── Compliance → Audits → Certifications
```

### 2. **Cross-Widget Data Dependencies**

#### Primary Dependencies
- **Property Selection** → Updates all property-specific widgets
- **Date Range Filter** → Refreshes time-based analytics
- **Tenant Filter** → Updates tenant-related metrics
- **Financial Period** → Recalculates financial widgets

#### Secondary Dependencies
- **Occupancy Changes** → Updates revenue projections
- **Payment Records** → Updates collection rates and outstanding amounts
- **Maintenance Requests** → Updates operational metrics
- **Lease Expirations** → Updates tenant turnover predictions

### 3. **Real-time Update Priorities**

#### Critical Updates (Immediate)
1. Payment recordings
2. Tenant status changes
3. Emergency maintenance requests
4. System alerts and notifications

#### Standard Updates (30 seconds)
1. Occupancy rate changes
2. Revenue calculations
3. Collection rate updates
4. General metrics refresh

#### Background Updates (5 minutes)
1. Trend analysis
2. Comparative reports
3. Predictive analytics
4. Historical data aggregation

## Responsive Design Strategy

### 1. **Breakpoint-Based Layout**

#### Mobile (320px - 768px)
```
┌─────────────────┐
│ Header          │
├─────────────────┤
│ Key Metric 1    │
├─────────────────┤
│ Key Metric 2    │
├─────────────────┤
│ Quick Actions   │
├─────────────────┤
│ Notifications   │
├─────────────────┤
│ Recent Activity │
└─────────────────┘
```

#### Tablet (768px - 1024px)
```
┌─────────────────────────────────┐
│ Header                          │
├─────────────────────────────────┤
│ Metric 1    │ Metric 2          │
├─────────────────────────────────┤
│ Chart Widget                    │
├─────────────────────────────────┤
│ Actions     │ Notifications     │
└─────────────────────────────────┘
```

#### Desktop (1024px+)
```
┌─────────────────────────────────────────────┐
│ Header                                      │
├─────────────────────────────────────────────┤
│ Metric 1 │ Metric 2 │ Metric 3 │ Metric 4  │
├─────────────────────────────────────────────┤
│ Large Chart Widget    │ Analytics Widget    │
├─────────────────────────────────────────────┤
│ Quick Actions │ Notifications │ Activity    │
└─────────────────────────────────────────────┘
```

### 2. **Touch-Optimized Interactions**

#### Mobile Gestures
- **Swipe Left/Right**: Navigate between tabs
- **Pull to Refresh**: Refresh dashboard data
- **Long Press**: Access context menus
- **Pinch to Zoom**: Zoom into charts and graphs
- **Tap and Hold**: Drag widgets (customization mode)

#### Touch Targets
- **Minimum Size**: 44px x 44px for all interactive elements
- **Spacing**: 8px minimum between touch targets
- **Feedback**: Visual feedback for all touch interactions
- **Accessibility**: Support for screen readers and voice control

## Customization Framework

### 1. **Widget Customization Options**

#### Layout Customization
- **Drag and Drop**: Reorder widgets within grid
- **Resize**: Adjust widget sizes (1x1, 2x1, 2x2)
- **Show/Hide**: Toggle widget visibility
- **Grouping**: Create custom widget groups
- **Templates**: Save and load layout templates

#### Content Customization
- **Metric Selection**: Choose which metrics to display
- **Time Periods**: Customize default time ranges
- **Filters**: Set default filters and preferences
- **Thresholds**: Configure alert thresholds
- **Colors**: Customize widget color schemes

### 2. **User Preference Management**

#### Persistence Strategy
- **Local Storage**: Layout preferences and UI state
- **Database**: User-specific configurations and templates
- **Cloud Sync**: Cross-device preference synchronization
- **Backup**: Export/import preference configurations
- **Reset**: Restore default layouts and settings

#### Role-Based Defaults
- **Property Manager**: Operations-focused layout
- **Landlord**: Financial-focused layout
- **Tenant**: Personal dashboard layout
- **Administrator**: System monitoring layout
- **Viewer**: Read-only simplified layout

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Review Date**: January 2025