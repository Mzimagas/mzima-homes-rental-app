# Dashboard Wireframes and Mockups

## Executive Summary

This document presents comprehensive wireframes and mockups for the new dashboard system, covering desktop and mobile layouts, widget placement, navigation structure, and responsive breakpoints. The designs follow modern UX principles and successful patterns from the properties module.

## Desktop Dashboard Layout (1024px+)

### 1. **Main Dashboard Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Mzima Homes Dashboard    🔍 Search...    🔔 (3)  👤 John Doe  ⚙️ Settings   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 📊 Overview  🏢 Properties  💰 Financial  👥 Tenants  🔧 Operations  📈 Analytics│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │🏢 Properties│ │👥 Tenants   │ │💰 Revenue   │ │📊 Occupancy │                │
│ │     24      │ │    142      │ │ KES 2.45M   │ │    91%      │                │
│ │  +2 this    │ │  +8 new     │ │ +12% growth │ │  +3% up     │                │
│ │   month     │ │  this month │ │             │ │             │                │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                                 │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐        │
│ │ 📈 Revenue Trends (12 Months)   │ │ 🗺️ Property Occupancy Map       │        │
│ │                                 │ │                                 │        │
│ │ KES 3M ┌─────────────────────┐  │ │ Property A: ████████░░ 80%      │        │
│ │ 2.5M   │     ╭─╮     ╭─╮     │  │ │ Property B: ██████████ 100%     │        │
│ │ 2M     │   ╭─╯ ╰─╮ ╭─╯ ╰─╮   │  │ │ Property C: ██████░░░░ 60%      │        │
│ │ 1.5M   │ ╭─╯     ╰─╯     ╰─╮ │  │ │ Property D: ████████░░ 85%      │        │
│ │ 1M     └─────────────────────┘  │ │                                 │        │
│ │        J F M A M J J A S O N D  │ │ [View Details] [Add Property]   │        │
│ └─────────────────────────────────┘ └─────────────────────────────────┘        │
│                                                                                 │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐        │
│ │ ⚡ Quick Actions                 │ │ 🔔 Alerts & Notifications        │        │
│ │                                 │ │                                 │        │
│ │ [➕ Add Property] [👤 Add Tenant]│ │ 🔴 3 Overdue Payments           │        │
│ │ [💳 Record Payment] [📋 Invoice]│ │ 🟡 5 Maintenance Requests       │        │
│ │ [🔧 Maintenance] [📊 Reports]   │ │ 🟢 2 Lease Renewals Due         │        │
│ │                                 │ │ 🔵 1 New Tenant Application     │        │
│ │ Recent: Property added (2h ago) │ │                                 │        │
│ │ Recent: Payment recorded (4h)   │ │ [View All] [Mark All Read]      │        │
│ └─────────────────────────────────┘ └─────────────────────────────────┘        │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ 📋 Recent Activity                                                          │ │
│ │                                                                             │ │
│ │ • Payment received from John Doe - KES 25,000 (Property A, Unit 2A)        │ │
│ │ • Maintenance request submitted - Plumbing issue (Property B, Unit 1B)     │ │
│ │ • New tenant application - Jane Smith (Property C, Unit 3C)                │ │
│ │ • Lease renewal signed - Mike Johnson (Property A, Unit 1A)                │ │
│ │ • Invoice generated for December rent - 24 tenants                         │ │
│ │                                                                             │ │
│ │ [View All Activity] [Export Report]                                        │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Last Updated: 2 minutes ago | Performance: Good | [Export] [Share] [Settings]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2. **Financial Dashboard Tab**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Mzima Homes Dashboard    🔍 Search...    🔔 (3)  👤 John Doe  ⚙️ Settings   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 📊 Overview  🏢 Properties  💰 Financial  👥 Tenants  🔧 Operations  📈 Analytics│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │💰 Total     │ │📊 Collection│ │📈 Growth    │ │⚠️ Outstanding│                │
│ │ Revenue     │ │    Rate     │ │    Rate     │ │   Amount    │                │
│ │KES 2.45M    │ │    94%      │ │   +12%      │ │ KES 147K    │                │
│ │ This Month  │ │ Target: 95% │ │ vs Last Mo. │ │ 6% of Total │                │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                                 │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐        │
│ │ 💹 Revenue vs Expenses          │ │ 📊 Payment Status Breakdown     │        │
│ │                                 │ │                                 │        │
│ │ KES 3M ┌─────────────────────┐  │ │ ┌─────────────────────────────┐ │        │
│ │ 2.5M   │ Revenue ████████████ │  │ │ │ Paid: 85% ████████████████  │ │        │
│ │ 2M     │ Expenses ████████    │  │ │ │ Pending: 9% ███             │ │        │
│ │ 1.5M   │ Net ████████████████ │  │ │ │ Overdue: 6% ██              │ │        │
│ │ 1M     └─────────────────────┘  │ │ └─────────────────────────────┘ │        │
│ │        J F M A M J J A S O N D  │ │                                 │        │
│ │                                 │ │ [Generate Report] [Export]      │        │
│ └─────────────────────────────────┘ └─────────────────────────────────┘        │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ 💳 Recent Payments                                                          │ │
│ │                                                                             │ │
│ │ Date       | Tenant        | Property    | Amount    | Method | Status     │ │
│ │ 2024-12-15 | John Doe      | Property A  | KES 25K   | M-Pesa | Paid      │ │
│ │ 2024-12-14 | Jane Smith    | Property B  | KES 30K   | Bank   | Paid      │ │
│ │ 2024-12-13 | Mike Johnson  | Property C  | KES 22K   | Cash   | Paid      │ │
│ │ 2024-12-12 | Sarah Wilson  | Property A  | KES 28K   | M-Pesa | Pending   │ │
│ │ 2024-12-11 | David Brown   | Property D  | KES 35K   | Bank   | Overdue   │ │
│ │                                                                             │ │
│ │ [View All Payments] [Record Payment] [Generate Invoices]                   │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Last Updated: 1 minute ago | Performance: Good | [Export] [Share] [Settings]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3. **Properties Dashboard Tab**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Mzima Homes Dashboard    🔍 Search...    🔔 (3)  👤 John Doe  ⚙️ Settings   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 📊 Overview  🏢 Properties  💰 Financial  👥 Tenants  🔧 Operations  📈 Analytics│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │🏢 Total     │ │🏠 Units     │ │📊 Occupancy │ │💰 Avg Rent  │                │
│ │ Properties  │ │   Total     │ │    Rate     │ │  per Unit   │                │
│ │     24      │ │    156      │ │    91%      │ │ KES 18,500  │                │
│ │ +2 Added    │ │ 142 Occupied│ │ Target: 90% │ │ +5% YoY     │                │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                                 │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐        │
│ │ 📍 Property Performance Map     │ │ 📈 Occupancy Trends             │        │
│ │                                 │ │                                 │        │
│ │ ┌─────────────────────────────┐ │ │ 100% ┌─────────────────────┐   │        │
│ │ │ 🟢 High Performance (>90%)  │ │ │ 90%  │     ╭─╮     ╭─╮     │   │        │
│ │ │ 🟡 Medium Performance (70%) │ │ │ 80%  │   ╭─╯ ╰─╮ ╭─╯ ╰─╮   │   │        │
│ │ │ 🔴 Low Performance (<70%)   │ │ │ 70%  │ ╭─╯     ╰─╯     ╰─╮ │   │        │
│ │ └─────────────────────────────┘ │ │ 60%  └─────────────────────┘   │        │
│ │                                 │ │      J F M A M J J A S O N D   │        │
│ │ Property A: 🟢 95% (KES 180K)   │ │                                 │        │
│ │ Property B: 🟢 100% (KES 240K)  │ │ [View Details] [Export Data]    │        │
│ │ Property C: 🟡 75% (KES 135K)   │ │                                 │        │
│ │ Property D: 🟢 88% (KES 200K)   │ │                                 │        │
│ └─────────────────────────────────┘ └─────────────────────────────────┘        │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ 🏢 Property Portfolio Overview                                              │ │
│ │                                                                             │ │
│ │ Property Name    | Type      | Units | Occupied | Vacant | Revenue | ROI   │ │
│ │ Westlands Tower  | Apartment | 24    | 23       | 1      | 240K    | 12%   │ │
│ │ Karen Villas     | Villa     | 12    | 12       | 0      | 180K    | 15%   │ │
│ │ Kilimani Heights | Apartment | 36    | 27       | 9      | 135K    | 8%    │ │
│ │ Lavington Court  | Apartment | 18    | 16       | 2      | 200K    | 14%   │ │
│ │ Runda Gardens    | Townhouse | 8     | 8        | 0      | 160K    | 18%   │ │
│ │                                                                             │ │
│ │ [View All Properties] [Add Property] [Property Reports]                    │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Last Updated: 30 seconds ago | Performance: Good | [Export] [Share] [Settings] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Tablet Dashboard Layout (768px - 1024px)

### 1. **Tablet Overview Layout**

```
┌─────────────────────────────────────────────────────────┐
│ 🏠 Mzima Homes    🔍 Search...    🔔 (3)  👤 John  ⚙️  │
├─────────────────────────────────────────────────────────┤
│ 📊 Overview  🏢 Properties  💰 Financial  👥 Tenants   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────┐ ┌─────────────────────┐        │
│ │🏢 Properties        │ │👥 Tenants           │        │
│ │     24              │ │    142              │        │
│ │  +2 this month      │ │  +8 new this month  │        │
│ └─────────────────────┘ └─────────────────────┘        │
│                                                         │
│ ┌─────────────────────┐ ┌─────────────────────┐        │
│ │💰 Revenue           │ │📊 Occupancy         │        │
│ │ KES 2.45M           │ │    91%              │        │
│ │ +12% growth         │ │  +3% up             │        │
│ └─────────────────────┘ └─────────────────────┘        │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📈 Revenue Trends                                   │ │
│ │                                                     │ │
│ │ KES 3M ┌─────────────────────────────────────────┐ │ │
│ │ 2.5M   │     ╭─╮     ╭─╮                         │ │ │
│ │ 2M     │   ╭─╯ ╰─╮ ╭─╯ ╰─╮                       │ │ │
│ │ 1.5M   │ ╭─╯     ╰─╯     ╰─╮                     │ │ │
│ │ 1M     └─────────────────────────────────────────┘ │ │
│ │        J F M A M J J A S O N D                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────┐ ┌─────────────────────┐        │
│ │ ⚡ Quick Actions     │ │ 🔔 Alerts           │        │
│ │                     │ │                     │        │
│ │ [➕ Add Property]    │ │ 🔴 3 Overdue        │        │
│ │ [👤 Add Tenant]     │ │ 🟡 5 Maintenance    │        │
│ │ [💳 Record Payment] │ │ 🟢 2 Renewals       │        │
│ │ [📋 Generate Report]│ │ 🔵 1 Application    │        │
│ └─────────────────────┘ └─────────────────────┘        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Last Updated: 2 min ago | [Export] [Settings]          │
└─────────────────────────────────────────────────────────┘
```

## Mobile Dashboard Layout (320px - 768px)

### 1. **Mobile Overview Layout**

```
┌─────────────────────────────────┐
│ ☰ Mzima Homes    🔍  🔔(3)  👤 │
├─────────────────────────────────┤
│ 📊 Overview                     │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │🏢 Properties                │ │
│ │         24                  │ │
│ │    +2 this month            │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │👥 Active Tenants            │ │
│ │        142                  │ │
│ │    +8 new this month        │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │💰 Monthly Revenue           │ │
│ │     KES 2.45M               │ │
│ │    +12% growth              │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │📊 Occupancy Rate            │ │
│ │        91%                  │ │
│ │     +3% up                  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📈 Revenue Trend            │ │
│ │                             │ │
│ │ 3M ┌─────────────────────┐  │ │
│ │ 2M │     ╭─╮     ╭─╮     │  │ │
│ │ 1M │   ╭─╯ ╰─╮ ╭─╯ ╰─╮   │  │ │
│ │ 0  └─────────────────────┘  │ │
│ │    J F M A M J J A S O N D  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ⚡ Quick Actions             │ │
│ │                             │ │
│ │ [➕ Add Property]            │ │
│ │ [👤 Add Tenant]             │ │
│ │ [💳 Record Payment]         │ │
│ │ [📋 Generate Report]        │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🔔 Critical Alerts          │ │
│ │                             │ │
│ │ 🔴 3 Overdue Payments       │ │
│ │ 🟡 5 Maintenance Requests   │ │
│ │ 🟢 2 Lease Renewals Due     │ │
│ │                             │ │
│ │ [View All]                  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Updated: 2m ago | [⚙️ Settings] │
└─────────────────────────────────┘
```

### 2. **Mobile Navigation Menu**

```
┌─────────────────────────────────┐
│ ☰ Menu                      ✕   │
├─────────────────────────────────┤
│                                 │
│ 👤 John Doe                     │
│ Property Manager                │
│                                 │
├─────────────────────────────────┤
│                                 │
│ 📊 Dashboard Overview           │
│ 🏢 Properties                   │
│ 💰 Financial                    │
│ 👥 Tenants                      │
│ 🔧 Operations                   │
│ 📈 Analytics                    │
│                                 │
├─────────────────────────────────┤
│                                 │
│ ⚡ Quick Actions                │
│ ➕ Add Property                 │
│ 👤 Add Tenant                   │
│ 💳 Record Payment               │
│ 📋 Generate Report              │
│                                 │
├─────────────────────────────────┤
│                                 │
│ 🔔 Notifications (3)            │
│ ⚙️ Settings                     │
│ 📞 Support                      │
│ 🚪 Logout                       │
│                                 │
└─────────────────────────────────┘
```

## Widget Design Specifications

### 1. **Metric Widget Designs**

#### Standard Metric Widget
```
┌─────────────────────────────────┐
│ 🏢 Total Properties        ⟲ ⚙️ │
├─────────────────────────────────┤
│                                 │
│         24                      │
│      ┌─────┐                    │
│      │ +2  │ this month          │
│      └─────┘                    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ████████████████████░░░░░░░ │ │
│ │ 85% of target (28)          │ │
│ └─────────────────────────────┘ │
│                                 │
│ [View Details] [Add Property]   │
└─────────────────────────────────┘
```

#### Trend Metric Widget
```
┌─────────────────────────────────┐
│ 💰 Monthly Revenue         ⟲ ⚙️ │
├─────────────────────────────────┤
│                                 │
│     KES 2,450,000               │
│                                 │
│ ┌─────┐ +12% vs last month      │
│ │ ↗️  │ ████████████████████    │
│ └─────┘ Trending up             │
│                                 │
│ Target: KES 2.5M (98%)          │
│                                 │
│ [View Report] [Export Data]     │
└─────────────────────────────────┘
```

#### Alert Metric Widget
```
┌─────────────────────────────────┐
│ ⚠️ Outstanding Payments    ⟲ ⚙️ │
├─────────────────────────────────┤
│                                 │
│     KES 147,000                 │
│                                 │
│ 🔴 Critical: 3 payments         │
│ 🟡 Warning: 5 payments          │
│ 🟢 Normal: 134 payments         │
│                                 │
│ Collection Rate: 94%            │
│                                 │
│ [View Details] [Send Reminders] │
└─────────────────────────────────┘
```

### 2. **Chart Widget Designs**

#### Line Chart Widget
```
┌─────────────────────────────────────────────────────────┐
│ 📈 Revenue Trends (Last 12 Months)            ⟲ ⚙️ 📊 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ KES (Millions)                                          │
│ 3.0 ┌─────────────────────────────────────────────────┐ │
│ 2.5 │     ╭─╮     ╭─╮                                 │ │
│ 2.0 │   ╭─╯ ╰─╮ ╭─╯ ╰─╮                               │ │
│ 1.5 │ ╭─╯     ╰─╯     ╰─╮                             │ │
│ 1.0 └─────────────────────────────────────────────────┘ │
│     J F M A M J J A S O N D                           │
│                                                         │
│ ● Revenue ● Expenses ● Net Income                       │
│                                                         │
│ [Export] [Customize Period] [Full Screen]               │
└─────────────────────────────────────────────────────────┘
```

#### Pie Chart Widget
```
┌─────────────────────────────────┐
│ 📊 Property Type Distribution   │
├─────────────────────────────────┤
│                                 │
│        ┌─────────┐              │
│       ╱           ╲             │
│      ╱     45%     ╲            │
│     │   Apartments  │           │
│      ╲             ╱            │
│       ╲___________╱             │
│                                 │
│ 🟦 Apartments: 45% (11)         │
│ 🟩 Villas: 25% (6)              │
│ 🟨 Townhouses: 20% (5)          │
│ 🟪 Commercial: 10% (2)          │
│                                 │
│ [View Details] [Export]         │
└─────────────────────────────────┘
```

#### Bar Chart Widget
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Property Performance Comparison            ⟲ ⚙️ 📊 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Revenue (KES '000)                                      │
│ 300 ┌─────────────────────────────────────────────────┐ │
│ 250 │ ████████████████████████████████████████████████ │ │
│ 200 │ ████████████████████████████████████████        │ │
│ 150 │ ████████████████████████████                    │ │
│ 100 │ ████████████████████                            │ │
│  50 │ ████████                                        │ │
│   0 └─────────────────────────────────────────────────┘ │
│     Westlands Karen Kilimani Lavington Runda           │
│                                                         │
│ [View Details] [Compare All] [Export]                  │
└─────────────────────────────────────────────────────────┘
```

### 3. **Interactive Widget Designs**

#### Quick Actions Widget
```
┌─────────────────────────────────┐
│ ⚡ Quick Actions           ⚙️   │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ ➕ Add      │ │ 👤 Add      │ │
│ │ Property    │ │ Tenant      │ │
│ └─────────────┘ └─────────────┘ │
│                                 │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ 💳 Record   │ │ 📋 Generate │ │
│ │ Payment     │ │ Report      │ │
│ └─────────────┘ └─────────────┘ │
│                                 │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ 🔧 Request  │ │ 📊 View     │ │
│ │ Maintenance │ │ Analytics   │ │
│ └─────────────┘ └─────────────┘ │
│                                 │
│ Recent Actions:                 │
│ • Property added (2h ago)       │
│ • Payment recorded (4h ago)     │
└─────────────────────────────────┘
```

#### Notification Widget
```
┌─────────────────────────────────┐
│ 🔔 Notifications & Alerts  ⚙️  │
├─────────────────────────────────┤
│                                 │
│ 🔴 High Priority (3)            │
│ • Overdue payment: John Doe     │
│ • Emergency repair: Unit 2A     │
│ • Lease expiring: Jane Smith    │
│                                 │
│ 🟡 Medium Priority (5)          │
│ • Maintenance request: Unit 1B  │
│ • Application pending review    │
│ • Invoice generation due        │
│ • Rent increase notice due      │
│ • Property inspection due       │
│                                 │
│ 🟢 Low Priority (2)             │
│ • Welcome new tenant            │
│ • Monthly report available      │
│                                 │
│ [View All] [Mark Read] [Filter] │
└─────────────────────────────────┘
```

## Responsive Breakpoints and Behavior

### 1. **Breakpoint Specifications**

```
Desktop Large:  1200px+
├── 4-column widget grid
├── Full navigation visible
├── All widgets expanded
└── Side panels available

Desktop:        1024px - 1199px
├── 3-column widget grid
├── Full navigation visible
├── Most widgets expanded
└── Collapsible side panels

Tablet:         768px - 1023px
├── 2-column widget grid
├── Collapsible navigation
├── Condensed widgets
└── Modal side panels

Mobile Large:   480px - 767px
├── 1-column widget grid
├── Hamburger navigation
├── Stacked widgets
└── Full-screen modals

Mobile:         320px - 479px
├── 1-column widget grid
├── Minimal navigation
├── Compact widgets
└── Full-screen everything
```

### 2. **Widget Responsive Behavior**

#### Large Widgets (2x2 grid)
```
Desktop:  ┌─────────────┐ ┌─────────────┐
          │ Chart       │ │ Chart       │
          │ Widget      │ │ Widget      │
          └─────────────┘ └─────────────┘

Tablet:   ┌─────────────────────────────┐
          │ Chart Widget                │
          └─────────────────────────────┘
          ┌─────────────────────────────┐
          │ Chart Widget                │
          └─────────────────────────────┘

Mobile:   ┌─────────────────────────────┐
          │ Chart Widget (Condensed)    │
          └─────────────────────────────┘
          ┌─────────────────────────────┐
          │ Chart Widget (Condensed)    │
          └─────────────────────────────┘
```

#### Medium Widgets (2x1 grid)
```
Desktop:  ┌─────────────┐ ┌─────────────┐
          │ Metric      │ │ Metric      │
          └─────────────┘ └─────────────┘

Tablet:   ┌─────────────┐ ┌─────────────┐
          │ Metric      │ │ Metric      │
          └─────────────┘ └─────────────┘

Mobile:   ┌─────────────────────────────┐
          │ Metric                      │
          └─────────────────────────────┘
          ┌─────────────────────────────┐
          │ Metric                      │
          └─────────────────────────────┘
```

### 3. **Navigation Responsive States**

#### Desktop Navigation
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Overview  🏢 Properties  💰 Financial  👥 Tenants   │
│ 🔧 Operations  📈 Analytics                             │
└─────────────────────────────────────────────────────────┘
```

#### Tablet Navigation
```
┌─────────────────────────────────────────────────────────┐
│ ☰ Menu  📊 Overview  🏢 Properties  💰 Financial       │
└─────────────────────────────────────────────────────────┘
```

#### Mobile Navigation
```
┌─────────────────────────────────┐
│ ☰ Menu    Dashboard    🔍  🔔   │
└─────────────────────────────────┘
```

## Accessibility and Usability Features

### 1. **Accessibility Specifications**

#### Color and Contrast
- **High Contrast Mode**: Alternative color scheme for visually impaired users
- **Color Blind Support**: Patterns and icons supplement color coding
- **WCAG 2.1 AA Compliance**: Minimum 4.5:1 contrast ratio for text

#### Keyboard Navigation
- **Tab Order**: Logical tab sequence through all interactive elements
- **Keyboard Shortcuts**: Alt+1 (Overview), Alt+2 (Properties), etc.
- **Focus Indicators**: Clear visual focus indicators for all elements

#### Screen Reader Support
- **ARIA Labels**: Comprehensive labeling for all widgets and controls
- **Live Regions**: Dynamic content updates announced to screen readers
- **Semantic HTML**: Proper heading hierarchy and landmark roles

### 2. **Touch and Gesture Support**

#### Mobile Gestures
- **Swipe Left/Right**: Navigate between dashboard tabs
- **Pull to Refresh**: Refresh dashboard data
- **Pinch to Zoom**: Zoom into charts and graphs
- **Long Press**: Access context menus and quick actions

#### Touch Targets
- **Minimum Size**: 44px x 44px for all interactive elements
- **Spacing**: 8px minimum between touch targets
- **Visual Feedback**: Immediate visual response to touch interactions

### 3. **Performance Indicators**

#### Loading States
```
┌─────────────────────────────────┐
│ 🏢 Properties              ⟲   │
├─────────────────────────────────┤
│                                 │
│     ┌─────────────────────┐     │
│     │ ████████████░░░░░░░ │     │
│     │ Loading data...     │     │
│     └─────────────────────┘     │
│                                 │
└─────────────────────────────────┘
```

#### Error States
```
┌─────────────────────────────────┐
│ 🏢 Properties              ⟲   │
├─────────────────────────────────┤
│                                 │
│         ⚠️ Error                │
│                                 │
│ Failed to load property data    │
│                                 │
│ [Retry] [Report Issue]          │
│                                 │
└─────────────────────────────────┘
```

#### Empty States
```
┌─────────────────────────────────┐
│ 🏢 Properties              ⟲   │
├─────────────────────────────────┤
│                                 │
│         📭 No Data              │
│                                 │
│ No properties found             │
│                                 │
│ [Add Property] [Import Data]    │
│                                 │
└─────────────────────────────────┘
```

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Review Date**: January 2025