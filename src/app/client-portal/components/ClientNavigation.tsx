'use client'

interface ClientNavigationProps {
  activeTab: 'profile' | 'saved-properties' | 'my-properties' | 'completed'
  onTabChange: (tab: 'profile' | 'saved-properties' | 'my-properties' | 'completed') => void
}

export default function ClientNavigation({ activeTab, onTabChange }: ClientNavigationProps) {
  const tabs = [
    { id: 'saved-properties', label: 'Saved Properties', icon: '💾' },
    { id: 'my-properties', label: 'My Properties', icon: '🏠' },
    { id: 'completed', label: 'Completed Projects', icon: '✅' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ] as const

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <nav className="flex space-x-8 px-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
