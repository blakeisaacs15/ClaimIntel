"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import AppealModal from "@/components/dashboard/AppealModal";
import NewClaimModal from "@/components/dashboard/NewClaimModal";
import { supabase } from "@/lib/supabase";

export default function ClaimsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [appealClaim, setAppealClaim] = useState<any | null>(null);
  const [showNewClaim, setShowNewClaim] = useState(false);
  const [editClaim, setEditClaim] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
      {appealClaim && (
        <AppealModal claim={appealClaim} onClose={() => setAppealClaim(null)} />
      )}
      {showNewClaim && (
        <NewClaimModal
          onClose={() => setShowNewClaim(false)}
          onSaved={(claim) => {
            setClaims(prev => [claim, ...prev]);
            setIsDemo(false);
          }}
        />
      )}
      {editClaim && (
        <NewClaimModal
          existingClaim={editClaim}
          onClose={() => setEditClaim(null)}
          onSaved={(updated) => {
            setClaims(prev => prev.map(c => c.id === updated.id ? updated : c));
            setEditClaim(null);
          }}
        />
      )}
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">All Claims</h1>
            <p className="text-xs text-gray-400">
              {`${filtered.length} denied claims · $${totalAtRisk.toLocaleString()} at risk`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewClaim(true)}
              className="flex items-center gap-2 text-sm font-semibold text-teal-700 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Claim
            </button>
            <button
              onClick={() => router.push("/#upload")}
              className="flex items-center gap-2 bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
            >
              Upload CSV
            </button>
          </div>
        </header>

        <main className="p-8">
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
              No claims yet.{" "}
              <button onClick={() => setShowNewClaim(true)} className="underline font-medium">
                Add a claim manually
              </button>{" "}
              or{" "}
              <button onClick={() => router.push("/#upload")} className="underline font-medium">
                upload a CSV
              </button>
              .
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
                    {["Claim ID", "Patient", "Payer", "Procedure", "Amount", "Denial Reason", "Date", ""].map((h, i) => (
                      <th key={i} className="text-left text-xs font-semibold text-gray-400 px-5 py-3">{h}</th>
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
                      <td className="px-5 py-4">
                        {confirmDeleteId === claim.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={async () => {
                                await supabase.from("claims").delete().eq("id", claim.id);
                                setClaims(prev => prev.filter(c => c.id !== claim.id));
                                setConfirmDeleteId(null);
                              }}
                              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setAppealClaim(claim)}
                              className="text-xs font-semibold text-teal-700 border border-teal-200 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Appeal
                            </button>
                            <button
                              onClick={() => setEditClaim(claim)}
                              title="Edit"
                              className="text-gray-300 hover:text-teal-600 transition-colors p-1.5 rounded-lg hover:bg-gray-50"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(claim.id)}
                              title="Delete"
                              className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-gray-50"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
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