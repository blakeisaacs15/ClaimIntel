import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">ClaimIntel</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-teal-700 transition-colors">
              Features
            </Link>
            <Link href="#upload" className="text-sm font-medium text-gray-600 hover:text-teal-700 transition-colors">
              Analyze Claims
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-teal-700 transition-colors">
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}