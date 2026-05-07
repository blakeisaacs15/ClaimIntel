"use client";

import { useRouter } from "next/navigation";

interface RiskItem {
  id: string;
  title: string;
  detail: string;
  payer?: string;
  procedure?: string;
  revenueAtRisk: number;
  urgency: "critical" | "high" | "medium";
  recommendation: string;
  daysOut: number;
}

const UPCOMING_RISKS: RiskItem[] = [
  {
    id: "RSK-001",
    title: "5 crown appointments scheduled without pre-authorization",
    detail: "Delta Dental requires prior auth for all crowns over $500. These will be auto-denied if submitted without it.",
    payer: "Delta Dental",
    procedure: "D2740",
    revenueAtRisk: 6200,
    urgency: "critical",
    recommendation: "Call Delta Dental to obtain pre-auth before appointment dates.",
    daysOut: 2,
  },
  {
    id: "RSK-002",
    title: "3 hygiene visits may exceed frequency limits",
    detail: "Cigna allows 2 cleanings per calendar year. These patients already have 1 cleaning submitted this year.",
    payer: "Cigna",
    procedure: "D1110",
    revenueAtRisk: 378,
    urgency: "high",
    recommendation: "Verify patient benefit history before submitting. Consider medical necessity documentation.",
    daysOut: 4,
  },
  {
    id: "RSK-003",
    title: "2 patients missing coordination of benefits info",
    detail: "Guardian requires COB verification when patients have dual coverage. Claims will be held without it.",
    payer: "Guardian",
    revenueAtRisk: 890,
    urgency: "high",
    recommendation: "Contact patients to confirm primary vs secondary insurance before their appointment.",
    daysOut: 5,
  },
  {
    id: "RSK-004",
    title: "1 implant case needs documentation review",
    detail: "Aetna requires bone graft documentation and radiographic evidence for implant coverage. Missing from chart.",
    payer: "Aetna",
    procedure: "D6010",
    revenueAtRisk: 2400,
    urgency: "medium",
    recommendation: "Attach pre-op X-rays and bone graft notes before submitting the claim.",
    daysOut: 7,
  },
];

const URGENCY_STYLES = {
  critical: {
    border: "border-l-red-500",
    badge: "bg-red-100 text-red-700",
    label: "Critical",
    dot: "bg-red-500",
  },
  high: {
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-700",
    label: "High",
    dot: "bg-amber-500",
  },
  medium: {
    border: "border-l-blue-400",
    badge: "bg-blue-100 text-blue-700",
    label: "Medium",
    dot: "bg-blue-400",
  },
};

export default function UpcomingRisk() {
  const router = useRouter();
  const totalAtRisk = UPCOMING_RISKS.reduce((s, r) => s + r.revenueAtRisk, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Risk — Next 7 Days</h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {UPCOMING_RISKS.length} issues detected · ${totalAtRisk.toLocaleString()} at risk before submission
          </p>
        </div>
        <span className="text-xs bg-red-50 text-red-600 font-semibold px-3 py-1 rounded-full border border-red-100">
          Pre-submission
        </span>
      </div>

      {/* Risk items */}
      <div className="divide-y divide-gray-50">
        {UPCOMING_RISKS.map((risk) => {
          const s = URGENCY_STYLES[risk.urgency];
          return (
            <div
              key={risk.id}
              className={`px-6 py-4 border-l-4 ${s.border} hover:bg-gray-50 transition-colors`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${s.badge}`}>
                      {s.label}
                    </span>
                    {risk.payer && (
                      <span className="text-xs text-gray-400">{risk.payer}</span>
                    )}
                    {risk.procedure && (
                      <span className="text-xs font-mono text-gray-400">{risk.procedure}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      In {risk.daysOut} day{risk.daysOut !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 mb-1">{risk.title}</p>
                  <p className="text-xs text-gray-500 mb-2">{risk.detail}</p>

                  <div className="flex items-center gap-1 text-xs text-teal-700 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {risk.recommendation}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">At risk</p>
                    <p className="text-sm font-bold text-amber-600">${risk.revenueAtRisk.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard/actions")}
                    className="text-xs bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
                  >
                    Prevent This →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Pre-submission risk detection · Updated daily based on your schedule
        </p>
      </div>
    </div>
  );
}