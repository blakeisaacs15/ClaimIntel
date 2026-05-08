import Link from "next/link";
import ClaimIntelLogo from "@/components/ClaimIntelLogo";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <ClaimIntelLogo size={30} textSizeClassName="text-xl" />
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