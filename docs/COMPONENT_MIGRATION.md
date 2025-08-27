# Component Migration Guide

This guide explains how to migrate existing components to use the new CQRS pattern and optimized state management.

## Overview

The migration involves three main changes:
1. **Replace Context usage** with CQRS hooks
2. **Implement code splitting** with dynamic imports
3. **Optimize bundle size** with proper chunking

## Migration Steps

### 1. Replace Context with CQRS Hooks

#### Before (Context-based)
```typescript
// Old approach using DashboardContext
import { useDashboardContext } from '../context/DashboardContext'

function PropertyList() {
  const { 
    state: { properties, loading, selectedProperty },
    dispatch 
  } = useDashboardContext()

  const handleCreate = (propertyData) => {
    dispatch({ type: 'CREATE_PROPERTY', payload: propertyData })
  }

  const handleSelect = (property) => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property })
  }

  return (
    <div>
      {loading && <LoadingSpinner />}
      {properties.map(property => (
        <PropertyCard 
          key={property.id}
          property={property}
          selected={selectedProperty?.id === property.id}
          onSelect={() => handleSelect(property)}
        />
      ))}
    </div>
  )
}
```

#### After (CQRS-based)
```typescript
// New approach using CQRS hooks
import { useProperties, useCreateProperty } from '../hooks/useCQRSIntegration'
import { usePropertyStore } from '../stores/propertyStore'

function PropertyList() {
  // Use CQRS query hook for data fetching
  const { data: properties, isLoading, refetch } = useProperties()
  
  // Use CQRS command hook for mutations
  const { execute: createProperty, isLoading: isCreating } = useCreateProperty({
    onSuccess: () => refetch() // Refresh data after creation
  })
  
  // Use store for UI state
  const { selectedProperty, selectProperty } = usePropertyStore()

  const handleCreate = async (propertyData) => {
    await createProperty(propertyData)
  }

  const handleSelect = (property) => {
    selectProperty(property.id)
  }

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      {properties?.map(property => (
        <PropertyCard 
          key={property.id}
          property={property}
          selected={selectedProperty?.id === property.id}
          onSelect={() => handleSelect(property)}
        />
      ))}
    </div>
  )
}
```

### 2. Implement Code Splitting

#### Before (Static imports)
```typescript
// Old approach with static imports
import PropertyList from './PropertyList'
import PropertyForm from './PropertyForm'
import PropertyDetails from './PropertyDetails'

function PropertiesPage() {
  const [activeTab, setActiveTab] = useState('list')

  return (
    <div>
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'list' && <PropertyList />}
      {activeTab === 'form' && <PropertyForm />}
      {activeTab === 'details' && <PropertyDetails />}
    </div>
  )
}
```

#### After (Dynamic imports)
```typescript
// New approach with dynamic imports
import { DynamicComponents } from '../utils/dynamicImports'
import { Suspense } from 'react'

function PropertiesPage() {
  const [activeTab, setActiveTab] = useState('list')

  return (
    <div>
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <Suspense fallback={<LoadingSpinner />}>
        {activeTab === 'list' && <DynamicComponents.PropertyList />}
        {activeTab === 'form' && <DynamicComponents.PropertyForm />}
        {activeTab === 'details' && <DynamicComponents.PropertyDetails />}
      </Suspense>
    </div>
  )
}
```

### 3. Optimize Component Loading

#### Preload Components
```typescript
import { ComponentPreloader } from '../utils/dynamicImports'

function PropertiesPage() {
  const [activeTab, setActiveTab] = useState('list')

  // Preload components when user hovers over tabs
  const handleTabHover = (tab: string) => {
    switch (tab) {
      case 'form':
        ComponentPreloader.preload('PropertyForm')
        break
      case 'details':
        ComponentPreloader.preload('PropertyDetails')
        break
    }
  }

  return (
    <div>
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onTabHover={handleTabHover}
      />
      {/* Component rendering */}
    </div>
  )
}
```

## Migration Patterns

### 1. Data Fetching Pattern

#### Before
```typescript
const { state, dispatch } = useDashboardContext()

useEffect(() => {
  dispatch({ type: 'FETCH_PROPERTIES' })
}, [])
```

#### After
```typescript
const { data, isLoading, error } = useProperties({}, {}, {
  autoRefresh: true,
  refreshInterval: 60000
})
```

### 2. Form Submission Pattern

#### Before
```typescript
const handleSubmit = (data) => {
  dispatch({ type: 'CREATE_PROPERTY', payload: data })
}
```

#### After
```typescript
const { execute: createProperty } = useCreateProperty({
  showNotifications: true,
  onSuccess: () => {
    // Handle success
    router.push('/properties')
  }
})

const handleSubmit = async (data) => {
  await createProperty(data)
}
```

### 3. Selection Management Pattern

#### Before
```typescript
const { state: { selectedProperty }, dispatch } = useDashboardContext()

const handleSelect = (property) => {
  dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property })
}
```

#### After
```typescript
const { selectedProperty, selectProperty } = usePropertyStore()

const handleSelect = (property) => {
  selectProperty(property.id)
}
```

### 4. Bulk Operations Pattern

#### Before
```typescript
const handleBulkDelete = (propertyIds) => {
  dispatch({ type: 'BULK_DELETE_PROPERTIES', payload: propertyIds })
}
```

#### After
```typescript
const { 
  selectedItems, 
  selectItem, 
  executeBulkCommand,
  clearSelection 
} = useBulkOperations()

const handleBulkDelete = async () => {
  await executeBulkCommand('BulkDeleteProperties', {
    propertyIds: selectedItems
  })
}
```

## Performance Optimizations

### 1. Memoization
```typescript
import { memo, useMemo } from 'react'

const PropertyCard = memo(({ property, onSelect, selected }) => {
  const cardStyle = useMemo(() => ({
    backgroundColor: selected ? '#e3f2fd' : '#ffffff',
    border: selected ? '2px solid #2196f3' : '1px solid #e0e0e0'
  }), [selected])

  return (
    <div style={cardStyle} onClick={() => onSelect(property)}>
      {/* Card content */}
    </div>
  )
})
```

### 2. Virtual Scrolling for Large Lists
```typescript
import { FixedSizeList as List } from 'react-window'

function PropertyList() {
  const { data: properties } = useProperties()

  const Row = ({ index, style }) => (
    <div style={style}>
      <PropertyCard property={properties[index]} />
    </div>
  )

  return (
    <List
      height={600}
      itemCount={properties?.length || 0}
      itemSize={120}
    >
      {Row}
    </List>
  )
}
```

### 3. Debounced Search
```typescript
import { useDebouncedCallback } from 'use-debounce'

function PropertySearch() {
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: results } = useSearchProperties(searchTerm, {}, {}, {
    enabled: searchTerm.length > 2
  })

  const debouncedSearch = useDebouncedCallback(
    (value: string) => setSearchTerm(value),
    300
  )

  return (
    <input
      type="text"
      placeholder="Search properties..."
      onChange={(e) => debouncedSearch(e.target.value)}
    />
  )
}
```

## Bundle Analysis

### 1. Analyze Bundle Size
```bash
# Run bundle analyzer
ANALYZE=true npm run build

# Check specific chunks
npm run build && npx webpack-bundle-analyzer .next/static/chunks/*.js
```

### 2. Monitor Performance
```typescript
import { BundleSizeMonitor } from '../utils/dynamicImports'

// Monitor component load times
const loadComponent = () => {
  return BundleSizeMonitor.measureComponentLoad(
    'PropertyList',
    () => import('./PropertyList')
  )
}

// Get performance metrics
const metrics = BundleSizeMonitor.getSlowestComponents()
console.log('Slowest components:', metrics)
```

## Testing Migration

### 1. Unit Tests
```typescript
import { renderHook } from '@testing-library/react'
import { useProperties } from '../hooks/useCQRSIntegration'

test('useProperties hook fetches data correctly', async () => {
  const { result, waitForNextUpdate } = renderHook(() => 
    useProperties({}, {}, { enabled: true })
  )

  expect(result.current.isLoading).toBe(true)
  
  await waitForNextUpdate()
  
  expect(result.current.isLoading).toBe(false)
  expect(result.current.data).toBeDefined()
})
```

### 2. Integration Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { PropertyList } from './PropertyList'

test('PropertyList renders and handles selection', async () => {
  render(<PropertyList />)
  
  // Wait for data to load
  await screen.findByText('Property 1')
  
  // Test selection
  fireEvent.click(screen.getByText('Property 1'))
  
  expect(screen.getByText('Property 1')).toHaveClass('selected')
})
```

## Migration Checklist

- [ ] Replace `useDashboardContext` with CQRS hooks
- [ ] Implement dynamic imports for large components
- [ ] Add proper loading states and error handling
- [ ] Optimize with memoization where appropriate
- [ ] Add virtual scrolling for large lists
- [ ] Implement debounced search
- [ ] Add bundle size monitoring
- [ ] Update tests to use new patterns
- [ ] Verify performance improvements
- [ ] Update documentation

## Common Issues and Solutions

### 1. Hydration Mismatch
**Problem**: SSR/Client mismatch with dynamic imports
**Solution**: Use `ssr: false` for client-only components

### 2. Loading State Flicker
**Problem**: Brief loading states between component switches
**Solution**: Preload components and use proper suspense boundaries

### 3. Memory Leaks
**Problem**: Components not properly cleaning up
**Solution**: Use cleanup functions in useEffect and proper dependency arrays

### 4. Performance Regression
**Problem**: Slower performance after migration
**Solution**: Profile with React DevTools and optimize critical paths

## Next Steps

After migration:
1. Monitor bundle sizes and performance metrics
2. Implement progressive loading for non-critical features
3. Add service worker for caching
4. Consider implementing virtual scrolling for large datasets
5. Optimize images and assets
6. Implement proper error boundaries
