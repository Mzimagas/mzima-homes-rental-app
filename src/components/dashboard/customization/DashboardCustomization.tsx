/**
 * Dashboard Customization System
 * Comprehensive widget customization, layout preferences, and user-specific dashboard configurations
 * Features localStorage persistence, drag-and-drop layout, and theme customization
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  Cog6ToothIcon,
  PaintBrushIcon,
  ViewColumnsIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useDashboardStore, DashboardWidget, WidgetSize } from '../../../presentation/stores/dashboardStore'
import { useDashboardContext } from '../../../contexts/DashboardContextProvider'
import { useAuth } from '../../../lib/auth-context'

// Customization interfaces
export interface DashboardTheme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
  }
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  spacing: 'compact' | 'normal' | 'relaxed'
}

export interface LayoutPreferences {
  gridColumns: number
  widgetSpacing: number
  showWidgetTitles: boolean
  showWidgetBorders: boolean
  compactMode: boolean
  sidebarCollapsed: boolean
}

export interface WidgetPreferences {
  [widgetId: string]: {
    visible: boolean
    size: WidgetSize
    position: { x: number; y: number }
    customTitle?: string
    refreshInterval?: number
    settings?: Record<string, any>
  }
}

export interface DashboardCustomization {
  theme: DashboardTheme
  layout: LayoutPreferences
  widgets: WidgetPreferences
  lastModified: Date
  version: string
}

// Component props
export interface DashboardCustomizationProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (customization: DashboardCustomization) => void
  className?: string
}

// Predefined themes
const DEFAULT_THEMES: DashboardTheme[] = [
  {
    id: 'default',
    name: 'Default Blue',
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#10B981',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#111827'
    },
    borderRadius: 'md',
    spacing: 'normal'
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    colors: {
      primary: '#60A5FA',
      secondary: '#9CA3AF',
      accent: '#34D399',
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB'
    },
    borderRadius: 'md',
    spacing: 'normal'
  },
  {
    id: 'green',
    name: 'Nature Green',
    colors: {
      primary: '#10B981',
      secondary: '#6B7280',
      accent: '#F59E0B',
      background: '#F0FDF4',
      surface: '#FFFFFF',
      text: '#111827'
    },
    borderRadius: 'lg',
    spacing: 'relaxed'
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    colors: {
      primary: '#8B5CF6',
      secondary: '#6B7280',
      accent: '#F59E0B',
      background: '#FAF5FF',
      surface: '#FFFFFF',
      text: '#111827'
    },
    borderRadius: 'lg',
    spacing: 'normal'
  }
]

// Theme selector component
interface ThemeSelectorProps {
  themes: DashboardTheme[]
  selectedTheme: DashboardTheme
  onThemeSelect: (theme: DashboardTheme) => void
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themes, selectedTheme, onThemeSelect }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Theme Selection</h3>
      <div className="grid grid-cols-2 gap-3">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => onThemeSelect(theme)}
            className={`
              relative p-3 rounded-lg border-2 transition-all
              ${selectedTheme.id === theme.id 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            {/* Theme preview */}
            <div className="flex items-center space-x-2 mb-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: theme.colors.accent }}
              />
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: theme.colors.secondary }}
              />
            </div>
            
            <div className="text-left">
              <div className="font-medium text-gray-900">{theme.name}</div>
              <div className="text-sm text-gray-600 capitalize">
                {theme.spacing} • {theme.borderRadius} corners
              </div>
            </div>
            
            {selectedTheme.id === theme.id && (
              <div className="absolute top-2 right-2">
                <CheckIcon className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Layout preferences component
interface LayoutPreferencesProps {
  preferences: LayoutPreferences
  onPreferencesChange: (preferences: LayoutPreferences) => void
}

const LayoutPreferencesComponent: React.FC<LayoutPreferencesProps> = ({
  preferences,
  onPreferencesChange
}) => {
  const handleChange = (key: keyof LayoutPreferences, value: any) => {
    onPreferencesChange({
      ...preferences,
      [key]: value
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Layout Preferences</h3>
      
      {/* Grid Columns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Grid Columns: {preferences.gridColumns}
        </label>
        <input
          type="range"
          min="2"
          max="6"
          value={preferences.gridColumns}
          onChange={(e) => handleChange('gridColumns', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
        </div>
      </div>
      
      {/* Widget Spacing */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Widget Spacing: {preferences.widgetSpacing}px
        </label>
        <input
          type="range"
          min="8"
          max="32"
          step="4"
          value={preferences.widgetSpacing}
          onChange={(e) => handleChange('widgetSpacing', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>8px</span>
          <span>16px</span>
          <span>24px</span>
          <span>32px</span>
        </div>
      </div>
      
      {/* Toggle Options */}
      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Show Widget Titles</span>
          <input
            type="checkbox"
            checked={preferences.showWidgetTitles}
            onChange={(e) => handleChange('showWidgetTitles', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Show Widget Borders</span>
          <input
            type="checkbox"
            checked={preferences.showWidgetBorders}
            onChange={(e) => handleChange('showWidgetBorders', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Compact Mode</span>
          <input
            type="checkbox"
            checked={preferences.compactMode}
            onChange={(e) => handleChange('compactMode', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Collapse Sidebar</span>
          <input
            type="checkbox"
            checked={preferences.sidebarCollapsed}
            onChange={(e) => handleChange('sidebarCollapsed', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>
      </div>
    </div>
  )
}

// Widget customization component
interface WidgetCustomizationProps {
  widgets: DashboardWidget[]
  preferences: WidgetPreferences
  onPreferencesChange: (preferences: WidgetPreferences) => void
}

const WidgetCustomization: React.FC<WidgetCustomizationProps> = ({
  widgets,
  preferences,
  onPreferencesChange
}) => {
  const handleWidgetToggle = (widgetId: string) => {
    const current = preferences[widgetId] || { visible: true, size: 'medium', position: { x: 0, y: 0 } }
    onPreferencesChange({
      ...preferences,
      [widgetId]: {
        ...current,
        visible: !current.visible
      }
    })
  }

  const handleWidgetSizeChange = (widgetId: string, size: WidgetSize) => {
    const current = preferences[widgetId] || { visible: true, size: 'medium', position: { x: 0, y: 0 } }
    onPreferencesChange({
      ...preferences,
      [widgetId]: {
        ...current,
        size
      }
    })
  }

  const handleCustomTitleChange = (widgetId: string, customTitle: string) => {
    const current = preferences[widgetId] || { visible: true, size: 'medium', position: { x: 0, y: 0 } }
    onPreferencesChange({
      ...preferences,
      [widgetId]: {
        ...current,
        customTitle
      }
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Widget Configuration</h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {widgets.map(widget => {
          const pref = preferences[widget.id] || { visible: true, size: widget.size, position: { x: 0, y: 0 } }
          
          return (
            <div key={widget.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleWidgetToggle(widget.id)}
                    className={`p-1 rounded ${pref.visible ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    {pref.visible ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                  </button>
                  <div>
                    <h4 className="font-medium text-gray-900">{widget.title}</h4>
                    <p className="text-sm text-gray-600">Widget ID: {widget.id}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {(['small', 'medium', 'large'] as WidgetSize[]).map(size => (
                    <button
                      key={size}
                      onClick={() => handleWidgetSizeChange(widget.id, size)}
                      className={`
                        px-2 py-1 text-xs rounded transition-colors
                        ${pref.size === size 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Custom Title (optional)
                </label>
                <input
                  type="text"
                  value={pref.customTitle || ''}
                  onChange={(e) => handleCustomTitleChange(widget.id, e.target.value)}
                  placeholder={widget.title}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Main Dashboard Customization Component
 */
export const DashboardCustomization: React.FC<DashboardCustomizationProps> = ({
  isOpen,
  onClose,
  onSave,
  className = ''
}) => {
  const { user } = useAuth()
  const { state, actions } = useDashboardContext()
  const store = useDashboardStore()
  
  const [activeTab, setActiveTab] = useState<'theme' | 'layout' | 'widgets'>('theme')
  const [customization, setCustomization] = useState<DashboardCustomization>({
    theme: DEFAULT_THEMES[0],
    layout: {
      gridColumns: 4,
      widgetSpacing: 16,
      showWidgetTitles: true,
      showWidgetBorders: true,
      compactMode: false,
      sidebarCollapsed: false
    },
    widgets: {},
    lastModified: new Date(),
    version: '1.0.0'
  })
  
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load saved customization
  useEffect(() => {
    const loadCustomization = () => {
      try {
        const saved = localStorage.getItem(`dashboard-customization-${user?.id || 'default'}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          setCustomization({
            ...parsed,
            lastModified: new Date(parsed.lastModified)
          })
        }
      } catch (error) {
        console.error('Failed to load dashboard customization:', error)
      }
    }

    if (isOpen) {
      loadCustomization()
    }
  }, [isOpen, user?.id])

  // Handle theme change
  const handleThemeChange = useCallback((theme: DashboardTheme) => {
    setCustomization(prev => ({
      ...prev,
      theme,
      lastModified: new Date()
    }))
    setHasChanges(true)
  }, [])

  // Handle layout preferences change
  const handleLayoutChange = useCallback((layout: LayoutPreferences) => {
    setCustomization(prev => ({
      ...prev,
      layout,
      lastModified: new Date()
    }))
    setHasChanges(true)
  }, [])

  // Handle widget preferences change
  const handleWidgetChange = useCallback((widgets: WidgetPreferences) => {
    setCustomization(prev => ({
      ...prev,
      widgets,
      lastModified: new Date()
    }))
    setHasChanges(true)
  }, [])

  // Save customization
  const handleSave = useCallback(async () => {
    try {
      setSaving(true)
      
      // Save to localStorage
      localStorage.setItem(
        `dashboard-customization-${user?.id || 'default'}`,
        JSON.stringify(customization)
      )
      
      // Apply to dashboard context
      actions.setTheme(customization.theme)
      actions.setLayoutPreferences(customization.layout)
      actions.setWidgetPreferences(customization.widgets)
      
      // Call external save handler
      onSave?.(customization)
      
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Failed to save customization:', error)
    } finally {
      setSaving(false)
    }
  }, [customization, user?.id, actions, onSave, onClose])

  // Reset to defaults
  const handleReset = useCallback(() => {
    const defaultCustomization: DashboardCustomization = {
      theme: DEFAULT_THEMES[0],
      layout: {
        gridColumns: 4,
        widgetSpacing: 16,
        showWidgetTitles: true,
        showWidgetBorders: true,
        compactMode: false,
        sidebarCollapsed: false
      },
      widgets: {},
      lastModified: new Date(),
      version: '1.0.0'
    }
    
    setCustomization(defaultCustomization)
    setHasChanges(true)
  }, [])

  // Get available widgets
  const availableWidgets = useMemo(() => {
    return store.widgets || []
  }, [store.widgets])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Cog6ToothIcon className="w-6 h-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Dashboard Customization</h2>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <span className="text-sm text-amber-600 bg-amber-100 px-2 py-1 rounded">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { id: 'theme', label: 'Theme', icon: PaintBrushIcon },
              { id: 'layout', label: 'Layout', icon: ViewColumnsIcon },
              { id: 'widgets', label: 'Widgets', icon: ArrowsPointingOutIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors
                  ${activeTab === tab.id 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'theme' && (
              <ThemeSelector
                themes={DEFAULT_THEMES}
                selectedTheme={customization.theme}
                onThemeSelect={handleThemeChange}
              />
            )}

            {activeTab === 'layout' && (
              <LayoutPreferencesComponent
                preferences={customization.layout}
                onPreferencesChange={handleLayoutChange}
              />
            )}

            {activeTab === 'widgets' && (
              <WidgetCustomization
                widgets={availableWidgets}
                preferences={customization.widgets}
                onPreferencesChange={handleWidgetChange}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Reset to Defaults</span>
              </button>
              
              <div className="text-sm text-gray-500">
                Last modified: {customization.lastModified.toLocaleString()}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardCustomization
