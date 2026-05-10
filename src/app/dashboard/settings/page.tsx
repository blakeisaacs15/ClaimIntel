"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [odKey, setOdKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/sign-in");
        return;
      }
      const { data } = await supabase
        .from("user_settings")
        .select("od_customer_key")
        .eq("user_id", session.user.id)
        .single();
      if (data?.od_customer_key) setSavedKey(data.od_customer_key);
      setLoading(false);
    });
  }, [router]);

  const handleSave = async () => {
    if (!odKey.trim()) return;
    setSaving(true);
    setStatus("idle");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: session.user.id, od_customer_key: odKey.trim(), updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) {
      setStatus("error");
    } else {
      setSavedKey(odKey.trim());
      setOdKey("");
      setStatus("success");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Settings</h1>
            <p className="text-xs text-gray-400">Manage your integration keys</p>
          </div>
        </header>

        <main className="p-8 max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Open Dental Integration</h2>
            <p className="text-xs text-gray-400 mb-5">
              Your API authorization token from Open Dental. Used to fetch live claim data for the Hold Claims page.
            </p>

            {savedKey && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5 text-sm">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-800">
                  Key saved &middot;{" "}
                  <span className="font-mono">{savedKey.slice(0, 10)}&bull;&bull;&bull;</span>
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {savedKey ? "Replace API Token" : "API Token"}
                </label>
                <input
                  type="password"
                  value={odKey}
                  onChange={(e) => { setOdKey(e.target.value); setStatus("idle"); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={savedKey ? "Enter new token to replace existing" : "ODFHIR YOUR_CUSTOMER_KEY"}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Format: <span className="font-mono">ODFHIR YOUR_CUSTOMER_KEY</span> — found in your Open Dental customer portal.
                </p>
              </div>

              {status === "success" && (
                <p className="text-sm text-green-700 font-medium">Token saved successfully.</p>
              )}
              {status === "error" && (
                <p className="text-sm text-red-600">Failed to save. Please try again.</p>
              )}

              <button
                onClick={handleSave}
                disabled={!odKey.trim() || saving}
                className="bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Token"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
