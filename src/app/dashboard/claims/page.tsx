"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/sign-in");
        return;
      }

      const { data, error } = await supabase
        .from("claims")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0 && !error) {
        setClaims(data);
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }

      setLoading(false);
    });
  }, [router]);

  const filtered = claims.filter(c => {
    const s = search.toLowerCase();
    return (
      (c.patient ?? "").toLowerCase().includes(s) ||
      (c.payer ?? "").toLowerCase().includes(s) ||
      (c.denial_reason ?? "").toLowerCase().includes(s) ||
      (c.procedure_code ?? "").toLowerCase().includes(s)
    );
  });

  const totalAtRisk = filtered.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading claims...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">All Claims</h1>
            <p className="text-xs text-gray-400">
              {`${filtered.length} denied claims · $${totalAtRisk.toLocaleString()} at risk`}
            </p>
          </div>
          <button
            onClick={() => router.push("/#upload")}
            className="flex items-center gap-2 bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
          >
            Upload New CSV
          </button>
        </header>

        <main className="p-8">
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
              No claims uploaded yet.{" "}
              <button onClick={() => router.push("/#upload")} className="underline font-medium">
                Upload your CSV
              </button>{" "}
              to see your real denied claims.
            </div>
          )}

          {!isDemo && claims.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Search by patient, payer, procedure, or reason..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-400"
                />
                <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} results</span>
              </div>

              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Claim ID", "Patient", "Payer", "Procedure", "Amount", "Denial Reason", "Date"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((claim, i) => (
                    <tr key={claim.id ?? i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-teal-600">{claim.claim_id ?? `CLM-${i + 1}`}</td>
                      <td className="px-5 py-4 text-sm text-gray-900">{claim.patient ?? "Unknown"}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{claim.payer ?? "Unknown"}</td>
                      <td className="px-5 py-4 text-sm font-mono text-gray-500">{claim.procedure_code ?? "—"}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">${Number(claim.amount || 0).toLocaleString()}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">{claim.denial_reason ?? "—"}</td>
                      <td className="px-5 py-4 text-sm text-gray-400">{claim.date_of_service ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}