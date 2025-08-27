'use client'

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon, CheckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import {
  usePropertyAccess,
  getRoleDisplayName,
  type AccessibleProperty,
} from '../../hooks/usePropertyAccess'
import { PropertyTypeBadgeCompact } from '../ui/PropertyTypeBadge'
import { getPropertyTypeLabel } from '../../lib/validation/property'

interface PropertySelectorProps {
  className?: string
  showRole?: boolean
}

export default function PropertySelector({
  className = '',
  showRole = true,
}: PropertySelectorProps) {
  const { properties, loading, error, currentProperty, setCurrentProperty } = usePropertyAccess()

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded-md"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>Error loading properties: {error}</div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>No accessible properties found</div>
    )
  }

  return (
    <div className={className}>
      <Listbox value={currentProperty} onChange={setCurrentProperty}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm border border-gray-300">
            <span className="flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="block truncate">
                {currentProperty ? (
                  <span>
                    <span className="font-medium">{currentProperty.property_name}</span>
                    {showRole && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({getRoleDisplayName(currentProperty.user_role)})
                      </span>
                    )}
                  </span>
                ) : (
                  'Select a property'
                )}
              </span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {properties.map((property) => (
                <Listbox.Option
                  key={property.property_id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                    }`
                  }
                  value={property}
                >
                  {({ selected }) => (
                    <>
                      <div className="flex items-center">
                        <div className="flex items-center mr-2">
                          <PropertyTypeBadgeCompact
                            type={(property.property_type as any) || 'HOME'}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`block truncate ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {property.property_name}
                            </span>
                            <span className="ml-2 shrink-0 text-xs text-gray-400 truncate max-w-[120px]">
                              {getPropertyTypeLabel((property.property_type as any) || 'HOME')}
                            </span>
                          </div>
                          {showRole && (
                            <span className="text-xs text-gray-500">
                              {getRoleDisplayName(property.user_role)}
                              {property.user_role === 'OWNER' && (
                                <span className="ml-1 text-green-600">• Full Access</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>

      {/* Property info display */}
      {currentProperty && (
        <div className="mt-2 text-xs text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Role: {getRoleDisplayName(currentProperty.user_role)}</span>
            <div className="flex space-x-2">
              {currentProperty.can_manage_users && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  User Management
                </span>
              )}
              {currentProperty.can_edit_property && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Property Edit
                </span>
              )}
              {currentProperty.can_manage_tenants && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Tenant Management
                </span>
              )}
              {currentProperty.can_manage_maintenance && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                  Maintenance
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for navigation
export function PropertySelectorCompact({ className = '' }: { className?: string }) {
  const { properties, loading, currentProperty, setCurrentProperty } = usePropertyAccess()

  if (loading || properties.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <Listbox value={currentProperty} onChange={setCurrentProperty}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-8 text-left text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span className="flex items-center">
              <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span className="block truncate font-medium">
                {currentProperty?.property_name || 'Select Property'}
              </span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {properties.map((property) => (
                <Listbox.Option
                  key={property.property_id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-8 pr-4 ${
                      active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                    }`
                  }
                  value={property}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}
                      >
                        {property.property_name}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-blue-600">
                          <CheckIcon className="h-4 w-4" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}
