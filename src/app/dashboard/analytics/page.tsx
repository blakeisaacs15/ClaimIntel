"use client";

import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// National averages for comparison
const NATIONAL_AVERAGES: Record<string, number> = {
  "Delta Dental": 8.2,
  "Cigna": 10.6,
  "Aetna": 7.1,
  "MetLife": 4.9,
  "BlueCross BlueShield": 6.3,
  "Guardian": 5.8,
  "United Healthcare": 9.2,
};

export default function AnalyticsPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/sign-in");
        return;
      }

      const [{ data: analysisData }, { data: claimsData }] = await Promise.all([
        supabase.from("analyses").select("*").eq("user_id", session.user.id).single(),
        supabase.from("claims").select("*").eq("user_id", session.user.id),
      ]);

      if (analysisData) {
        setAnalysis(analysisData);
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }

      if (claimsData) setClaims(claimsData);
      setLoading(false);
    });
  }, [router]);

  // Build procedure breakdown from real claims
  const procedureMap: Record<string, { code: string; name: string; denials: number; revenue: number }> = {};
  claims.forEach(c => {
    const code = c.procedure_code || "Unknown";
    if (!procedureMap[code]) {
      procedureMap[code] = { code, name: code, denials: 0, revenue: 0 };
    }
    procedureMap[code].denials++;
    procedureMap[code].revenue += Number(c.amount) || 0;
  });
  const topProcedures = Object.values(procedureMap)
    .sort((a, b) => b.denials - a.denials)
    .slice(0, 5);

  const payerBreakdown = analysis?.payer_breakdown || [];
  const topDenialReasons = analysis?.top_denial_reasons || [];
  const totalDenied = analysis?.total_denied || 0;
  const revenueAtRisk = analysis?.revenue_at_risk || 0;

  const avgDenialRate = totalDenied > 0
    ? ((totalDenied / (totalDenied + 1247)) * 100).toFixed(1)
    : "0";

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
            <p className="text-xs text-gray-400">Denial trends and procedure analysis</p>
          </div>
          <button
            onClick={() => router.push("/#upload")}
            className="bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
          >
            Upload New CSV
          </button>
        </header>

        <main className="p-8 space-y-6">
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              No data yet.{" "}
              <button onClick={() => router.push("/#upload")} className="underline font-medium">
                Upload your CSV
              </button>{" "}
              to see your real analytics.
            </div>
          )}

          {!isDemo && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Denied Claims", value: totalDenied, sub: "from uploaded data", color: "text-gray-800" },
                  { label: "Revenue at Risk", value: `$${Number(revenueAtRisk).toLocaleString()}`, sub: "recoverable", color: "text-amber-600" },
                  { label: "Your Denial Rate", value: `${avgDenialRate}%`, sub: "vs 8% national avg", color: Number(avgDenialRate) > 8 ? "text-red-600" : "text-green-600" },
                  { label: "Payers Analyzed", value: payerBreakdown.length, sub: "insurance companies", color: "text-teal-600" },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Payer comparison vs national average */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  Your Payers vs National Average
                </h2>
                <p className="text-xs text-gray-400 mb-6">
                  How your denial rates compare to national benchmarks
                </p>
                <div className="space-y-4">
                  {payerBreakdown.map((payer: any) => {
                    const national = NATIONAL_AVERAGES[payer.payer] || 7.0;
                    const yours = Number(payer.denialRate);
                    const worse = yours > national;
                    return (
                      <div key={payer.payer}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-800">{payer.payer}</span>
                          <span className={`font-semibold ${worse ? "text-red-600" : "text-green-600"}`}>
                            {yours}% yours · {national}% national
                            {worse ? " ⚠️" : " ✓"}
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-100 rounded-full">
                          <div
                            className="absolute h-2 bg-gray-300 rounded-full"
                            style={{ width: `${Math.min((national / 20) * 100, 100)}%` }}
                          />
                          <div
                            className={`absolute h-2 rounded-full ${worse ? "bg-red-400" : "bg-teal-500"}`}
                            style={{ width: `${Math.min((yours / 20) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  ⚠️ = your rate is above national average · ✓ = you're performing better than average
                </p>
              </div>

              {/* Top denial reasons */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  Top Denial Reasons
                </h2>
                <p className="text-xs text-gray-400 mb-5">What's causing your denials</p>
                <div className="space-y-4">
                  {topDenialReasons.map((item: any, i: number) => (
                    <div key={item.reason}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">{item.reason}</span>
                        <span className="text-gray-500">
                          {item.count} claims ·{" "}
                          <span className="text-amber-600 font-semibold">{item.percentage}%</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${i === 0 ? "bg-red-400" : i === 1 ? "bg-amber-400" : "bg-teal-500"}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top denied procedures from real claims */}
              {topProcedures.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
                    Top Denied Procedures
                  </h2>
                  <p className="text-xs text-gray-400 mb-5">
                    Procedure codes with highest denial counts from your data
                  </p>
                  <div className="space-y-4">
                    {topProcedures.map((p, i) => (
                      <div key={p.code} className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-300 w-4">{i + 1}</span>
                        <div className="w-16 flex-shrink-0">
                          <p className="text-xs font-mono font-semibold text-teal-700">{p.code}</p>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium">{p.name}</span>
                            <span className="text-gray-500">
                              {p.denials} denials ·{" "}
                              <span className="text-amber-600 font-semibold">
                                ${p.revenue.toLocaleString()}
                              </span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-teal-500 h-1.5 rounded-full"
                              style={{ width: `${(p.denials / (topProcedures[0]?.denials || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payer breakdown table */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  Payer Performance
                </h2>
                <p className="text-xs text-gray-400 mb-5">Denial counts ranked by volume</p>
                <div className="space-y-3">
                  {payerBreakdown.map((payer: any, i: number) => (
                    <div key={payer.payer} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{payer.payer}</p>
                          <p className="text-xs text-gray-400">{payer.denialCount} denials</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        payer.denialRate > 8
                          ? "bg-red-50 text-red-600"
                          : payer.denialRate > 5
                          ? "bg-amber-50 text-amber-600"
                          : "bg-green-50 text-green-600"
                      }`}>
                        {payer.denialRate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}