"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { supabase } from "@/lib/supabase";

const NATIONAL_AVERAGES: Record<string, number> = {
  "Delta Dental": 8.2,
  "Cigna": 10.6,
  "Aetna": 7.1,
  "MetLife": 4.9,
  "BlueCross BlueShield": 6.3,
  "Guardian": 5.8,
  "United Healthcare": 9.2,
};

export default function PayersPage() {
  const [payers, setPayers] = useState<any[]>([]);
  const [topReason, setTopReason] = useState<string>("See full analysis");
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/sign-in");
        return;
      }

      const { data, error } = await supabase
        .from("analyses")
        .select("payer_breakdown, top_denial_reasons")
        .eq("user_id", session.user.id)
        .single();

      if (data && !error && data.payer_breakdown?.length > 0) {
        const mapped = data.payer_breakdown.map((p: any) => ({
          payer: p.payer,
          denialCount: p.denialCount,
          denialRate: p.denialRate,
          revenueAtRisk: Math.round(p.denialCount * 650),
          topReason: data.top_denial_reasons?.[0]?.reason || "See full analysis",
          national: NATIONAL_AVERAGES[p.payer] || 7.0,
          trend: p.denialRate > 8 ? "up" : "down",
        }));
        setPayers(mapped);
        setTopReason(data.top_denial_reasons?.[0]?.reason || "See full analysis");
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }

      setLoading(false);
    });
  }, [router]);

  const getRateColor = (rate: number) => {
    if (rate > 8) return "bg-red-50 text-red-600 border border-red-100";
    if (rate > 5) return "bg-amber-50 text-amber-600 border border-amber-100";
    return "bg-green-50 text-green-600 border border-green-100";
  };

  const totalAtRisk = payers.reduce((sum, p) => sum + p.revenueAtRisk, 0);
  const worstPayer = payers.length > 0
    ? payers.reduce((a, b) => a.denialRate > b.denialRate ? a : b)
    : null;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading payer data...</p>
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
            <h1 className="text-lg font-bold text-gray-900">Payer Analysis</h1>
            <p className="text-xs text-gray-400">
              {isDemo ? "Upload a CSV to see your real payer breakdown" : "Live analysis from your uploaded claims"}
            </p>
          </div>
          <button
            onClick={() => router.push("/#upload")}
            className="flex items-center gap-2 bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
          >
            Upload New CSV
          </button>
        </header>

        <main className="p-8 space-y-6">
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              No payer data yet.{" "}
              <button onClick={() => router.push("/#upload")} className="underline font-medium">
                Upload your claims CSV
              </button>{" "}
              to see your real payer breakdown.
            </div>
          )}

          {!isDemo && (
            <>
              <div className="grid grid-cols-3 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <p className="text-xs text-gray-400 mb-1">Total payers tracked</p>
                  <p className="text-3xl font-bold text-gray-900">{payers.length}</p>
                </div>
                <div className="bg-teal-700 rounded-2xl p-5">
                  <p className="text-xs text-teal-200 mb-1">Total revenue at risk</p>
                  <p className="text-3xl font-bold text-white">${totalAtRisk.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <p className="text-xs text-gray-400 mb-1">Worst performing payer</p>
                  <p className="text-2xl font-bold text-red-600">{worstPayer?.payer}</p>
                  <p className="text-xs text-gray-400 mt-1">{worstPayer?.denialRate}% denial rate</p>
                </div>
              </div>

              <div className="space-y-4">
                {payers.map((payer, index) => (
                  <div key={payer.payer} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-500">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">{payer.payer}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Top issue: {payer.topReason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          National avg: {payer.national}%
                        </span>
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getRateColor(payer.denialRate)}`}>
                          {payer.denialRate}% yours
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6 mb-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Total denials</p>
                        <p className="text-xl font-bold text-gray-900">{payer.denialCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Revenue at risk</p>
                        <p className="text-xl font-bold text-gray-900">${payer.revenueAtRisk.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">vs National</p>
                        <p className={`text-sm font-semibold ${payer.denialRate > payer.national ? "text-red-500" : "text-green-500"}`}>
                          {payer.denialRate > payer.national
                            ? `↑ ${(payer.denialRate - payer.national).toFixed(1)}% above`
                            : `↓ ${(payer.national - payer.denialRate).toFixed(1)}% below`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Trend</p>
                        <p className={`text-sm font-semibold ${payer.trend === "up" ? "text-red-500" : "text-green-500"}`}>
                          {payer.trend === "up" ? "↑ Worsening" : "↓ Improving"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Your rate vs national average</span>
                        <span>{payer.denialRate}% / {payer.national}%</span>
                      </div>
                      <div className="relative h-2 bg-gray-100 rounded-full">
                        <div
                          className="absolute h-2 bg-gray-300 rounded-full"
                          style={{ width: `${Math.min((payer.national / 25) * 100, 100)}%` }}
                        />
                        <div
                          className={`absolute h-2 rounded-full ${payer.denialRate > payer.national ? "bg-red-400" : "bg-teal-500"}`}
                          style={{ width: `${Math.min((payer.denialRate / 25) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-300 mt-1">
                        <span>0%</span>
                        <span className="text-gray-400">— national avg</span>
                        <span>25%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}