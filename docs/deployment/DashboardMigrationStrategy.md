# Dashboard Migration and Deployment Strategy

## Overview

This document outlines the comprehensive migration and deployment strategy for the new Property Management Dashboard system. The strategy ensures zero-downtime migration, data integrity, and seamless user transition.

## Migration Phases

### Phase 1: Pre-Migration Setup (Week 1)

#### 1.1 Environment Preparation
- [ ] Set up staging environment with new dashboard
- [ ] Configure CI/CD pipelines for dashboard deployment
- [ ] Set up monitoring and logging for new dashboard
- [ ] Prepare rollback procedures

#### 1.2 Data Migration Preparation
- [ ] Audit existing dashboard data and configurations
- [ ] Create data migration scripts
- [ ] Set up data validation procedures
- [ ] Prepare user preference migration

#### 1.3 Testing Environment Setup
- [ ] Deploy dashboard to testing environment
- [ ] Configure test data and scenarios
- [ ] Set up automated testing pipelines
- [ ] Prepare user acceptance testing environment

### Phase 2: Parallel Deployment (Week 2)

#### 2.1 Feature Flag Implementation
```typescript
// Feature flag configuration
export const DASHBOARD_FEATURE_FLAGS = {
  NEW_DASHBOARD_ENABLED: process.env.NEW_DASHBOARD_ENABLED === 'true',
  LEGACY_DASHBOARD_FALLBACK: process.env.LEGACY_DASHBOARD_FALLBACK === 'true',
  DASHBOARD_A_B_TEST: process.env.DASHBOARD_A_B_TEST === 'true',
  DASHBOARD_BETA_USERS: process.env.DASHBOARD_BETA_USERS?.split(',') || []
}
```

#### 2.2 Gradual Rollout Strategy
- [ ] Deploy new dashboard alongside existing system
- [ ] Enable for beta users (5% of user base)
- [ ] Monitor performance and user feedback
- [ ] Gradually increase user percentage

#### 2.3 Data Synchronization
- [ ] Implement real-time data sync between systems
- [ ] Set up data consistency checks
- [ ] Monitor data integrity during parallel operation

### Phase 3: Full Migration (Week 3)

#### 3.1 Complete User Migration
- [ ] Migrate all users to new dashboard
- [ ] Disable legacy dashboard access
- [ ] Update all navigation links and references
- [ ] Communicate changes to users

#### 3.2 Legacy System Cleanup
- [ ] Archive legacy dashboard code
- [ ] Clean up unused database tables
- [ ] Remove deprecated API endpoints
- [ ] Update documentation

## Deployment Architecture

### Production Environment Setup

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  dashboard-app:
    image: mzima-homes/dashboard:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  dashboard-nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - dashboard-app
    restart: unless-stopped

  dashboard-redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### Load Balancer Configuration

```nginx
# nginx.conf
upstream dashboard_backend {
    server dashboard-app:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name dashboard.mzimahomes.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.mzimahomes.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://dashboard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Database Migration

### Migration Scripts

```sql
-- 001_create_dashboard_tables.sql
CREATE TABLE IF NOT EXISTS dashboard_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    configuration JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL,
    configuration JSONB NOT NULL,
    position JSONB NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key VARCHAR(100) NOT NULL,
    metric_value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_dashboard_configurations_user_id ON dashboard_configurations(user_id);
CREATE INDEX idx_dashboard_widgets_user_id ON dashboard_widgets(user_id);
CREATE INDEX idx_dashboard_metrics_cache_key ON dashboard_metrics_cache(metric_key);
CREATE INDEX idx_dashboard_metrics_cache_expires ON dashboard_metrics_cache(expires_at);

-- RLS Policies
ALTER TABLE dashboard_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboard configurations" ON dashboard_configurations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dashboard configurations" ON dashboard_configurations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard configurations" ON dashboard_configurations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dashboard configurations" ON dashboard_configurations
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own dashboard widgets" ON dashboard_widgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dashboard widgets" ON dashboard_widgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard widgets" ON dashboard_widgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dashboard widgets" ON dashboard_widgets
    FOR DELETE USING (auth.uid() = user_id);
```

### Data Migration Script

```typescript
// scripts/migrate-dashboard-data.ts
import { createClient } from '@supabase/supabase-js'

interface LegacyDashboardConfig {
  userId: string
  preferences: any
  widgets: any[]
}

interface NewDashboardConfig {
  user_id: string
  configuration: any
}

export async function migrateDashboardData() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  console.log('Starting dashboard data migration...')

  try {
    // Fetch legacy dashboard configurations
    const { data: legacyConfigs, error: fetchError } = await supabase
      .from('legacy_dashboard_configs')
      .select('*')

    if (fetchError) {
      throw new Error(`Failed to fetch legacy configs: ${fetchError.message}`)
    }

    console.log(`Found ${legacyConfigs?.length || 0} legacy configurations`)

    // Migrate each configuration
    for (const legacyConfig of legacyConfigs || []) {
      await migrateSingleConfig(supabase, legacyConfig)
    }

    console.log('Dashboard data migration completed successfully')
  } catch (error) {
    console.error('Dashboard data migration failed:', error)
    throw error
  }
}

async function migrateSingleConfig(
  supabase: any,
  legacyConfig: LegacyDashboardConfig
) {
  // Transform legacy configuration to new format
  const newConfig: NewDashboardConfig = {
    user_id: legacyConfig.userId,
    configuration: {
      theme: legacyConfig.preferences?.theme || 'default',
      layout: {
        gridColumns: legacyConfig.preferences?.gridColumns || 4,
        widgetSpacing: legacyConfig.preferences?.widgetSpacing || 16,
        showWidgetTitles: legacyConfig.preferences?.showWidgetTitles ?? true,
        showWidgetBorders: legacyConfig.preferences?.showWidgetBorders ?? true,
        compactMode: legacyConfig.preferences?.compactMode ?? false
      },
      widgets: legacyConfig.widgets?.map(widget => ({
        id: widget.id,
        type: widget.type,
        position: widget.position,
        size: widget.size || 'medium',
        visible: widget.visible ?? true,
        config: widget.config || {}
      })) || []
    }
  }

  // Insert new configuration
  const { error: insertError } = await supabase
    .from('dashboard_configurations')
    .insert(newConfig)

  if (insertError) {
    console.error(`Failed to migrate config for user ${legacyConfig.userId}:`, insertError)
    throw insertError
  }

  console.log(`Migrated configuration for user ${legacyConfig.userId}`)
}

// Run migration if called directly
if (require.main === module) {
  migrateDashboardData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
```

## Monitoring and Observability

### Health Check Endpoint

```typescript
// pages/api/health.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: false,
      redis: false,
      supabase: false
    }
  }

  try {
    // Check Supabase connection
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    
    const { error } = await supabase.from('properties').select('count').limit(1)
    checks.checks.supabase = !error

    // Check Redis connection (if using Redis)
    if (process.env.REDIS_URL) {
      // Add Redis health check
      checks.checks.redis = true
    }

    // Overall health status
    const allHealthy = Object.values(checks.checks).every(check => check)
    checks.status = allHealthy ? 'healthy' : 'unhealthy'

    res.status(allHealthy ? 200 : 503).json(checks)
  } catch (error) {
    checks.status = 'unhealthy'
    res.status(503).json(checks)
  }
}
```

### Performance Monitoring

```typescript
// lib/monitoring/performance.ts
export class DashboardPerformanceMonitor {
  private static instance: DashboardPerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): DashboardPerformanceMonitor {
    if (!DashboardPerformanceMonitor.instance) {
      DashboardPerformanceMonitor.instance = new DashboardPerformanceMonitor()
    }
    return DashboardPerformanceMonitor.instance
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift()
    }
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const [name, values] of this.metrics.entries()) {
      result[name] = {
        count: values.length,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1]
      }
    }
    
    return result
  }
}
```

## Rollback Strategy

### Automated Rollback Triggers

```typescript
// scripts/rollback-dashboard.ts
interface RollbackCriteria {
  errorRate: number
  responseTime: number
  userComplaints: number
}

const ROLLBACK_THRESHOLDS: RollbackCriteria = {
  errorRate: 5, // 5% error rate
  responseTime: 2000, // 2 seconds
  userComplaints: 10 // 10 complaints in 5 minutes
}

export async function checkRollbackCriteria(): Promise<boolean> {
  const metrics = await getCurrentMetrics()
  
  return (
    metrics.errorRate > ROLLBACK_THRESHOLDS.errorRate ||
    metrics.responseTime > ROLLBACK_THRESHOLDS.responseTime ||
    metrics.userComplaints > ROLLBACK_THRESHOLDS.userComplaints
  )
}

export async function executeRollback(): Promise<void> {
  console.log('Executing dashboard rollback...')
  
  // 1. Switch traffic back to legacy dashboard
  await updateLoadBalancerConfig('legacy')
  
  // 2. Disable new dashboard feature flags
  await updateFeatureFlags({ NEW_DASHBOARD_ENABLED: false })
  
  // 3. Notify team
  await sendRollbackNotification()
  
  console.log('Dashboard rollback completed')
}
```

## Security Considerations

### Security Checklist
- [ ] SSL/TLS certificates configured
- [ ] Security headers implemented
- [ ] CORS policies configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Authentication and authorization
- [ ] Data encryption at rest and in transit

### Environment Variables Security

```bash
# .env.production (encrypted)
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://dashboard.mzimahomes.com
REDIS_URL=redis://...
MONITORING_API_KEY=...
```

## Post-Deployment Checklist

### Immediate Post-Deployment (Day 1)
- [ ] Verify all services are running
- [ ] Check health endpoints
- [ ] Monitor error rates
- [ ] Verify user authentication
- [ ] Test critical user flows
- [ ] Monitor performance metrics
- [ ] Check data synchronization

### Short-term Monitoring (Week 1)
- [ ] Daily performance reviews
- [ ] User feedback collection
- [ ] Error rate monitoring
- [ ] Database performance analysis
- [ ] Security audit
- [ ] Backup verification

### Long-term Monitoring (Month 1)
- [ ] Performance trend analysis
- [ ] User adoption metrics
- [ ] Cost analysis
- [ ] Capacity planning
- [ ] Security review
- [ ] Documentation updates

## Success Metrics

### Technical Metrics
- **Uptime**: > 99.9%
- **Response Time**: < 500ms (95th percentile)
- **Error Rate**: < 1%
- **Database Performance**: < 100ms query time
- **Memory Usage**: < 80% of allocated

### Business Metrics
- **User Adoption**: > 95% within 2 weeks
- **User Satisfaction**: > 4.5/5 rating
- **Support Tickets**: < 10% increase
- **Feature Usage**: > 80% of features used
- **Performance Improvement**: > 50% faster load times

## Communication Plan

### Stakeholder Communication
- **Development Team**: Daily standups during migration
- **Product Team**: Weekly progress reports
- **Management**: Milestone updates
- **Users**: Migration announcements and training
- **Support Team**: Training on new features

### User Communication Timeline
- **2 weeks before**: Migration announcement
- **1 week before**: Training materials released
- **Day of migration**: Real-time updates
- **1 week after**: Feedback collection
- **1 month after**: Success metrics report

This migration strategy ensures a smooth transition to the new dashboard system while maintaining system reliability and user satisfaction.
