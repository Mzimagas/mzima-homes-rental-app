import React from 'react'
import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts'

interface Props {
  shortcuts: KeyboardShortcut[]
  isOpen: boolean
  onClose: () => void
}

const KeyboardShortcutsHelp: React.FC<Props> = ({ shortcuts, isOpen, onClose }) => {
  if (!isOpen) return null

  const groupedShortcuts = shortcuts.reduce(
    (groups, shortcut) => {
      const category = shortcut.category || 'Other'
      if (!groups[category]) groups[category] = []
      groups[category].push(shortcut)
      return groups
    },
    {} as Record<string, KeyboardShortcut[]>
  )

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys: string[] = []
    if (shortcut.metaKey) keys.push('⌘')
    if (shortcut.ctrlKey) keys.push('Ctrl')
    if (shortcut.shiftKey) keys.push('⇧')
    if (shortcut.altKey) keys.push('⌥')
    keys.push(shortcut.key.toUpperCase())
    return keys.join(' + ')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{shortcut.description}</span>
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Press{' '}
              <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
                /
              </kbd>{' '}
              to show this help again
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsHelp
