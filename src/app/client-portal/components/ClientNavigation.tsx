'use client'

interface ClientNavigationProps {
  activeTab: 'my-properties' | 'purchase-pipeline' | 'saved-properties' | 'reserved'
  onTabChange: (
    tab: 'my-properties' | 'purchase-pipeline' | 'saved-properties' | 'reserved'
  ) => void
}

export default function ClientNavigation({ activeTab, onTabChange }: ClientNavigationProps) {
  const tabs = [
    {
      id: 'my-properties',
      label: 'My Properties',
      icon: '🏠',
      description: 'All your properties repository',
      gradient: 'from-blue-50 to-indigo-50',
      hoverGradient: 'hover:from-blue-100 hover:to-indigo-100',
      activeGradient: 'from-blue-100 to-indigo-100',
      borderColor: 'border-blue-400',
      ringColor: 'ring-blue-300',
      iconBg: 'bg-blue-100',
      iconBgActive: 'bg-blue-200',
      textColor: 'text-blue-900',
      textColorInactive: 'text-blue-700',
    },
    {
      id: 'purchase-pipeline',
      label: 'Purchase Pipeline',
      icon: '⚡',
      description: 'Properties in purchase process',
      gradient: 'from-yellow-50 to-amber-50',
      hoverGradient: 'hover:from-yellow-100 hover:to-amber-100',
      activeGradient: 'from-yellow-100 to-amber-100',
      borderColor: 'border-yellow-400',
      ringColor: 'ring-yellow-300',
      iconBg: 'bg-yellow-100',
      iconBgActive: 'bg-yellow-200',
      textColor: 'text-yellow-900',
      textColorInactive: 'text-yellow-700',
    },
    {
      id: 'reserved',
      label: 'Reserved',
      icon: '🔒',
      description: "Properties you've reserved",
      gradient: 'from-orange-50 to-amber-50',
      hoverGradient: 'hover:from-orange-100 hover:to-amber-100',
      activeGradient: 'from-orange-100 to-amber-100',
      borderColor: 'border-orange-400',
      ringColor: 'ring-orange-300',
      iconBg: 'bg-orange-100',
      iconBgActive: 'bg-orange-200',
      textColor: 'text-orange-900',
      textColorInactive: 'text-orange-700',
    },
    {
      id: 'saved-properties',
      label: 'Saved Properties',
      icon: '💾',
      description: "Properties you're interested in",
      gradient: 'from-purple-50 to-indigo-50',
      hoverGradient: 'hover:from-purple-100 hover:to-indigo-100',
      activeGradient: 'from-purple-100 to-indigo-100',
      borderColor: 'border-purple-400',
      ringColor: 'ring-purple-300',
      iconBg: 'bg-purple-100',
      iconBgActive: 'bg-purple-200',
      textColor: 'text-purple-900',
      textColorInactive: 'text-purple-700',
    },
  ] as const

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
        Property Management Portal
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`bg-gradient-to-br rounded-lg py-4 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
              activeTab === tab.id
                ? `${tab.activeGradient} ${tab.borderColor} shadow-md ring-2 ${tab.ringColor} ring-opacity-50 scale-102`
                : `${tab.gradient} border-gray-200 hover:shadow-md ${tab.hoverGradient}`
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${
                  activeTab === tab.id ? tab.iconBgActive : tab.iconBg
                }`}
              >
                {tab.icon}
              </div>
              <div>
                <h3
                  className={`font-bold text-sm transition-colors ${
                    activeTab === tab.id ? tab.textColor : tab.textColorInactive
                  }`}
                >
                  {tab.label}
                </h3>
                <p
                  className={`text-xs mt-1 transition-colors opacity-75 ${
                    activeTab === tab.id ? tab.textColorInactive : 'text-gray-500'
                  }`}
                >
                  {tab.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
