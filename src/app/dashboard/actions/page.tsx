"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { supabase } from "@/lib/supabase";

interface Action {
  id: string;
  priority: "critical" | "high" | "medium";
  title: string;
  description: string;
  claimsAffected: number;
  revenueAtRisk: number;
  payer: string;
  category: "authorization" | "coding" | "documentation" | "eligibility" | "billing";
  effort: "easy" | "medium" | "hard";
  done: boolean;
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

function ActionCard({ action, onToggle }: { action: Action; onToggle: (id: string) => void }) {
  const priority = action.priority as keyof typeof PRIORITY_STYLES;
  const p = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  const effort = action.effort as keyof typeof EFFORT_STYLES;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-opacity duration-200 ${action.done ? "opacity-50" : ""}`}>
      <div className={`h-1 w-full ${p.bar}`} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <button
            onClick={() => onToggle(action.id)}
            className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${action.done ? "bg-teal-600 border-teal-600" : "border-gray-300 hover:border-teal-500"}`}
          >
            {action.done && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${p.badge}`}>{p.label}</span>
              {action.payer && <span className="text-xs text-gray-400">{action.payer}</span>}
              {action.category && <span className="text-xs">{CATEGORY_ICONS[action.category] || "📌"}</span>}
              {action.effort && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${EFFORT_STYLES[effort] || EFFORT_STYLES.medium}`}>
                  {action.effort} fix
                </span>
              )}
            </div>
            <h3 className={`font-semibold text-gray-900 leading-snug mb-2 ${action.done ? "line-through text-gray-400" : ""}`}>
              {action.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">{action.description}</p>
            <div className="flex items-center gap-6">
              {action.claimsAffected && (
                <div>
                  <p className="text-xs text-gray-400">Claims affected</p>
                  <p className="text-sm font-semibold text-gray-800">{action.claimsAffected}</p>
                </div>
              )}
              {action.revenueAtRisk && (
                <div>
                  <p className="text-xs text-gray-400">Revenue at risk</p>
                  <p className="text-sm font-semibold text-amber-600">${Number(action.revenueAtRisk).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Action ID</p>
                <p className="text-sm font-mono text-gray-400">{action.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium">("all");
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
        .select("action_items")
        .eq("user_id", session.user.id)
        .single();

      if (data?.action_items && data.action_items.length > 0 && !error) {
        const mapped = data.action_items.map((item: any, i: number) => ({
          id: item.id || `ACT-${String(i + 1).padStart(3, "0")}`,
          priority: item.priority || "medium",
          title: item.title || "Action required",
          description: item.description || "",
          claimsAffected: item.claimsAffected || 0,
          revenueAtRisk: item.revenueAtRisk || 0,
          payer: item.payer || "",
          category: item.category || "billing",
          effort: item.effort || "medium",
          done: false,
        }));
        setActions(mapped);
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }

      setLoading(false);
    });
  }, [router]);

  const toggleDone = (id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
  };

  const filtered = actions.filter(a => filter === "all" || a.priority === filter);
  const totalRevenue = actions.reduce((s, a) => s + (Number(a.revenueAtRisk) || 0), 0);
  const doneCount = actions.filter(a => a.done).length;
  const criticalCount = actions.filter(a => a.priority === "critical" && !a.done).length;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading actions...</p>
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
            <h1 className="text-lg font-bold text-gray-900">Action Items</h1>
            <p className="text-xs text-gray-400">
              {doneCount}/{actions.length} completed · ${totalRevenue.toLocaleString()} recoverable
            </p>
          </div>
          <button
            onClick={() => router.push("/#upload")}
            className="bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
          >
            Upload New CSV
          </button>
        </header>

        <main className="p-8">
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 mb-6">
              No action items yet.{" "}
              <button onClick={() => router.push("/#upload")} className="underline font-medium">
                Upload your CSV
              </button>{" "}
              to get AI-generated actions from your real denied claims.
            </div>
          )}

          {!isDemo && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Open Actions", value: actions.filter(a => !a.done).length, color: "text-gray-800" },
                  { label: "Critical", value: criticalCount, color: "text-red-600" },
                  { label: "Revenue Recoverable", value: `$${totalRevenue.toLocaleString()}`, color: "text-amber-600" },
                  { label: "Completed", value: `${doneCount}/${actions.length}`, color: "text-teal-600" },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-5">
                <span className="text-sm text-gray-500">Filter:</span>
                {(["all", "critical", "high", "medium"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-teal-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filtered.length > 0 ? (
                  filtered.map(action => (
                    <ActionCard key={action.id} action={action} onToggle={toggleDone} />
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No actions found for this filter.
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-6 text-center">
                Actions generated by Claude AI based on your uploaded claims data.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}