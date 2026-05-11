export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re offline</h1>
        <p className="text-sm text-gray-500 mb-6">
          ClaimIntel needs a connection to load your claims data. Check your network and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
