import { useState, useEffect, useCallback } from 'react'
import {
  getPropertiesForPermissionManagement,
  searchProperties,
  getPurchasePipelineProperties,
  getSubdivisionProperties,
  getHandoverProperties,
  Property,
} from '../../../../services/propertyService'
import { PropertySelectionState, LifecycleStage } from '../types'

export const usePropertySelection = () => {
  const [state, setState] = useState<PropertySelectionState>({
    selectedProperty: 'global',
    showDropdown: false,
    searchTerm: '',
    loadingProperties: false,
    properties: [],
  })

  // Load properties based on selected lifecycle stage
  const loadProperties = useCallback(async (stage: LifecycleStage) => {
    setState((prev) => ({ ...prev, loadingProperties: true }))

    try {
      let propertyData: Property[] = []

      switch (stage) {
        case 'purchase_pipeline':
          propertyData = await getPurchasePipelineProperties()
          break
        case 'subdivision':
          propertyData = await getSubdivisionProperties()
          break
        case 'handover':
          propertyData = await getHandoverProperties()
          break
        case 'global':
        default:
          propertyData = await getPropertiesForPermissionManagement()
          break
      }

      setState((prev) => ({
        ...prev,
        properties: propertyData,
        loadingProperties: false,
      }))
    } catch (error) {
      console.error('Error loading properties:', error)
      setState((prev) => ({
        ...prev,
        properties: [],
        loadingProperties: false,
      }))
    }
  }, [])

  // Search properties with debouncing
  const searchPropertiesDebounced = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        // If no search term, reload properties for current stage
        const currentStage = isLifecycleStage(state.selectedProperty)
          ? (state.selectedProperty as LifecycleStage)
          : 'global'
        await loadProperties(currentStage)
        return
      }

      setState((prev) => ({ ...prev, loadingProperties: true }))

      try {
        // Search within the current lifecycle filter context
        let searchResults: Property[] = []

        if (state.selectedProperty === 'purchase_pipeline') {
          const pipelineProperties = await getPurchasePipelineProperties()
          searchResults = pipelineProperties.filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.address.toLowerCase().includes(searchTerm.toLowerCase())
          )
        } else if (state.selectedProperty === 'subdivision') {
          const subdivisionProperties = await getSubdivisionProperties()
          searchResults = subdivisionProperties.filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.address.toLowerCase().includes(searchTerm.toLowerCase())
          )
        } else if (state.selectedProperty === 'handover') {
          const handoverProperties = await getHandoverProperties()
          searchResults = handoverProperties.filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.address.toLowerCase().includes(searchTerm.toLowerCase())
          )
        } else {
          searchResults = await searchProperties(searchTerm)
        }

        setState((prev) => ({
          ...prev,
          properties: searchResults,
          loadingProperties: false,
        }))
      } catch (error) {
        console.error('Error searching properties:', error)
        setState((prev) => ({
          ...prev,
          properties: [],
          loadingProperties: false,
        }))
      }
    },
    [state.selectedProperty, loadProperties]
  )

  // Handle property selection
  const handlePropertySelect = useCallback(
    (propertyId: string) => {
      setState((prev) => ({
        ...prev,
        selectedProperty: propertyId,
        showDropdown: false,
        searchTerm: '',
      }))

      // Clear property search when switching to lifecycle filters
      if (isLifecycleStage(propertyId)) {
        loadProperties(propertyId as LifecycleStage)
      }
    },
    [loadProperties]
  )

  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setState((prev) => ({ ...prev, showDropdown: !prev.showDropdown }))
  }, [])

  // Set search term
  const setSearchTerm = useCallback((term: string) => {
    setState((prev) => ({ ...prev, searchTerm: term }))
  }, [])

  // Get display text for selected property
  const getSelectedPropertyDisplay = useCallback(() => {
    if (state.selectedProperty === 'global') {
      return '🌐 Global Permissions (All Properties)'
    }
    if (state.selectedProperty === 'purchase_pipeline') {
      return '🏗️ Purchase Pipeline Properties'
    }
    if (state.selectedProperty === 'subdivision') {
      return '📐 Subdivision Properties'
    }
    if (state.selectedProperty === 'handover') {
      return '🤝 Handover Properties'
    }

    // Find individual property
    const property = state.properties.find((p) => p.id === state.selectedProperty)
    return property ? `🏠 ${property.name}` : 'Select Property'
  }, [state.selectedProperty, state.properties])

  // Load properties when component mounts
  useEffect(() => {
    loadProperties('global')
  }, [loadProperties])

  // Helper function to check if a value is a lifecycle stage
  const isLifecycleStage = (value: string): boolean => {
    return ['global', 'purchase_pipeline', 'subdivision', 'handover'].includes(value)
  }

  return {
    ...state,
    loadProperties,
    searchPropertiesDebounced,
    handlePropertySelect,
    toggleDropdown,
    setSearchTerm,
    getSelectedPropertyDisplay,
    isLifecycleStage,
  }
}
