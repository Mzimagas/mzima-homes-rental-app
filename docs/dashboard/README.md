# Property Management Dashboard Documentation

## Overview

The Property Management Dashboard is a comprehensive, real-time analytics and management platform designed for property managers, landlords, and administrators. Built with Next.js, TypeScript, and Supabase, it provides powerful insights into property performance, financial analytics, tenant management, and operational efficiency.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [Component Documentation](#component-documentation)
5. [API Reference](#api-reference)
6. [State Management](#state-management)
7. [Real-time Features](#real-time-features)
8. [Performance Optimization](#performance-optimization)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Guide](#deployment-guide)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)

## Architecture Overview

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Headless UI
- **State Management**: Zustand, React Query
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime, WebSockets
- **Charts**: Recharts
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Docker, GitHub Actions

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard UI  │    │   API Layer     │    │   Database      │
│                 │    │                 │    │                 │
│ • React Components │◄──►│ • Next.js API   │◄──►│ • Supabase      │
│ • Zustand Store │    │ • Dashboard Service │    │ • PostgreSQL    │
│ • React Query   │    │ • Real-time Hub │    │ • Row Level Sec │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Real-time     │    │   Caching       │    │   External APIs │
│                 │    │                 │    │                 │
│ • WebSocket     │    │ • Redis Cache   │    │ • Payment APIs  │
│ • Live Updates  │    │ • Query Cache   │    │ • SMS/Email     │
│ • Notifications │    │ • Browser Cache │    │ • File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Design Principles

1. **Performance First**: Optimized for fast loading and smooth interactions
2. **Mobile Responsive**: Works seamlessly across all device sizes
3. **Real-time Updates**: Live data synchronization across all clients
4. **Accessibility**: WCAG 2.1 AA compliant
5. **Scalability**: Designed to handle growing data and user base
6. **Security**: Comprehensive security measures and data protection

## Features

### Core Dashboard Features

#### 📊 **Analytics Overview**
- Real-time property metrics
- Financial performance indicators
- Occupancy rate tracking
- Revenue trend analysis
- Collection rate monitoring

#### 🏠 **Property Management**
- Property performance analytics
- Unit-level insights
- Maintenance tracking
- Lifecycle management
- Location-based analytics

#### 💰 **Financial Dashboard**
- Revenue and expense tracking
- Payment collection analytics
- Profit and loss statements
- Cash flow analysis
- Financial forecasting

#### 👥 **Tenant Analytics**
- Tenant satisfaction metrics
- Lease expiration tracking
- Payment history analysis
- Communication logs
- Retention analytics

#### 📈 **Advanced Features**
- Interactive charts and visualizations
- Customizable dashboard layouts
- Advanced search and filtering
- PDF and Excel export capabilities
- Mobile-optimized interface

### Real-time Capabilities

- **Live Data Updates**: Automatic refresh of metrics and charts
- **Multi-user Synchronization**: Changes reflected across all connected users
- **Real-time Notifications**: Instant alerts for important events
- **WebSocket Integration**: Efficient real-time communication

### Customization Options

- **Theme Selection**: Multiple color themes including dark mode
- **Layout Customization**: Adjustable grid layouts and widget positioning
- **Widget Configuration**: Show/hide widgets based on user preferences
- **Personalized Dashboards**: User-specific configurations and saved views

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mzimagas/Mzima-Homes-App.git
   cd mzima-homes-rental-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Database setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the dashboard**
   Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### Quick Start Guide

1. **Login**: Use your credentials to access the dashboard
2. **Explore Overview**: Review key metrics on the main dashboard
3. **Navigate Tabs**: Switch between Properties, Financial, and Tenants tabs
4. **Customize Layout**: Click the settings icon to customize your dashboard
5. **Export Data**: Use export buttons to generate reports

## Component Documentation

### Core Components

#### DashboardLayout
Main layout component that provides the overall structure and navigation.

```typescript
import DashboardLayout from '@/components/dashboard/DashboardLayout'

<DashboardLayout>
  {/* Dashboard content */}
</DashboardLayout>
```

**Props:**
- `children`: React.ReactNode - Dashboard content
- `title?`: string - Page title
- `showBreadcrumbs?`: boolean - Show navigation breadcrumbs

#### MetricsGrid
Displays key performance indicators in a responsive grid layout.

```typescript
import { MetricsGrid } from '@/components/dashboard/metrics/MetricsGrid'

<MetricsGrid 
  metricIds={['totalProperties', 'activeTenants', 'monthlyRevenue']}
  columns={4}
  compact={false}
/>
```

**Props:**
- `metricIds`: string[] - Array of metric IDs to display
- `columns?`: number - Number of grid columns (responsive)
- `compact?`: boolean - Use compact layout for mobile

#### DashboardNavigation
Navigation component with tab-based interface.

```typescript
import { DashboardNavigation } from '@/components/dashboard/DashboardNavigation'

<DashboardNavigation 
  activeTab="overview"
  onTabChange={handleTabChange}
  variant="desktop"
/>
```

**Props:**
- `activeTab`: string - Currently active tab
- `onTabChange`: (tab: string) => void - Tab change handler
- `variant?`: 'desktop' | 'mobile' - Navigation variant

### Chart Components

#### RevenueLineChart
Line chart for displaying revenue trends over time.

```typescript
import { RevenueLineChart } from '@/components/dashboard/charts/ChartComponents'

<RevenueLineChart 
  data={revenueData}
  config={{ height: 300, showGrid: true }}
/>
```

#### OccupancyAreaChart
Area chart for occupancy rate visualization.

```typescript
import { OccupancyAreaChart } from '@/components/dashboard/charts/ChartComponents'

<OccupancyAreaChart 
  data={occupancyData}
  config={{ height: 250 }}
/>
```

### Search and Filter Components

#### DashboardSearch
Advanced search component with filtering capabilities.

```typescript
import { DashboardSearch } from '@/components/dashboard/search/DashboardSearch'

<DashboardSearch 
  placeholder="Search properties, tenants..."
  showFilters={true}
  onSearch={handleSearch}
/>
```

### Export Components

#### DashboardExport
Export functionality for generating PDF and Excel reports.

```typescript
import { DashboardExport } from '@/components/dashboard/export/DashboardExport'

<DashboardExport 
  onExportStart={handleExportStart}
  onExportComplete={handleExportComplete}
/>
```

## API Reference

### Dashboard Service

The `DashboardService` provides methods for fetching dashboard data.

```typescript
import { dashboardService } from '@/services/DashboardService'

// Get dashboard metrics
const metrics = await dashboardService.getDashboardMetrics()

// Get property analytics
const properties = await dashboardService.getPropertyAnalytics({
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  filters: { location: 'Westlands' }
})

// Get financial analytics
const financial = await dashboardService.getFinancialAnalytics()

// Get tenant analytics
const tenants = await dashboardService.getTenantAnalytics()
```

### API Endpoints

#### GET /api/dashboard/metrics
Returns key dashboard metrics.

**Response:**
```json
{
  "totalProperties": 25,
  "activeTenants": 68,
  "monthlyRevenue": 2450000,
  "occupancyRate": 94.1,
  "collectionRate": 96.5,
  "outstandingAmount": 135000
}
```

#### GET /api/dashboard/properties
Returns property analytics data.

**Query Parameters:**
- `dateRange`: string - Date range filter
- `location`: string - Location filter
- `propertyType`: string - Property type filter

#### GET /api/dashboard/financial
Returns financial analytics data.

#### GET /api/dashboard/tenants
Returns tenant analytics data.

## State Management

### Dashboard Store (Zustand)

The dashboard uses Zustand for state management with the following structure:

```typescript
interface DashboardState {
  // Data
  metrics: DashboardMetrics | null
  properties: Property[]
  tenants: Tenant[]
  financial: FinancialData[]
  
  // UI State
  loading: boolean
  error: string | null
  activeTab: string
  searchQuery: string
  filters: SearchFilter[]
  
  // Actions
  fetchMetrics: () => Promise<void>
  fetchProperties: () => Promise<void>
  setActiveTab: (tab: string) => void
  setSearchQuery: (query: string) => void
  updateMetrics: (metrics: Partial<DashboardMetrics>) => void
}
```

### Usage Example

```typescript
import { useDashboardStore } from '@/presentation/stores/dashboardStore'

function DashboardComponent() {
  const { 
    metrics, 
    loading, 
    fetchMetrics,
    setActiveTab 
  } = useDashboardStore()
  
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])
  
  return (
    <div>
      {loading ? <LoadingSpinner /> : <MetricsDisplay metrics={metrics} />}
    </div>
  )
}
```

### Context Provider

The `DashboardContextProvider` wraps the dashboard and provides additional context:

```typescript
import { DashboardContextProvider } from '@/contexts/DashboardContextProvider'

function App() {
  return (
    <DashboardContextProvider>
      <DashboardLayout />
    </DashboardContextProvider>
  )
}
```

## Real-time Features

### WebSocket Integration

The dashboard uses Supabase Realtime for live updates:

```typescript
import { useRealTimeDashboard } from '@/hooks/useRealTimeDashboard'

function DashboardComponent() {
  const { connected, lastUpdate } = useRealTimeDashboard({
    autoConnect: true,
    subscriptions: ['dashboard', 'metrics'],
    onMetricUpdate: (data) => {
      // Handle real-time metric updates
      console.log('Metric updated:', data)
    }
  })
  
  return (
    <div>
      <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
        {connected ? 'Live updates active' : 'Connecting...'}
      </div>
    </div>
  )
}
```

### Real-time Subscriptions

Available real-time subscriptions:
- `dashboard`: General dashboard updates
- `metrics`: Metric value changes
- `properties`: Property data changes
- `financial`: Financial data updates
- `tenants`: Tenant data changes

## Performance Optimization

### Performance Monitoring

The dashboard includes built-in performance monitoring:

```typescript
import { usePerformanceMonitor } from '@/lib/performance/DashboardPerformanceMonitor'

function DashboardComponent() {
  const { startMeasurement, endMeasurement, getReport } = usePerformanceMonitor()
  
  useEffect(() => {
    startMeasurement('dashboard-load')
    
    // Component logic
    
    endMeasurement('dashboard-load', 'render')
  }, [])
}
```

### Optimization Techniques

1. **Code Splitting**: Lazy loading of dashboard sections
2. **Memoization**: React.memo and useMemo for expensive calculations
3. **Virtual Scrolling**: For large data lists
4. **Image Optimization**: Next.js Image component
5. **Bundle Analysis**: Regular bundle size monitoring

### Performance Budgets

- Initial page load: < 3 seconds
- Tab navigation: < 2 seconds
- Search results: < 1 second
- Chart rendering: < 500ms
- Memory usage: < 100MB

## Testing Strategy

### Test Types

1. **Unit Tests**: Component and utility function testing
2. **Integration Tests**: API and data flow testing
3. **E2E Tests**: Complete user journey testing
4. **Performance Tests**: Load time and responsiveness testing
5. **Accessibility Tests**: WCAG compliance testing

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance

# All tests
npm run test:all
```

### Test Coverage

Target coverage: 90%+
- Components: 95%+
- Services: 90%+
- Utilities: 95%+
- Hooks: 90%+

## Deployment Guide

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy using Docker**
   ```bash
   docker build -t mzima-homes-dashboard .
   docker run -p 3000:3000 mzima-homes-dashboard
   ```

3. **Deploy using the deployment script**
   ```bash
   ./scripts/deploy-dashboard.sh production --backup --health-check
   ```

### Environment Configuration

Production environment variables:
```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXTAUTH_SECRET=your_production_secret
NEXTAUTH_URL=https://dashboard.mzimahomes.com
```

### Monitoring and Logging

- **Health Checks**: `/api/health` endpoint
- **Performance Monitoring**: Built-in performance tracking
- **Error Logging**: Comprehensive error reporting
- **Analytics**: User interaction tracking

## Troubleshooting

### Common Issues

#### Dashboard Not Loading
1. Check environment variables
2. Verify Supabase connection
3. Check browser console for errors
4. Verify user authentication

#### Real-time Updates Not Working
1. Check WebSocket connection
2. Verify Supabase Realtime configuration
3. Check network connectivity
4. Review browser WebSocket support

#### Performance Issues
1. Check network speed
2. Monitor memory usage
3. Review performance metrics
4. Optimize data queries

#### Export Functionality Issues
1. Check browser download settings
2. Verify export permissions
3. Review data size limits
4. Check PDF/Excel generation

### Debug Mode

Enable debug mode for detailed logging:
```env
DEBUG=true
NEXT_PUBLIC_DEBUG_DASHBOARD=true
```

### Support

For technical support:
- Email: support@mzimahomes.com
- Documentation: [docs.mzimahomes.com](https://docs.mzimahomes.com)
- GitHub Issues: [GitHub Repository](https://github.com/Mzimagas/Mzima-Homes-App/issues)

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Commit message format

### Pull Request Process

1. Ensure all tests pass
2. Update documentation
3. Add changelog entry
4. Request code review
5. Address feedback
6. Merge after approval

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

---

**Built with ❤️ by the Mzima Homes Team**
