'use client'

type UserTab = 'addition' | 'permissions'

interface UserWorkflowNavigationProps {
  activeTab: UserTab
  onTabChange: (tab: UserTab) => void
}

export default function UserWorkflowNavigation({ activeTab, onTabChange }: UserWorkflowNavigationProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">User Management Workflows</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* User Addition */}
        <button
          onClick={() => onTabChange('addition')}
          className={`bg-gradient-to-br rounded-lg py-4 px-4 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'addition'
              ? 'from-blue-100 to-indigo-100 border-blue-400 shadow-md ring-2 ring-blue-300 ring-opacity-50 scale-102'
              : 'from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md hover:from-blue-100 hover:to-indigo-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${activeTab === 'addition' ? 'bg-blue-200' : 'bg-blue-100'}`}>👤</div>
            <div>
              <h3 className={`font-bold text-lg transition-colors ${activeTab === 'addition' ? 'text-blue-900' : 'text-blue-800'}`}>User Addition</h3>
              <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'addition' ? 'text-blue-700' : 'text-blue-600'}`}>Add new users to the system with initial role assignment</p>
            </div>
          </div>
        </button>

        {/* Permission Management */}
        <button
          onClick={() => onTabChange('permissions')}
          className={`bg-gradient-to-br rounded-lg py-4 px-4 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'permissions'
              ? 'from-purple-100 to-pink-100 border-purple-400 shadow-md ring-2 ring-purple-300 ring-opacity-50 scale-102'
              : 'from-purple-50 to-pink-50 border-purple-200 hover:shadow-md hover:from-purple-100 hover:to-pink-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${activeTab === 'permissions' ? 'bg-purple-200' : 'bg-purple-100'}`}>🔐</div>
            <div>
              <h3 className={`font-bold text-lg transition-colors ${activeTab === 'permissions' ? 'text-purple-900' : 'text-purple-800'}`}>Permission Management</h3>
              <p className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'permissions' ? 'text-purple-700' : 'text-purple-600'}`}>Manage user permissions, roles, and section-based access control</p>
            </div>
          </div>
        </button>

      </div>
    </div>
  )
}

export type { UserTab }
