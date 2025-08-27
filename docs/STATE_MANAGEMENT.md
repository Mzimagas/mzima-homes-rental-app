# State Management Architecture

This document describes the comprehensive state management system implemented using Zustand stores with proper normalization and clean architecture integration.

## Overview

The application uses a centralized state management approach with Zustand stores, replacing the previous scattered useState/useContext patterns. The state is properly normalized and follows clean architecture principles.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  React Components, Hooks, UI State Management              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Zustand Stores Layer                     │
│     Property Store, Tenant Store, UI Store                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│     Use Cases, Commands, Queries, DTOs                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│   Entities, Value Objects, Domain Services                 │
└─────────────────────────────────────────────────────────────┘
```

## Store Structure

### 1. Property Store (`propertyStore.ts`)

**Purpose**: Manages property entities with normalized state and business logic

**Key Features**:
- Normalized entity storage (`{ byId: {}, allIds: [] }`)
- Advanced filtering and sorting
- Pagination support
- Selection management (single and multi-select)
- Cache management with TTL
- Real-time computed state updates

**State Structure**:
```typescript
interface PropertyStoreState {
  // Normalized entities
  entities: NormalizedState<Property>
  
  // UI state
  filters: PropertyFilterState
  pagination: PaginationState
  selection: SelectionState<Property>
  
  // Cache and sync
  cache: CacheState
  syncState: AsyncState
  
  // Computed state (auto-updated)
  filteredIds: string[]
  sortedIds: string[]
  paginatedIds: string[]
}
```

**Key Actions**:
- Entity operations: `addProperty`, `updateProperty`, `removeProperty`
- Bulk operations: `setProperties`, `upsertProperties`
- Selection: `selectProperty`, `toggleMultiSelect`
- Filtering: `setFilter`, `updateFilters`, `setSearchTerm`
- Pagination: `setPage`, `setLimit`
- Business queries: `getPropertiesByOwner`, `getAvailableProperties`

### 2. Tenant Store (`tenantStore.ts`)

**Purpose**: Manages tenant entities with lease and contact information

**Key Features**:
- Normalized tenant storage
- Lease management and expiration tracking
- Contact information validation
- Status management with business rules
- Advanced search and filtering

**State Structure**:
```typescript
interface TenantStoreState {
  entities: NormalizedState<Tenant>
  filters: TenantFilterState
  pagination: PaginationState
  selection: SelectionState<Tenant>
  cache: CacheState
  syncState: AsyncState
  filteredIds: string[]
  sortedIds: string[]
  paginatedIds: string[]
}
```

**Business Logic**:
- Lease expiration detection
- Active tenant tracking
- Unit assignment management
- Rent and deposit handling

### 3. UI Store (`uiStore.ts`)

**Purpose**: Manages all UI-specific state and user interactions

**Key Features**:
- Navigation and routing state
- Modal and dialog management
- Layout and responsive design state
- Theme and appearance settings
- Notification system
- Quick actions and command palette
- Performance and loading states

**State Modules**:
- **Navigation**: Current tab, breadcrumbs, history
- **Modals**: Modal stack, z-index management
- **Layout**: Sidebar, responsive breakpoints
- **Theme**: Dark/light mode, colors, typography
- **Notifications**: Toast notifications with actions
- **Quick Actions**: Recent actions, contextual actions
- **Command Palette**: Search, commands, categories
- **Performance**: Loading states, progress bars

## Store Utilities

### Normalization Utilities (`utils.ts`)

**Entity Normalization**:
```typescript
// Convert array to normalized state
const normalized = normalizeEntities(properties)
// { byId: { '1': property1, '2': property2 }, allIds: ['1', '2'] }

// Add entity
const updated = addEntityToNormalized(normalized, newProperty)

// Update entity
const updated = updateEntityInNormalized(normalized, id, updates)

// Remove entity
const updated = removeEntityFromNormalized(normalized, id)
```

**Filtering and Sorting**:
```typescript
// Apply filters
const filtered = applyFilters(items, filters, filterFunctions)

// Apply sorting
const sorted = applySorting(items, sortBy, sortOrder, sortFunctions)

// Apply pagination
const paginated = applyPaginationToArray(items, pagination)
```

**Cache Management**:
```typescript
// Create cache with TTL
const cache = createCache(5) // 5 minutes

// Check cache validity
const isValid = isCacheValid(cache)

// Invalidate cache
const invalidated = invalidateCache(cache)
```

## Store Integration

### Store Provider (`StoreProvider.tsx`)

**Purpose**: Provides store initialization and global management

**Features**:
- Store initialization and validation
- Event listener setup
- Health monitoring
- Development debug panel
- Error handling and recovery

**Usage**:
```typescript
<StoreProvider enableDevtools={true} enablePersistence={true}>
  <App />
</StoreProvider>
```

### Store Coordination (`index.ts`)

**Cross-Store Operations**:
```typescript
// Sync selections across stores
StoreSync.syncPropertySelection(propertyId)
StoreSync.syncTenantSelection(tenantId)

// Global loading management
StoreSync.setGlobalLoading(true, 'properties')

// Notifications
StoreSync.showNotification('success', 'Property Created', 'Property has been successfully created')
```

**Event System**:
```typescript
// Emit events
StoreEvents.emit('property:selected', propertyId)

// Listen to events
const unsubscribe = StoreEvents.on('property:selected', (id) => {
  console.log('Property selected:', id)
})
```

## Migration System

### Legacy State Migration (`migration.ts`)

**Purpose**: Migrates from old Context-based state to new Zustand stores

**Features**:
- Automatic detection of legacy state
- Data format conversion
- Type mapping and validation
- Cleanup of old data

**Auto-Migration**:
```typescript
// Automatically runs on app initialization
useAutoMigration()
```

## Usage Patterns

### Basic Store Usage

```typescript
// In a component
function PropertyList() {
  const { 
    getFilteredProperties, 
    setSearchTerm, 
    selectProperty,
    loading,
    error 
  } = usePropertyStore()
  
  const properties = getFilteredProperties()
  
  return (
    <div>
      <SearchInput onChange={setSearchTerm} />
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {properties.map(property => (
        <PropertyCard 
          key={property.id}
          property={property}
          onSelect={() => selectProperty(property.id)}
        />
      ))}
    </div>
  )
}
```

### Advanced Filtering

```typescript
function PropertyFilters() {
  const { filters, updateFilters, clearFilters } = usePropertyStore()
  
  const handleFilterChange = (key: string, value: any) => {
    updateFilters({ [key]: value })
  }
  
  return (
    <FilterPanel>
      <SearchFilter 
        value={filters.searchTerm}
        onChange={(term) => handleFilterChange('searchTerm', term)}
      />
      <StatusFilter
        value={filters.statuses}
        onChange={(statuses) => handleFilterChange('statuses', statuses)}
      />
      <Button onClick={clearFilters}>Clear Filters</Button>
    </FilterPanel>
  )
}
```

### Cross-Store Operations

```typescript
function ContextualActions() {
  const selectedProperty = usePropertyStore(state => state.getSelectedProperty())
  const selectedTenant = useTenantStore(state => state.getSelectedTenant())
  const { addNotification } = useUIStore()
  
  const handleCreateLease = () => {
    if (selectedProperty && selectedTenant) {
      // Business logic here
      addNotification({
        type: 'success',
        title: 'Lease Created',
        message: `Lease created for ${selectedTenant.fullName} at ${selectedProperty.name}`
      })
    }
  }
  
  return (
    <ActionButton 
      onClick={handleCreateLease}
      disabled={!selectedProperty || !selectedTenant}
    >
      Create Lease
    </ActionButton>
  )
}
```

## Performance Optimizations

### Debounced Updates
- Filter updates are debounced (300ms) to prevent excessive re-computations
- Search operations use debounced input handling

### Selective Subscriptions
```typescript
// Subscribe only to specific state slices
const properties = usePropertyStore(state => state.getFilteredProperties())
const loading = usePropertyStore(state => state.loading)
```

### Computed State Caching
- Filtered, sorted, and paginated results are cached
- Only recomputed when dependencies change

### Persistence Optimization
- Only essential state is persisted to localStorage
- Large data sets are excluded from persistence
- Debounced persistence writes

## Development Tools

### Debug Panel
- Real-time store state inspection
- Health monitoring
- Export/import functionality
- Store reset capabilities

### Store Validation
- Automatic integrity checks
- Error detection and reporting
- Performance monitoring

### Event Debugging
- Event emission tracking
- Cross-store communication monitoring
- Action history

## Best Practices

1. **Use Normalized State**: Always normalize entities for efficient updates
2. **Selective Subscriptions**: Subscribe only to needed state slices
3. **Debounce Updates**: Use debouncing for frequent operations
4. **Cache Computed Values**: Cache expensive computations
5. **Handle Errors Gracefully**: Implement proper error boundaries
6. **Validate State**: Use validation utilities for data integrity
7. **Monitor Performance**: Use debug tools to identify bottlenecks
8. **Event-Driven Architecture**: Use events for cross-store communication

## Migration Guide

### From Context to Stores

1. **Replace useContext calls**:
   ```typescript
   // Old
   const { state, dispatch } = useDashboardContext()
   
   // New
   const { properties, selectProperty } = usePropertyStore()
   ```

2. **Update state access patterns**:
   ```typescript
   // Old
   state.selectedProperty
   
   // New
   getSelectedProperty()
   ```

3. **Replace dispatch calls**:
   ```typescript
   // Old
   dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property })
   
   // New
   selectProperty(property.id)
   ```

4. **Update filter handling**:
   ```typescript
   // Old
   dispatch({ type: 'SET_ACTIVE_FILTERS', payload: filters })
   
   // New
   updateFilters(filters)
   ```

The new state management system provides better performance, type safety, developer experience, and maintainability while maintaining all the functionality of the previous system.
