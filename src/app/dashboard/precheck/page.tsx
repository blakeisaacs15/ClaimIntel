"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import PreAuthModal, { type PreAuthInput } from "@/components/dashboard/PreAuthModal";
import { supabase } from "@/lib/supabase";

interface PrecheckResult {
  code: string;
  status: "GREEN" | "YELLOW" | "RED";
  ruleFlag: string;
  fixAction: string;
  confidence: "High" | "Medium" | "Low";
  needsPreAuth?: boolean;
}

interface BundlingConflict {
  codes: string[];
  description: string;
  action: string;
}

interface HistoryEntry {
  id: string;
  checked_at: string;
  payer: string;
  patient_age: number;
  tooth_number: string | null;
  pre_auth_obtained: boolean;
  results: PrecheckResult[];
}

const PAYERS = ["Delta Dental", "Cigna", "Aetna", "MetLife", "Guardian", "Other"];

const STATUS_STYLES = {
  GREEN: {
    border: "border-green-200",
    bg: "bg-green-50",
    badge: "bg-green-100 text-green-700",
    bar: "bg-green-400",
    label: "Likely to Pay",
    icon: (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  YELLOW: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-400",
    label: "At Risk",
    icon: (
      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  RED: {
    border: "border-red-200",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-400",
    label: "Likely to Deny",
    icon: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const CONFIDENCE_STYLES = {
  High: "bg-slate-100 text-slate-700",
  Medium: "bg-slate-100 text-slate-600",
  Low: "bg-slate-100 text-slate-500",
};

function statusSummary(results: PrecheckResult[]) {
  const counts = { RED: 0, YELLOW: 0, GREEN: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
  return [
    counts.RED && `${counts.RED} RED`,
    counts.YELLOW && `${counts.YELLOW} YELLOW`,
    counts.GREEN && `${counts.GREEN} GREEN`,
  ].filter(Boolean).join(", ");
}

export default function PrecheckPage() {
  const router = useRouter();

  const [codes, setCodes] = useState<string[]>([""]);
  const [payer, setPayer] = useState("Delta Dental");
  const [patientAge, setPatientAge] = useState("");
  const [lastTreatmentDate, setLastTreatmentDate] = useState("");
  const [toothNumber, setToothNumber] = useState("");
  const [preAuthObtained, setPreAuthObtained] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PrecheckResult[] | null>(null);
  const [bundlingConflicts, setBundlingConflicts] = useState<BundlingConflict[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [preAuthModal, setPreAuthModal] = useState<PreAuthInput | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/sign-in"); return; }
      try {
        const res = await fetch("/api/precheck", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setHistory(data.history ?? []);
      } catch {
        // table may not exist yet
      } finally {
        setHistoryLoading(false);
      }
    });
  }, [router]);

  const addCode = () => setCodes(prev => [...prev, ""]);
  const removeCode = (i: number) => setCodes(prev => prev.filter((_, idx) => idx !== i));
  const updateCode = (i: number, val: string) =>
    setCodes(prev => prev.map((c, idx) => (idx === i ? val.toUpperCase() : c)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCodes = codes.map(c => c.trim()).filter(c => /^D\d{4}$/i.test(c));
    if (!validCodes.length) { setError("Enter at least one valid procedure code (e.g. D2740)."); return; }
    if (!patientAge || isNaN(Number(patientAge))) { setError("Enter a valid patient age."); return; }

    setError(null);
    setLoading(true);
    setResults(null);
    setBundlingConflicts([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/precheck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          codes: validCodes,
          payer,
          patientAge: Number(patientAge),
          lastTreatmentDate: lastTreatmentDate || undefined,
          toothNumber: toothNumber || undefined,
          preAuthObtained,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check failed");

      setResults(data.results);
      setBundlingConflicts(data.bundlingConflicts ?? []);

      if (session) {
        const histRes = await fetch("/api/precheck", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const histData = await histRes.json();
        setHistory(histData.history ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      {preAuthModal && (
        <PreAuthModal input={preAuthModal} onClose={() => setPreAuthModal(null)} />
      )}
      <div className="flex-1 overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Pre-Check</h1>
            <p className="text-xs text-gray-400">Assess claim risk before submitting to the payer</p>
          </div>
        </header>

        <main className="p-8 space-y-6 max-w-4xl">
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Claim Details</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Procedure Codes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Procedure Code(s)
                </label>
                <div className="space-y-2">
                  {codes.map((code, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={code}
                        onChange={e => updateCode(i, e.target.value)}
                        placeholder="e.g. D2740"
                        maxLength={5}
                        className="font-mono w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent uppercase"
                      />
                      {codes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCode(i)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCode}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add code
                </button>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Payer / Insurance
                  </label>
                  <select
                    value={payer}
                    onChange={e => setPayer(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
                  >
                    {PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Patient Age
                  </label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                    placeholder="e.g. 45"
                    min={1}
                    max={120}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Date of Last Treatment
                    <span className="ml-1 text-gray-400 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={lastTreatmentDate}
                    onChange={e => setLastTreatmentDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Tooth Number
                    <span className="ml-1 text-gray-400 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={toothNumber}
                    onChange={e => setToothNumber(e.target.value)}
                    placeholder="e.g. 14"
                    maxLength={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pre-auth toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Pre-authorization obtained?
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreAuthObtained(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      preAuthObtained
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreAuthObtained(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      !preAuthObtained
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Check Claim
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results */}
          {(results || bundlingConflicts.length > 0) && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Risk Assessment</h2>

              {/* Bundling conflicts — shown first */}
              {bundlingConflicts.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="h-1 w-full bg-purple-400" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-bold text-purple-900">
                        Bundling Conflict{bundlingConflicts.length > 1 ? "s" : ""} Detected
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {bundlingConflicts.length} conflict{bundlingConflicts.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-3 pl-7">
                      {bundlingConflicts.map((conflict, i) => (
                        <div key={i} className={i > 0 ? "border-t border-purple-100 pt-3" : ""}>
                          <div className="flex items-center gap-1.5 mb-1">
                            {conflict.codes.map(c => (
                              <span key={c} className="font-mono text-xs font-bold text-purple-800 bg-purple-100 border border-purple-200 rounded px-1.5 py-0.5">
                                {c}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-purple-800 mb-1">{conflict.description}</p>
                          <p className="text-sm font-medium text-purple-900">
                            <span className="text-purple-500 font-semibold">Fix: </span>
                            {conflict.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Per-code result cards */}
              {results?.map(result => {
                const s = STATUS_STYLES[result.status] ?? STATUS_STYLES.YELLOW;
                const showPreAuthButton =
                  (result.status === "RED" || result.status === "YELLOW") && result.needsPreAuth;

                return (
                  <div
                    key={result.code}
                    className={`bg-white border ${s.border} rounded-xl shadow-sm overflow-hidden`}
                  >
                    <div className={`h-1 w-full ${s.bar}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          {s.icon}
                          <span className="font-mono text-base font-bold text-gray-900">{result.code}</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>
                            {s.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${CONFIDENCE_STYLES[result.confidence] ?? CONFIDENCE_STYLES.Medium}`}>
                            {result.confidence} confidence
                          </span>
                          {showPreAuthButton && (
                            <button
                              onClick={() => setPreAuthModal({
                                codes: [result.code],
                                payer,
                                patientAge: Number(patientAge),
                                toothNumber: toothNumber || undefined,
                                lastTreatmentDate: lastTreatmentDate || undefined,
                                ruleFlag: result.ruleFlag,
                              })}
                              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Pre-Auth Letter
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2.5 pl-8">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Rule flagged</p>
                          <p className="text-sm text-gray-700">{result.ruleFlag}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">What to do</p>
                          <p className="text-sm font-medium text-teal-800">{result.fixAction}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <p className="text-xs text-gray-400 text-center pt-1">
                Risk assessment generated by Claude AI · Always verify against the patient&apos;s specific plan
              </p>
            </div>
          )}

          {/* History */}
          {(history.length > 0 || historyLoading) && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-800">Check History</h2>
              </div>
              {historyLoading ? (
                <div className="px-6 py-8 text-center">
                  <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {history.map(entry => {
                    const entryCodes = (entry.results ?? []).map(r => r.code).join(", ");
                    const summary = statusSummary(entry.results ?? []);
                    const hasRed = entry.results?.some(r => r.status === "RED");
                    const hasYellow = !hasRed && entry.results?.some(r => r.status === "YELLOW");
                    const dotClass = hasRed ? "bg-red-400" : hasYellow ? "bg-amber-400" : "bg-green-400";
                    return (
                      <div key={entry.id} className="px-6 py-3 flex items-center gap-4 text-sm">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
                        <span className="text-gray-400 text-xs w-32 flex-shrink-0">
                          {new Date(entry.checked_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <span className="font-mono text-xs text-gray-700 flex-shrink-0 w-32 truncate">{entryCodes}</span>
                        <span className="text-gray-500 flex-shrink-0">{entry.payer}</span>
                        <span className="text-gray-400 text-xs ml-auto">{summary}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
