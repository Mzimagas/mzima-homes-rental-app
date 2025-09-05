'use client'

import { useState } from 'react'
import { 
  BookmarkIcon, 
  PlusIcon, 
  TrashIcon, 
  ClockIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'
import { SavedFilter } from '../../../hooks/useSavedFilters'
import { PropertyFilters } from '../utils/stage-filtering.utils'

export interface SavedFiltersPanelProps {
  savedFilters: SavedFilter[]
  currentFilters: PropertyFilters
  onLoadFilter: (id: string) => void
  onSaveFilter: (name: string, filters: PropertyFilters) => void
  onDeleteFilter: (id: string) => void
  className?: string
}

export default function SavedFiltersPanel({
  savedFilters,
  currentFilters,
  onLoadFilter,
  onSaveFilter,
  onDeleteFilter,
  className = ''
}: SavedFiltersPanelProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [saving, setSaving] = useState(false)

  const defaultFilters = savedFilters.filter(f => f.isDefault)
  const customFilters = savedFilters.filter(f => !f.isDefault)

  const handleSaveFilter = async () => {
    if (!filterName.trim()) return

    setSaving(true)
    try {
      onSaveFilter(filterName.trim(), currentFilters)
      setFilterName('')
      setShowSaveDialog(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save filter:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatLastUsed = (date?: Date) => {
    if (!date) return 'Never used'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const hasActiveFilters = (filters: PropertyFilters) => {
    return (
      filters.pipeline !== 'all' ||
      filters.status !== 'all' ||
      filters.propertyTypes.length > 0 ||
      filters.searchTerm.trim() !== ''
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <BookmarkIcon className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Saved Filters</h3>
        </div>
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={!hasActiveFilters(currentFilters)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Save Current
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Default Filters */}
        {defaultFilters.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <StarIcon className="h-4 w-4 mr-1 text-yellow-500" />
              Quick Filters
            </h4>
            <div className="space-y-1">
              {defaultFilters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => onLoadFilter(filter.id)}
                  className="w-full flex items-center justify-between p-2 text-sm text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <BookmarkSolidIcon className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-gray-900">{filter.name}</span>
                  </div>
                  {filter.lastUsed && (
                    <span className="text-xs text-gray-500">
                      {formatLastUsed(filter.lastUsed)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Filters */}
        {customFilters.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <BookmarkIcon className="h-4 w-4 mr-1" />
              Custom Filters ({customFilters.length})
            </h4>
            <div className="space-y-1">
              {customFilters
                .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
                .map(filter => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors group"
                  >
                    <button
                      onClick={() => onLoadFilter(filter.id)}
                      className="flex-1 flex items-center space-x-2 text-left"
                    >
                      <BookmarkIcon className="h-4 w-4 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{filter.name}</div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatLastUsed(filter.lastUsed)}</span>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => onDeleteFilter(filter.id)}
                      className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete filter"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {customFilters.length === 0 && (
          <div className="text-center py-6">
            <BookmarkIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No custom filters saved yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Apply some filters and click &quot;Save Current&quot; to create your first saved filter
            </p>
          </div>
        )}
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Save Filter</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter Name
                </label>
                <input
                  id="filter-name"
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Enter a name for this filter..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Filter Settings:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Pipeline: <span className="font-medium">{currentFilters.pipeline}</span></li>
                  <li>Status: <span className="font-medium">{currentFilters.status}</span></li>
                  {currentFilters.propertyTypes.length > 0 && (
                    <li>Types: <span className="font-medium">{currentFilters.propertyTypes.join(', ')}</span></li>
                  )}
                  {currentFilters.searchTerm && (
                    <li>Search: <span className="font-medium">&quot;{currentFilters.searchTerm}&quot;</span></li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setFilterName('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!filterName.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Filter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
