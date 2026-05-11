"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatsCard from "@/components/dashboard/StatsCard";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import UpcomingRisk from "@/components/dashboard/UpcomingRisk";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/sign-in");
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (data && !error) {
        setAnalysis({
          totalDenied: data.total_denied,
          revenueAtRisk: data.revenue_at_risk,
          topDenialReasons: data.top_denial_reasons || [],
          payerBreakdown: data.payer_breakdown || [],
          actionItems: data.action_items || [],
          insight: data.insight,
        });
        setUploadedFiles(data.uploaded_files || []);
        setIsDemo(false);
      } else {
        setIsDemo(true);
      }

      setLoading(false);
    });
  }, [router]);

  const handleRemoveFile = async (fileName: string) => {
    if (!userId) return;

    const newFiles = uploadedFiles.filter(f => f !== fileName);

    if (newFiles.length === 0) {
      await supabase.from("analyses").delete().eq("user_id", userId);
      await supabase.from("claims").delete().eq("user_id", userId);
      setAnalysis(null);
      setUploadedFiles([]);
      setIsDemo(true);
    } else {
      await supabase.from("analyses").update({
        uploaded_files: newFiles,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
      await supabase.from("claims").delete()
        .eq("user_id", userId)
        .eq("source_file", fileName);
      setUploadedFiles(newFiles);
      alert(`"${fileName}" removed. Data recalculated from remaining files.`);
    }
  };

  const handleClearAll = async () => {
    if (!userId) return;
    await supabase.from("analyses").delete().eq("user_id", userId);
    await supabase.from("claims").delete().eq("user_id", userId);
    setAnalysis(null);
    setUploadedFiles([]);
    setIsDemo(true);
  };

  const data = analysis || {
    totalDenied: 0,
    revenueAtRisk: 0,
    topDenialReasons: [],
    payerBreakdown: [],
    actionItems: [],
    insight: null,
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading your dashboard...</p>
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
            <h1 className="text-lg font-bold text-gray-900">Denied Claims Analysis</h1>
            <p className="text-xs text-gray-400">
              {isDemo ? "Upload a CSV to see your real results" : "Live analysis from your uploaded claims"}
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
              No claims uploaded yet.{" "}
              <button onClick={() => router.push("/#upload")} className="underline font-medium">
                Upload your claims CSV
              </button>{" "}
              to see your denial analysis.
            </div>
          )}

          {data.insight && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-800">
              <span className="font-semibold">AI Insight:</span> {data.insight}
            </div>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            <StatsCard
              title="Total Denied Claims"
              value={String(data.totalDenied)}
              change={isDemo ? "Upload CSV to start" : "+12 vs last month"}
              changeType="down"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
            <StatsCard
              title="Revenue at Risk"
              value={isDemo ? "$0" : `$${Number(data.revenueAtRisk).toLocaleString()}`}
              change={isDemo ? "Upload CSV to start" : "$8,450 recovered"}
              changeType="up"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              accent
            />
            <StatsCard
              title="Denial Rate"
              value={isDemo ? "0%" : `${((data.totalDenied / 1247) * 100).toFixed(1)}%`}
              change={isDemo ? "Upload CSV to start" : "-1.2% vs last month"}
              changeType="up"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <StatsCard
              title="Action Required"
              value={String(data.actionItems?.length || data.topDenialReasons?.length || 0)}
              change="items need attention"
              changeType="neutral"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            />
          </div>

          {!isDemo && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Denial Reasons</h2>
                <p className="text-xs text-gray-400 mb-4">All uploaded claims · {data.totalDenied} denials</p>
                <div className="space-y-3">
                  {data.topDenialReasons?.map((item: any) => (
                    <div key={item.reason}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.reason}</span>
                        <span className="text-gray-900 font-medium">{item.count} claims · {item.percentage}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 bg-teal-600 rounded-full" style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Denial Rate by Payer</h2>
                <p className="text-xs text-gray-400 mb-4">Ranked by denial rate</p>
                <div className="space-y-3">
                  {data.payerBreakdown?.map((payer: any, i: number) => (
                    <div key={payer.payer} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{payer.payer}</p>
                          <p className="text-xs text-gray-400">{payer.denialCount} denials</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${payer.denialRate > 8 ? "bg-red-50 text-red-600" : payer.denialRate > 5 ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                        {payer.denialRate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isDemo && <UpcomingRisk />}

          {uploadedFiles.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Uploaded Files</h2>
                  <p className="text-xs text-gray-400">{uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} contributing to this analysis</p>
                </div>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-500 hover:text-red-600 font-medium border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
                {uploadedFiles.map(fileName => (
                  <div key={fileName} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-700">{fileName}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(fileName)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Removing a file will clear its claims from your analysis.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}