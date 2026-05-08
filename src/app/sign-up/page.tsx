"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ClaimIntelLogo from "@/components/ClaimIntelLogo";

const supabase = createClient(
  "https://mzrtilffsprxrymazckn.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignUpPage() {
  const router = useRouter();
  const [practiceName, setPracticeName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          practice_name: practiceName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      setRedirecting(true);
      router.push("/dashboard");
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (redirecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-teal-700 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up your account</h2>
          <p className="text-gray-500 text-sm">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md text-center">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-6">
            We sent a confirmation link to <span className="font-medium text-gray-700">{email}</span>. Click it to activate your account.
          </p>
          <Link href="/sign-in" className="text-teal-700 text-sm font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="text-center">
            <Link href="/" className="inline-flex">
              <ClaimIntelLogo size={30} textSizeClassName="text-xl" />
            </Link>
            <p className="text-gray-500 text-sm mt-2">Create your practice account</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Get started free</h1>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Practice name
              </label>
              <input
                type="text"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                placeholder="Stuart Oral Surgery"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="billing@yourpractice.com"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-700 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-teal-800 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-teal-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}