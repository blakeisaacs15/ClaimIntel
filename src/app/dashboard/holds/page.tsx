"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { supabase } from "@/lib/supabase";

interface Procedure {
  ClaimProcNum: number;
  CodeSent: string;
  FeeBilled: number;
  Status: string;
}

interface HoldClaim {
  ClaimNum: number;
  PatNum: number;
  DateService: string;
  ClaimFee: number;
  ClaimType: string;
  InsPayEst: number;
  PatRelat: string;
  procedures: Procedure[];
}

interface ClaimAction {
  claimNum: number;
  reason: string;
  action: string;
  priority: "critical" | "high" | "medium";
  effort: "easy" | "medium" | "hard";
  category: string;
}

const PRIORITY_STYLES = {
  critical: { bar: "bg-red-500", badge: "bg-red-100 text-red-700", label: "Critical" },
  high: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-700", label: "High" },
  medium: { bar: "bg-blue-400", badge: "bg-blue-100 text-blue-700", label: "Medium" },
};

const EFFORT_STYLES = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-red-100 text-red-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  authorization: "🔐",
  coding: "🏷️",
  documentation: "📋",
  eligibility: "✅",
  billing: "💳",
};

export default function HoldsPage() {
  const [claims, setClaims] = useState<HoldClaim[]>([]);
  const [claimActions, setClaimActions] = useState<ClaimAction[]>([]);
  const [totalAtRisk, setTotalAtRisk] = useState(0);
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/open-dental/holds");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setClaims(data.claims);
      setClaimActions(data.claimActions);
      setTotalAtRisk(data.totalAtRisk);
      setInsight(data.insight);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/sign-in");
        return;
      }
      loadData();
    });
  }, [router]);

  const actionForClaim = (claimNum: number) =>
    claimActions.find((a) => a.claimNum === claimNum);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Fetching hold claims from Open Dental...</p>
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
            <h1 className="text-lg font-bold text-gray-900">Hold Claims</h1>
            <p className="text-xs text-gray-400">
              {claims.length} claims on hold · ${totalAtRisk.toLocaleString()} not yet submitted
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh from Open Dental
          </button>
        </header>

        <main className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {insight && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <span className="text-teal-600 mt-0.5 text-lg">💡</span>
              <p className="text-sm text-teal-800 leading-relaxed">{insight}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Claims on Hold", value: claims.length, color: "text-gray-800" },
              { label: "Total Fee Billed", value: `$${totalAtRisk.toLocaleString()}`, color: "text-amber-600" },
              { label: "Secondary Claims", value: claims.filter((c) => c.ClaimType === "S").length, color: "text-blue-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {claims.map((claim) => {
              const action = actionForClaim(claim.ClaimNum);
              const p = action ? PRIORITY_STYLES[action.priority] ?? PRIORITY_STYLES.medium : PRIORITY_STYLES.medium;
              const effort = action?.effort ?? "medium";

              return (
                <div key={claim.ClaimNum} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className={`h-1 w-full ${p.bar}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-teal-700">CLM-{claim.ClaimNum}</span>
                        <span className="text-xs text-gray-400">Patient #{claim.PatNum}</span>
                        <span className="text-xs text-gray-400">{claim.DateService}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                          {claim.ClaimType === "S" ? "Secondary" : "Primary"}
                        </span>
                        <span className="text-xs text-gray-400">{claim.PatRelat}</span>
                        {action && (
                          <>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${p.badge}`}>{p.label}</span>
                            <span className="text-xs">{CATEGORY_ICONS[action.category] ?? "📌"}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${EFFORT_STYLES[effort] ?? EFFORT_STYLES.medium}`}>
                              {effort} fix
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-gray-900">${claim.ClaimFee.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">fee billed</p>
                      </div>
                    </div>

                    {claim.procedures.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {claim.procedures.map((proc) => (
                          <span
                            key={proc.ClaimProcNum}
                            className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
                          >
                            <span className="font-mono font-semibold text-gray-700">{proc.CodeSent}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500">${proc.FeeBilled.toLocaleString()}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {action && (
                      <div className="border-t border-gray-100 pt-4 space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Why it&apos;s on hold</p>
                          <p className="text-sm text-gray-700">{action.reason}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Action to take</p>
                          <p className="text-sm font-medium text-teal-800">{action.action}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Actions generated by Claude AI · Live data from Open Dental
          </p>
        </main>
      </div>
    </div>
  );
}
