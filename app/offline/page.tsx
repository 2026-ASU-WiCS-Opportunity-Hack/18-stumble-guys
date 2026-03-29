export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-100 gap-4 text-center px-4">
      <div className="h-12 w-12 rounded-full bg-zinc-200 flex items-center justify-center text-2xl">
        📶
      </div>
      <h1 className="text-xl font-semibold text-zinc-800">You&apos;re offline</h1>
      <p className="text-sm text-zinc-500 max-w-xs">
        Check your internet connection and try again. Previously visited pages are available while offline.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-4 py-2 rounded-md bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
