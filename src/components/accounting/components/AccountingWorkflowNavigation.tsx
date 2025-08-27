'use client'

export type AccountingTab = 'income' | 'expenses' | 'tax' | 'reports'

interface Props {
  activeTab: AccountingTab
  onTabChange: (tab: AccountingTab) => void
}

export default function AccountingWorkflowNavigation({ activeTab, onTabChange }: Props) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
      <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">Accounting Workflows</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Income Tracking */}
        <button
          onClick={() => onTabChange('income')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'income'
              ? 'from-green-100 to-emerald-100 border-green-400 shadow-md ring-2 ring-green-300 ring-opacity-50 scale-102'
              : 'from-green-50 to-emerald-50 border-green-200 hover:shadow-md hover:from-green-100 hover:to-emerald-100'
          }`}
          aria-pressed={activeTab === 'income'}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'income' ? 'bg-green-200' : 'bg-green-100'}`}
            >
              💹
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${activeTab === 'income' ? 'text-green-900' : 'text-green-800'}`}
              >
                Income Tracking
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'income' ? 'text-green-700' : 'text-green-600'}`}
              >
                Record and analyze rental income
              </p>
            </div>
          </div>
        </button>

        {/* Expense Management */}
        <button
          onClick={() => onTabChange('expenses')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'expenses'
              ? 'from-rose-100 to-red-100 border-rose-400 shadow-md ring-2 ring-rose-300 ring-opacity-50 scale-102'
              : 'from-rose-50 to-red-50 border-rose-200 hover:shadow-md hover:from-rose-100 hover:to-red-100'
          }`}
          aria-pressed={activeTab === 'expenses'}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'expenses' ? 'bg-rose-200' : 'bg-rose-100'}`}
            >
              💳
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${activeTab === 'expenses' ? 'text-rose-900' : 'text-rose-800'}`}
              >
                Expense Management
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'expenses' ? 'text-rose-700' : 'text-rose-600'}`}
              >
                Manage acquisition and operating costs
              </p>
            </div>
          </div>
        </button>

        {/* Tax Planning */}
        <button
          onClick={() => onTabChange('tax')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'tax'
              ? 'from-amber-100 to-yellow-100 border-amber-400 shadow-md ring-2 ring-amber-300 ring-opacity-50 scale-102'
              : 'from-amber-50 to-yellow-50 border-amber-200 hover:shadow-md hover:from-amber-100 hover:to-yellow-100'
          }`}
          aria-pressed={activeTab === 'tax'}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'tax' ? 'bg-amber-200' : 'bg-amber-100'}`}
            >
              🧾
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${activeTab === 'tax' ? 'text-amber-900' : 'text-amber-800'}`}
              >
                Tax Planning
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'tax' ? 'text-amber-700' : 'text-amber-600'}`}
              >
                Configure rates and view tax summaries
              </p>
            </div>
          </div>
        </button>

        {/* Financial Reports */}
        <button
          onClick={() => onTabChange('reports')}
          className={`bg-gradient-to-br rounded-lg py-3 px-3 transition-all duration-200 hover:scale-102 cursor-pointer border-2 ${
            activeTab === 'reports'
              ? 'from-purple-100 to-violet-100 border-purple-400 shadow-md ring-2 ring-purple-300 ring-opacity-50 scale-102'
              : 'from-purple-50 to-violet-50 border-purple-200 hover:shadow-md hover:from-purple-100 hover:to-violet-100'
          }`}
          aria-pressed={activeTab === 'reports'}
        >
          <div className="flex flex-col items-center text-center space-y-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${activeTab === 'reports' ? 'bg-purple-200' : 'bg-purple-100'}`}
            >
              📈
            </div>
            <div>
              <h3
                className={`font-bold text-base transition-colors ${activeTab === 'reports' ? 'text-purple-900' : 'text-purple-800'}`}
              >
                Financial Reports
              </h3>
              <p
                className={`text-sm mt-1 transition-colors opacity-75 ${activeTab === 'reports' ? 'text-purple-700' : 'text-purple-600'}`}
              >
                P&L and Cash Flow statements
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
