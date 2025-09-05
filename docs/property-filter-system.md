# Property Filter System

## Overview

The Property Filter System provides a comprehensive filtering solution for the Properties tab in the dashboard, allowing users to filter properties by pipeline type, status, property types, and search terms. The system includes advanced features like saved filters, filter presets, and responsive design.

## Features

### 🔍 Core Filtering
- **Pipeline Filtering**: Filter by Direct Addition, Purchase Pipeline, Subdivision, or Handover
- **Status Filtering**: Filter by Active, Pending, Completed, or Inactive properties
- **Property Type Filtering**: Multi-select filtering by property types (Apartment, House, Commercial, Land, Townhouse)
- **Search Filtering**: Text-based search across property names, addresses, types, and notes

### 💾 Saved Filters
- **Quick Presets**: Pre-configured filters for common use cases
- **Custom Filters**: Save custom filter combinations with user-defined names
- **Filter History**: Track when filters were last used
- **Persistent Storage**: Filters are saved to localStorage and persist across sessions

### 📱 Responsive Design
- **Mobile-Optimized**: Collapsible filter panels for mobile devices
- **Touch-Friendly**: Larger touch targets and improved mobile interactions
- **Adaptive Layout**: Filter panels adjust to screen size

### ⚡ Performance
- **Debounced Search**: Search input is debounced to prevent excessive filtering
- **Memoized Filtering**: Filter results are memoized for optimal performance
- **Efficient State Management**: Uses React hooks for optimal re-rendering

## Components

### PropertyFilterPanel
Main filter interface component with collapsible sections for different filter types.

```tsx
<PropertyFilterPanel
  pipelineFilter={filters.pipeline}
  statusFilter={filters.status}
  propertyTypes={filters.propertyTypes}
  filterCounts={filterCounts}
  onPipelineChange={setPipelineFilter}
  onStatusChange={setStatusFilter}
  onPropertyTypesChange={setPropertyTypesFilter}
  onClearFilters={clearFilters}
  onApplyPreset={applyPreset}
  isCollapsed={isCollapsed}
  onToggleCollapse={toggleCollapse}
/>
```

### PropertySearch
Enhanced search component with filter integration and visual indicators.

```tsx
<PropertySearch
  onSearchChange={setSearchTerm}
  placeholder="Search properties..."
  resultsCount={filteredCount}
  totalCount={totalCount}
  showFilterToggle={true}
  onFilterToggle={toggleCollapse}
  hasActiveFilters={hasActiveFilters}
  filterCount={activeFilterCount}
/>
```

### SavedFiltersPanel
Component for managing saved filter presets and custom filters.

```tsx
<SavedFiltersPanel
  savedFilters={savedFilters}
  currentFilters={filters}
  onLoadFilter={handleLoadSavedFilter}
  onSaveFilter={saveFilter}
  onDeleteFilter={deleteFilter}
/>
```

## Hooks

### usePropertyFilters
Main hook for property filtering logic and state management.

```tsx
const {
  filters,
  filteredProperties,
  filterCounts,
  totalCount,
  filteredCount,
  setPipelineFilter,
  setStatusFilter,
  setPropertyTypesFilter,
  setSearchTerm,
  clearFilters,
  hasActiveFilters,
  applyPreset
} = usePropertyFilters(properties, {
  initialFilters: { searchTerm },
  persistKey: 'properties-tab-filters'
})
```

### useFilterPanel
Hook for managing filter panel collapse/expand state.

```tsx
const { isCollapsed, toggleCollapse } = useFilterPanel({
  defaultCollapsed: true,
  persistKey: 'properties-filter-panel'
})
```

### useSavedFilters
Hook for managing saved filter presets and custom filters.

```tsx
const {
  savedFilters,
  saveFilter,
  loadFilter,
  deleteFilter
} = useSavedFilters({
  persistKey: 'properties-saved-filters'
})
```

## Filter Types

### Pipeline Filters
- `all`: Show all properties
- `direct_addition`: Properties added directly to the system
- `purchase_pipeline`: Properties from the purchase pipeline
- `subdivision`: Properties in subdivision process
- `handover`: Properties in handover process

### Status Filters
- `all`: Show all statuses
- `active`: Properties currently active in workflows
- `pending`: Properties with pending status
- `completed`: Properties that have completed their workflows
- `inactive`: Inactive properties

### Property Type Filters
Multi-select array of property types:
- `APARTMENT`
- `HOUSE`
- `COMMERCIAL`
- `LAND`
- `TOWNHOUSE`

## Default Filter Presets

The system includes several pre-configured filter presets:

1. **All Properties**: No filters applied
2. **Active Properties**: Shows only active properties
3. **Purchase Pipeline**: Shows properties in purchase pipeline
4. **Subdivision Properties**: Shows properties in subdivision
5. **Handover Properties**: Shows properties in handover
6. **Completed Properties**: Shows completed properties

## Usage Examples

### Basic Filtering
```tsx
// Filter by pipeline type
setPipelineFilter('purchase_pipeline')

// Filter by status
setStatusFilter('active')

// Filter by property types
setPropertyTypesFilter(['APARTMENT', 'HOUSE'])

// Search filter
setSearchTerm('downtown')
```

### Applying Presets
```tsx
// Apply a preset filter
applyPreset('purchase') // Shows purchase pipeline properties
applyPreset('active')   // Shows active properties
```

### Saving Custom Filters
```tsx
// Save current filter state
saveFilter('My Custom Filter', currentFilters)

// Load a saved filter
const savedFilterData = loadFilter(filterId)
if (savedFilterData) {
  // Apply the saved filter settings
  setPipelineFilter(savedFilterData.pipeline)
  setStatusFilter(savedFilterData.status)
  // ... etc
}
```

## Performance Considerations

1. **Debouncing**: Search input is debounced by 300ms to prevent excessive filtering
2. **Memoization**: Filter results are memoized using React.useMemo
3. **Efficient Updates**: State updates are batched where possible
4. **Lazy Loading**: Filter panels can be collapsed to reduce DOM complexity

## Accessibility

- All interactive elements have proper ARIA labels
- Keyboard navigation is supported
- Screen reader friendly with semantic HTML
- High contrast support for filter indicators

## Browser Support

- Modern browsers with ES6+ support
- localStorage support required for filter persistence
- Touch events supported for mobile devices

## Testing

The filter system includes comprehensive unit tests covering:
- Filter logic functions
- State management hooks
- Component interactions
- Edge cases and error handling

Run tests with:
```bash
npm test -- --testPathPattern=stage-filtering.utils.test.ts
```
