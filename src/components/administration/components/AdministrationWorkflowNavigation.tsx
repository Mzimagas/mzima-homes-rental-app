'use client'

export type AdministrationTab = 'users' | 'audit' | 'documents'

interface AdministrationWorkflowNavigationProps {
  activeTab: AdministrationTab
  onTabChange: (tab: AdministrationTab) => void
  canManageUsers: boolean
}

export default function AdministrationWorkflowNavigation({ 
  activeTab, 
  onTabChange, 
  canManageUsers 
}: AdministrationWorkflowNavigationProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3">
      <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">
        Administration Workflows
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* User Management */}
        <button
          onClick={() => onTabChange('users')}
          disabled={!canManageUsers}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'users'
              ? 'from-blue-100 to-indigo-100 border-blue-400 shadow-md ring-2 ring-blue-300 ring-opacity-50 scale-102'
              : canManageUsers
                ? 'from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md hover:from-blue-100 hover:to-indigo-100'
                : 'from-gray-50 to-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'users' 
                  ? 'bg-blue-200' 
                  : canManageUsers 
                    ? 'bg-blue-100' 
                    : 'bg-gray-100'
              }`}
            >
              👥
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'users' 
                    ? 'text-blue-900' 
                    : canManageUsers 
                      ? 'text-blue-800' 
                      : 'text-gray-500'
                }`}
              >
                User Management
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'users' 
                    ? 'text-blue-700' 
                    : canManageUsers 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                }`}
              >
                {canManageUsers 
                  ? 'Manage users, roles, and permissions across properties'
                  : 'Admin access required for user management'
                }
              </p>
            </div>
          </div>
        </button>

        {/* Audit Trail */}
        <button
          onClick={() => onTabChange('audit')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'audit'
              ? 'from-green-100 to-emerald-100 border-green-400 shadow-md ring-2 ring-green-300 ring-opacity-50 scale-102'
              : 'from-green-50 to-emerald-50 border-green-200 hover:shadow-md hover:from-green-100 hover:to-emerald-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'audit' ? 'bg-green-200' : 'bg-green-100'
              }`}
            >
              📋
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'audit' ? 'text-green-900' : 'text-green-800'
                }`}
              >
                Audit Trail
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'audit' ? 'text-green-700' : 'text-green-600'
                }`}
              >
                Monitor system activities, changes, and compliance tracking
              </p>
            </div>
          </div>
        </button>

        {/* Document Management */}
        <button
          onClick={() => onTabChange('documents')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'documents'
              ? 'from-orange-100 to-amber-100 border-orange-400 shadow-md ring-2 ring-orange-300 ring-opacity-50 scale-102'
              : 'from-orange-50 to-amber-50 border-orange-200 hover:shadow-md hover:from-orange-100 hover:to-amber-100'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                activeTab === 'documents' ? 'bg-orange-200' : 'bg-orange-100'
              }`}
            >
              📁
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${
                  activeTab === 'documents' ? 'text-orange-900' : 'text-orange-800'
                }`}
              >
                Document Management
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${
                  activeTab === 'documents' ? 'text-orange-700' : 'text-orange-600'
                }`}
              >
                Centralized document storage and management system
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
