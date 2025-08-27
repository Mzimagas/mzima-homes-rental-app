export default function Loading() {
  return (
    <div className="p-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {Array.from({ length: 5 }).map((_, idx) => (
            <li key={idx} className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
                <div className="flex-shrink-0">
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
