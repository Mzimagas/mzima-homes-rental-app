# Dashboard API Documentation

## Overview

The Dashboard API provides comprehensive endpoints for retrieving property management analytics, metrics, and operational data. All endpoints are RESTful and return JSON responses with proper HTTP status codes.

## Base URL

```
Production: https://dashboard.mzimahomes.com/api
Staging: https://staging.mzimahomes.com/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require authentication using JWT tokens provided by Supabase Auth.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Flow

```typescript
// Login and get token
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Use token in API calls
const response = await fetch('/api/dashboard/metrics', {
  headers: {
    'Authorization': `Bearer ${data.session.access_token}`,
    'Content-Type': 'application/json'
  }
})
```

## Endpoints

### Dashboard Metrics

#### GET /api/dashboard/metrics

Retrieves key dashboard metrics and KPIs.

**Parameters:**
- `dateRange` (optional): Date range filter (e.g., "last-30-days", "last-90-days", "custom")
- `startDate` (optional): Start date for custom range (ISO 8601 format)
- `endDate` (optional): End date for custom range (ISO 8601 format)

**Example Request:**
```http
GET /api/dashboard/metrics?dateRange=last-30-days
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProperties": 25,
    "activeTenants": 68,
    "monthlyRevenue": 2450000,
    "occupancyRate": 94.1,
    "collectionRate": 96.5,
    "outstandingAmount": 135000,
    "averageRent": 36029,
    "maintenanceRequests": 12,
    "leaseExpirations": 8,
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "dateRange": "last-30-days",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": "Valid JWT token must be provided"
  }
}
```

### Property Analytics

#### GET /api/dashboard/properties

Retrieves property performance analytics and insights.

**Parameters:**
- `location` (optional): Filter by property location
- `propertyType` (optional): Filter by property type (APARTMENT, VILLA, COMMERCIAL)
- `status` (optional): Filter by property status
- `limit` (optional): Number of results to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```http
GET /api/dashboard/properties?location=Westlands&limit=10
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prop-123",
      "name": "Westlands Tower",
      "location": "Westlands",
      "propertyType": "APARTMENT",
      "totalUnits": 12,
      "occupiedUnits": 11,
      "occupancyRate": 91.7,
      "monthlyRevenue": 240000,
      "averageRent": 21818,
      "collectionRate": 98.5,
      "maintenanceScore": 4.2,
      "tenantSatisfaction": 4.5,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### GET /api/dashboard/properties/:id

Retrieves detailed analytics for a specific property.

**Parameters:**
- `id`: Property ID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prop-123",
    "name": "Westlands Tower",
    "location": "Westlands",
    "propertyType": "APARTMENT",
    "totalUnits": 12,
    "occupiedUnits": 11,
    "vacantUnits": 1,
    "occupancyRate": 91.7,
    "monthlyRevenue": 240000,
    "yearlyRevenue": 2880000,
    "averageRent": 21818,
    "collectionRate": 98.5,
    "outstandingAmount": 3600,
    "maintenanceScore": 4.2,
    "tenantSatisfaction": 4.5,
    "units": [
      {
        "id": "unit-456",
        "number": "A-12",
        "type": "2BR",
        "rent": 22000,
        "status": "OCCUPIED",
        "tenant": {
          "id": "tenant-789",
          "name": "John Kamau",
          "leaseStart": "2023-06-01",
          "leaseEnd": "2024-05-31"
        }
      }
    ],
    "revenueHistory": [
      {
        "month": "2024-01",
        "revenue": 240000,
        "collectionRate": 98.5
      }
    ],
    "maintenanceHistory": [
      {
        "date": "2024-01-10",
        "type": "Plumbing",
        "cost": 5000,
        "status": "COMPLETED"
      }
    ]
  }
}
```

### Financial Analytics

#### GET /api/dashboard/financial

Retrieves comprehensive financial analytics and reports.

**Parameters:**
- `dateRange` (optional): Date range filter
- `startDate` (optional): Start date for custom range
- `endDate` (optional): End date for custom range
- `breakdown` (optional): Breakdown type (monthly, quarterly, yearly)

**Example Request:**
```http
GET /api/dashboard/financial?dateRange=last-90-days&breakdown=monthly
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 7350000,
      "totalExpenses": 1470000,
      "netIncome": 5880000,
      "profitMargin": 80.0,
      "collectionRate": 96.8,
      "outstandingAmount": 405000
    },
    "revenueBreakdown": [
      {
        "category": "Rental Income",
        "amount": 7200000,
        "percentage": 98.0
      },
      {
        "category": "Service Charges",
        "amount": 150000,
        "percentage": 2.0
      }
    ],
    "expenseBreakdown": [
      {
        "category": "Maintenance",
        "amount": 588000,
        "percentage": 40.0
      },
      {
        "category": "Management Fees",
        "amount": 441000,
        "percentage": 30.0
      },
      {
        "category": "Utilities",
        "amount": 294000,
        "percentage": 20.0
      },
      {
        "category": "Insurance",
        "amount": 147000,
        "percentage": 10.0
      }
    ],
    "monthlyTrends": [
      {
        "month": "2023-11",
        "revenue": 2400000,
        "expenses": 480000,
        "netIncome": 1920000,
        "collectionRate": 97.2
      },
      {
        "month": "2023-12",
        "revenue": 2450000,
        "expenses": 490000,
        "netIncome": 1960000,
        "collectionRate": 96.8
      },
      {
        "month": "2024-01",
        "revenue": 2500000,
        "expenses": 500000,
        "netIncome": 2000000,
        "collectionRate": 96.4
      }
    ],
    "paymentMethods": [
      {
        "method": "Bank Transfer",
        "amount": 5880000,
        "percentage": 80.0
      },
      {
        "method": "Mobile Money",
        "amount": 1470000,
        "percentage": 20.0
      }
    ]
  },
  "meta": {
    "dateRange": "last-90-days",
    "breakdown": "monthly",
    "currency": "KES",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Tenant Analytics

#### GET /api/dashboard/tenants

Retrieves tenant analytics and insights.

**Parameters:**
- `status` (optional): Filter by tenant status (ACTIVE, INACTIVE, PENDING)
- `propertyId` (optional): Filter by property ID
- `leaseExpiring` (optional): Filter tenants with leases expiring soon (days)

**Example Request:**
```http
GET /api/dashboard/tenants?status=ACTIVE&leaseExpiring=30
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTenants": 68,
      "activeTenants": 65,
      "pendingTenants": 3,
      "averageTenancy": 18,
      "retentionRate": 92.5,
      "satisfactionScore": 4.3
    },
    "tenants": [
      {
        "id": "tenant-123",
        "name": "John Kamau",
        "email": "john.kamau@email.com",
        "phone": "+254712345678",
        "property": {
          "id": "prop-456",
          "name": "Westlands Tower",
          "unit": "A-12"
        },
        "lease": {
          "startDate": "2023-06-01",
          "endDate": "2024-05-31",
          "monthlyRent": 22000,
          "deposit": 44000,
          "status": "ACTIVE"
        },
        "paymentHistory": {
          "onTimePayments": 8,
          "latePayments": 0,
          "missedPayments": 0,
          "paymentScore": 100
        },
        "satisfactionScore": 4.5,
        "lastPayment": "2024-01-01",
        "nextPaymentDue": "2024-02-01"
      }
    ],
    "leaseExpirations": [
      {
        "tenantId": "tenant-789",
        "tenantName": "Mary Wanjiku",
        "propertyName": "Karen Villas",
        "unit": "B-5",
        "expirationDate": "2024-02-15",
        "daysUntilExpiration": 31,
        "renewalStatus": "PENDING"
      }
    ],
    "satisfactionTrends": [
      {
        "month": "2023-11",
        "averageScore": 4.2,
        "responseRate": 85
      },
      {
        "month": "2023-12",
        "averageScore": 4.3,
        "responseRate": 88
      },
      {
        "month": "2024-01",
        "averageScore": 4.3,
        "responseRate": 90
      }
    ]
  },
  "meta": {
    "total": 68,
    "filters": {
      "status": "ACTIVE",
      "leaseExpiring": 30
    }
  }
}
```

### Search and Filtering

#### POST /api/dashboard/search

Performs advanced search across dashboard data.

**Request Body:**
```json
{
  "query": "Westlands",
  "filters": [
    {
      "field": "location",
      "operator": "equals",
      "value": "Westlands"
    },
    {
      "field": "occupancyRate",
      "operator": "greaterThan",
      "value": 90
    }
  ],
  "sortBy": "monthlyRevenue",
  "sortOrder": "desc",
  "limit": 20,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "type": "property",
        "id": "prop-123",
        "title": "Westlands Tower",
        "subtitle": "12 units • 91.7% occupied",
        "description": "High-performance apartment complex in Westlands",
        "metadata": {
          "monthlyRevenue": 240000,
          "occupancyRate": 91.7,
          "location": "Westlands"
        },
        "relevance": 95
      }
    ],
    "suggestions": [
      "Westlands properties",
      "Westlands apartments",
      "High occupancy Westlands"
    ]
  },
  "meta": {
    "total": 5,
    "query": "Westlands",
    "executionTime": 45
  }
}
```

### Export Endpoints

#### POST /api/dashboard/export/pdf

Generates PDF reports for dashboard data.

**Request Body:**
```json
{
  "reportType": "financial",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "sections": ["overview", "revenue", "expenses"],
  "format": "detailed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://api.mzimahomes.com/downloads/report-123.pdf",
    "filename": "financial-report-2024-01.pdf",
    "size": 2048576,
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

#### POST /api/dashboard/export/excel

Generates Excel reports for dashboard data.

**Request Body:**
```json
{
  "reportType": "properties",
  "includeCharts": false,
  "worksheets": ["summary", "details", "analytics"]
}
```

### Real-time Endpoints

#### GET /api/dashboard/realtime/status

Checks real-time connection status and available subscriptions.

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "subscriptions": ["dashboard", "metrics", "properties"],
    "lastUpdate": "2024-01-15T10:30:00Z",
    "connectionId": "conn-abc123"
  }
}
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date range provided",
    "details": "End date must be after start date",
    "field": "dateRange"
  },
  "meta": {
    "requestId": "req-abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **Standard endpoints**: 100 requests per minute
- **Export endpoints**: 10 requests per minute
- **Search endpoints**: 50 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

```http
GET /api/dashboard/properties?limit=20&offset=40
```

Response includes pagination metadata:
```json
{
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true,
    "nextOffset": 60
  }
}
```

## Caching

API responses are cached to improve performance:

- **Metrics**: 5 minutes
- **Properties**: 15 minutes
- **Financial**: 30 minutes
- **Tenants**: 10 minutes

Cache headers indicate freshness:
```http
Cache-Control: max-age=300
ETag: "abc123"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
```

## Webhooks

Subscribe to real-time events using webhooks:

### Webhook Events

- `dashboard.metrics.updated`
- `property.occupancy.changed`
- `payment.received`
- `lease.expiring`
- `maintenance.requested`

### Webhook Payload

```json
{
  "event": "dashboard.metrics.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "metric": "monthlyRevenue",
    "oldValue": 2400000,
    "newValue": 2450000,
    "propertyId": "prop-123"
  },
  "signature": "sha256=abc123..."
}
```

## SDK and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @mzimahomes/dashboard-sdk
```

```typescript
import { DashboardClient } from '@mzimahomes/dashboard-sdk'

const client = new DashboardClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://dashboard.mzimahomes.com/api'
})

const metrics = await client.getMetrics()
const properties = await client.getProperties({ location: 'Westlands' })
```

## Support

For API support and questions:
- **Documentation**: [docs.mzimahomes.com/api](https://docs.mzimahomes.com/api)
- **Email**: api-support@mzimahomes.com
- **Status Page**: [status.mzimahomes.com](https://status.mzimahomes.com)

---

**API Version**: v1.0.0  
**Last Updated**: January 15, 2024
