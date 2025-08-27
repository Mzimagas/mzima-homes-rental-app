export default function RootLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="animate-pulse text-sm text-gray-600">Loading…</div>
    </div>
  )
}
