import React, { useState } from 'react'
import { ConflictData, ConflictResolutionStrategy } from '../../services/conflict-resolution.service'
import { Button } from '../ui'
import Modal from '../ui/Modal'

interface ConflictResolutionModalProps {
  conflicts: ConflictData[]
  isOpen: boolean
  onClose: () => void
  onResolve: (conflictId: string, strategy: ConflictResolutionStrategy) => Promise<boolean>
  onBulkResolve: (conflictIds: string[], strategy: ConflictResolutionStrategy) => Promise<{ resolved: number; failed: number }>
}

export default function ConflictResolutionModal({
  conflicts,
  isOpen,
  onClose,
  onResolve,
  onBulkResolve
}: ConflictResolutionModalProps) {
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([])
  const [resolving, setResolving] = useState<string[]>([])
  const [customValues, setCustomValues] = useState<Record<string, any>>({})

  const handleSelectAll = () => {
    if (selectedConflicts.length === conflicts.length) {
      setSelectedConflicts([])
    } else {
      setSelectedConflicts(conflicts.map(c => c.id))
    }
  }

  const handleSelectConflict = (conflictId: string) => {
    setSelectedConflicts(prev => 
      prev.includes(conflictId)
        ? prev.filter(id => id !== conflictId)
        : [...prev, conflictId]
    )
  }

  const handleResolveConflict = async (conflict: ConflictData, strategy: ConflictResolutionStrategy) => {
    setResolving(prev => [...prev, conflict.id])
    
    try {
      const success = await onResolve(conflict.id, strategy)
      if (success) {
        setSelectedConflicts(prev => prev.filter(id => id !== conflict.id))
      }
    } finally {
      setResolving(prev => prev.filter(id => id !== conflict.id))
    }
  }

  const handleBulkResolve = async (strategy: ConflictResolutionStrategy) => {
    if (selectedConflicts.length === 0) return

    setResolving(prev => [...prev, ...selectedConflicts])
    
    try {
      await onBulkResolve(selectedConflicts, strategy)
      setSelectedConflicts([])
    } finally {
      setResolving([])
    }
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const getFieldDisplayName = (fieldName: string): string => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resolve Data Conflicts (${conflicts.length})`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Bulk Actions */}
        {conflicts.length > 1 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedConflicts.length === conflicts.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  Select All ({selectedConflicts.length} of {conflicts.length} selected)
                </span>
              </div>
            </div>
            
            {selectedConflicts.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkResolve({ strategy: 'KEEP_LOCAL' })}
                  disabled={resolving.length > 0}
                >
                  Keep All Local Changes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkResolve({ strategy: 'KEEP_SERVER' })}
                  disabled={resolving.length > 0}
                >
                  Keep All Server Changes
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Individual Conflicts */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedConflicts.includes(conflict.id)}
                    onChange={() => handleSelectConflict(conflict.id)}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {getFieldDisplayName(conflict.field_name)}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {conflict.table_name} • {conflict.record_id}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {conflict.conflict_type.replace('_', ' ')}
                </span>
              </div>

              {/* Value Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Your Changes</h5>
                  <pre className="text-xs text-blue-800 whitespace-pre-wrap">
                    {formatValue(conflict.local_value)}
                  </pre>
                  <p className="text-xs text-blue-600 mt-1">
                    {new Date(conflict.local_timestamp).toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <h5 className="text-sm font-medium text-green-900 mb-2">Server Changes</h5>
                  <pre className="text-xs text-green-800 whitespace-pre-wrap">
                    {formatValue(conflict.server_value)}
                  </pre>
                  <p className="text-xs text-green-600 mt-1">
                    {new Date(conflict.server_timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Resolution Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleResolveConflict(conflict, { strategy: 'KEEP_LOCAL' })}
                  disabled={resolving.includes(conflict.id)}
                >
                  Keep My Changes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleResolveConflict(conflict, { strategy: 'KEEP_SERVER' })}
                  disabled={resolving.includes(conflict.id)}
                >
                  Keep Server Changes
                </Button>
                
                {/* Auto-merge option if values can be merged */}
                {typeof conflict.local_value === 'string' && typeof conflict.server_value === 'string' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleResolveConflict(conflict, { 
                      strategy: 'MERGE',
                      mergedValue: conflict.local_value + ' ' + conflict.server_value
                    })}
                    disabled={resolving.includes(conflict.id)}
                  >
                    Auto-Merge
                  </Button>
                )}
                
                {/* Custom value input */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Custom value..."
                    value={customValues[conflict.id] || ''}
                    onChange={(e) => setCustomValues(prev => ({
                      ...prev,
                      [conflict.id]: e.target.value
                    }))}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolveConflict(conflict, {
                      strategy: 'MANUAL',
                      mergedValue: customValues[conflict.id]
                    })}
                    disabled={resolving.includes(conflict.id) || !customValues[conflict.id]}
                  >
                    Use Custom
                  </Button>
                </div>
              </div>

              {resolving.includes(conflict.id) && (
                <div className="mt-2 text-sm text-blue-600">
                  Resolving conflict...
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
