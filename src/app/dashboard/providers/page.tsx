"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { supabase } from "@/lib/supabase";

interface Provider {
  id: string;
  full_name: string;
  npi: string | null;
  role: string;
  color: string;
}

interface Claim {
  id: string;
  patient: string;
  payer: string;
  procedure_code: string;
  amount: number;
  denial_reason: string;
  rendering_provider: string | null;
}

interface ProviderScorecard {
  provider: Provider;
  claimCount: number;
  revenueAtRisk: number;
  topDenialReason: string;
  topPayer: string;
}

export default function ProvidersPage() {
  const [scorecards, setScorecards] = useState<ProviderScorecard[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [unassignedRevenue, setUnassignedRevenue] = useState(0);
  const [noProviders, setNoProviders] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/sign-in"); return; }

      const [{ data: claims }, { data: providers }] = await Promise.all([
        supabase.from("claims").select("id,patient,payer,procedure_code,amount,denial_reason,rendering_provider").eq("user_id", session.user.id),
        supabase.from("providers").select("id,full_name,npi,role,color").eq("user_id", session.user.id).order("created_at", { ascending: true }),
      ]);

      if (!providers || providers.length === 0) {
        setNoProviders(true);
        setLoading(false);
        return;
      }

      const allClaims: Claim[] = claims ?? [];

      const cards: ProviderScorecard[] = providers.map((prov: Provider) => {
        const matched = allClaims.filter(c =>
          c.rendering_provider &&
          c.rendering_provider.trim().toLowerCase() === prov.full_name.trim().toLowerCase()
        );

        const revenueAtRisk = matched.reduce((sum, c) => sum + (c.amount || 0), 0);

        const reasonCounts: Record<string, number> = {};
        matched.forEach(c => {
          const r = c.denial_reason || '—';
          reasonCounts[r] = (reasonCounts[r] || 0) + 1;
        });
        const topDenialReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

        const payerCounts: Record<string, number> = {};
        matched.forEach(c => {
          const p = c.payer || '—';
          payerCounts[p] = (payerCounts[p] || 0) + 1;
        });
        const topPayer = Object.entries(payerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

        return {
          provider: prov,
          claimCount: matched.length,
          revenueAtRisk,
          topDenialReason,
          topPayer,
        };
      });

      const matchedIds = new Set(
        allClaims
          .filter(c => c.rendering_provider && providers.some((p: Provider) =>
            p.full_name.trim().toLowerCase() === c.rendering_provider!.trim().toLowerCase()
          ))
          .map(c => c.id)
      );

      const unassigned = allClaims.filter(c => !matchedIds.has(c.id));
      setUnassignedCount(unassigned.length);
      setUnassignedRevenue(unassigned.reduce((sum, c) => sum + (c.amount || 0), 0));

      setScorecards(cards);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading provider scorecards...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalClaims = scorecards.reduce((s, c) => s + c.claimCount, 0) + unassignedCount;
  const totalRevenue = scorecards.reduce((s, c) => s + c.revenueAtRisk, 0) + unassignedRevenue;

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Providers</h1>
            <p className="text-xs text-gray-400">
              {noProviders
                ? "Add providers in Settings to see scorecards"
                : `${scorecards.length} provider${scorecards.length !== 1 ? "s" : ""} · ${totalClaims} denied claims tracked`}
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
          >
            Manage Providers
          </Link>
        </header>

        <main className="p-8 space-y-6">
          {noProviders && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-2">No providers configured</h2>
              <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                Add your doctors and staff in Settings. Once added, denied claims will be matched to providers automatically.
              </p>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-800 transition-colors"
              >
                Go to Settings →
              </Link>
            </div>
          )}

          {!noProviders && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Providers", value: scorecards.length, color: "text-gray-800" },
                  { label: "Denied Claims Tracked", value: totalClaims, color: "text-amber-600" },
                  { label: "Revenue at Risk", value: `$${totalRevenue.toLocaleString()}`, color: "text-red-600" },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {scorecards.map(sc => (
                  <div key={sc.provider.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="h-1 w-full" style={{ backgroundColor: sc.provider.color }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: sc.provider.color }}
                          >
                            {sc.provider.full_name.split(' ').slice(-1)[0]?.[0] ?? '?'}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{sc.provider.full_name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                {sc.provider.role}
                              </span>
                              {sc.provider.npi && (
                                <span className="text-xs text-gray-400 font-mono">NPI {sc.provider.npi}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">${sc.revenueAtRisk.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">revenue at risk</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Denied Claims</p>
                          <p className="text-lg font-bold text-gray-900">{sc.claimCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Top Payer</p>
                          <p className="text-sm font-medium text-gray-700 truncate">{sc.topPayer}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Top Denial Reason</p>
                          <p className="text-sm text-gray-700 truncate" title={sc.topDenialReason}>
                            {sc.topDenialReason}
                          </p>
                        </div>
                      </div>

                      {sc.claimCount === 0 && (
                        <p className="text-xs text-gray-400 mt-3">
                          No claims matched yet — make sure the provider name in your CSV matches exactly.
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {unassignedCount > 0 && (
                  <div className="bg-white border border-dashed border-gray-300 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500">Unassigned Claims</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Claims with no rendering provider or no provider name match
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-400">{unassignedCount}</p>
                        <p className="text-xs text-gray-400">${unassignedRevenue.toLocaleString()} at risk</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
