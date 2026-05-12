"use client";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const LOADING_STEPS = [
  { label: "Reading your claims data...", duration: 1500 },
  { label: "Identifying denial patterns...", duration: 2000 },
  { label: "Analyzing payer behavior...", duration: 2000 },
  { label: "Calculating revenue at risk...", duration: 1500 },
  { label: "Generating AI insights...", duration: 2000 },
];

function LoadingScreen({ current, total }: { current: number; total: number }) {
  const [currentStep, setCurrentStep] = useState(0);

  useCallback(() => {
    let step = 0;
    const advance = () => {
      if (step < LOADING_STEPS.length - 1) {
        step++;
        setCurrentStep(step);
        setTimeout(advance, LOADING_STEPS[step].duration);
      }
    };
    setTimeout(advance, LOADING_STEPS[0].duration);
  }, [])();

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      <div className="max-w-md w-full px-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">ClaimIntel</span>
        </div>

        {total > 1 && (
          <p className="text-sm text-gray-400 mb-4">Analyzing file {current} of {total}</p>
        )}

        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
          <div className="absolute inset-0 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Your Claims</h2>
        <p className="text-teal-600 font-medium mb-8 h-6 transition-all duration-300">
          {LOADING_STEPS[currentStep].label}
        </p>

        <div className="space-y-3 text-left">
          {LOADING_STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                i < currentStep ? "bg-teal-600" : i === currentStep ? "border-2 border-teal-600 bg-white" : "border-2 border-gray-200 bg-white"
              }`}>
                {i < currentStep && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {i === currentStep && <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />}
              </div>
              <span className={`text-sm transition-all duration-300 ${
                i < currentStep ? "text-gray-400 line-through" : i === currentStep ? "text-gray-900 font-medium" : "text-gray-300"
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-10">This usually takes 5–10 seconds</p>
      </div>
    </div>
  );
}

export default function UploadSection() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addFiles = (incoming: FileList | File[]) => {
    const csvFiles = Array.from(incoming).filter(f => f.name.endsWith(".csv"));
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const dupes: string[] = [];
      const newFiles = csvFiles.filter(f => {
        if (existingNames.has(f.name)) {
          dupes.push(f.name);
          return false;
        }
        return true;
      });
      if (dupes.length > 0) setDuplicates(dupes);
      return [...prev, ...newFiles];
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  }, []);

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setDuplicates(prev => prev.filter(d => d !== name));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/sign-in"); return; }

      const userId = session.user.id;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingIndex(i + 1);

        // Check if already uploaded
        const { data: existing } = await supabase
          .from("analyses")
          .select("*")
          .eq("user_id", userId)
          .single();

        const uploadedFiles: string[] = existing?.uploaded_files || [];
        if (uploadedFiles.includes(file.name)) continue;

        const csvData = await file.text();
        const response = await fetch("/api/analyze-claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvData }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Analysis failed. Please check your CSV format and try again.");
        }

        const newData = result.analysis;
        const newClaims = result.analysis.claims || [];

        if (existing) {
          newData.totalDenied = (existing.total_denied || 0) + (newData.totalDenied || 0);
          newData.revenueAtRisk = (existing.revenue_at_risk || 0) + (newData.revenueAtRisk || 0);

          const reasonMap: Record<string, any> = {};
          [...(existing.top_denial_reasons || []), ...(newData.topDenialReasons || [])].forEach((r: any) => {
            if (reasonMap[r.reason]) reasonMap[r.reason].count += r.count;
            else reasonMap[r.reason] = { ...r };
          });
          const mergedReasons = Object.values(reasonMap);
          const totalCount = mergedReasons.reduce((sum, r) => sum + r.count, 0);
          mergedReasons.forEach(r => r.percentage = Math.round((r.count / totalCount) * 100));
          newData.topDenialReasons = mergedReasons.sort((a: any, b: any) => b.count - a.count);

          const payerMap: Record<string, any> = {};
          [...(existing.payer_breakdown || []), ...(newData.payerBreakdown || [])].forEach((p: any) => {
            if (payerMap[p.payer]) payerMap[p.payer].denialCount += p.denialCount;
            else payerMap[p.payer] = { ...p };
          });
          newData.payerBreakdown = Object.values(payerMap).sort((a: any, b: any) => b.denialCount - a.denialCount);
          newData.actionItems = [...(existing.action_items || []), ...(newData.actionItems || [])];

          const { error: updateError } = await supabase.from("analyses").update({
            total_denied: newData.totalDenied,
            revenue_at_risk: newData.revenueAtRisk,
            top_denial_reasons: newData.topDenialReasons,
            payer_breakdown: newData.payerBreakdown,
            action_items: newData.actionItems,
            insight: newData.insight,
            uploaded_files: [...uploadedFiles, file.name],
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId);
          if (updateError) throw new Error(`Failed to save analysis: ${updateError.message}`);

        } else {
          const { error: insertError } = await supabase.from("analyses").insert({
            user_id: userId,
            total_denied: newData.totalDenied,
            revenue_at_risk: newData.revenueAtRisk,
            top_denial_reasons: newData.topDenialReasons,
            payer_breakdown: newData.payerBreakdown,
            action_items: newData.actionItems,
            insight: newData.insight,
            uploaded_files: [file.name],
          });
          if (insertError) throw new Error(`Failed to save analysis: ${insertError.message}`);
        }

        if (newClaims.length > 0) {
          const { error: claimsError } = await supabase.from("claims").insert(
            newClaims.map((c: any) => ({
              user_id: userId,
              claim_id: c.id,
              patient: c.patient,
              payer: c.payer,
              procedure_code: c.procedure,
              amount: c.amount,
              denial_reason: c.reason,
              date_of_service: c.date,
              rendering_provider: c.provider || null,
              source_file: file.name,
            }))
          );
          if (claimsError) throw new Error(`Failed to save claims: ${claimsError.message}`);
        }
      }

      logActivity("upload_claims", { fileCount: files.length });
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <>
      {isProcessing && <LoadingScreen current={processingIndex} total={files.length} />}
      <section id="upload" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
              Get Started Instantly
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Analyze Your Denied Claims
            </h2>
            <p className="text-lg text-gray-500">
              Upload one or more CSV exports and get instant insights into denial patterns — no setup required.
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => files.length === 0 && fileInputRef.current?.click()}
            className={[
              "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200",
              isDragging ? "border-teal-500 bg-teal-50 scale-[1.01]"
                : files.length > 0 ? "border-teal-600 bg-teal-50/30 cursor-default"
                : "border-gray-300 bg-white hover:border-teal-400 hover:bg-gray-50/80 cursor-pointer",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {files.length === 0 ? (
              <div className="space-y-5">
                <div className="mx-auto w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    Drop your CSV files here, or{" "}
                    <span className="text-teal-600 hover:text-teal-700 underline underline-offset-2">browse</span>
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Upload multiple months at once — Dentrix, Eaglesoft, Open Dental supported
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400">
                  {["Multiple CSVs", "Up to 50,000 claims", "End-to-end encrypted"].map((label) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-700">{files.length} file{files.length > 1 ? "s" : ""} ready to analyze</p>

                <div className="space-y-2 text-left">
                  {files.map(f => (
                    <div key={f.name} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{f.name}</p>
                          <p className="text-xs text-gray-400">{formatSize(f.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                        className="text-gray-300 hover:text-red-500 transition-colors ml-4"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {duplicates.length > 0 && (
                  <p className="text-xs text-amber-600">
                    Skipped duplicate{duplicates.length > 1 ? "s" : ""}: {duplicates.join(", ")}
                  </p>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2 transition-colors"
                  >
                    + Add more files
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 bg-teal-700 text-white font-semibold px-8 py-3 rounded-xl hover:bg-teal-800 transition-colors disabled:opacity-70 shadow-sm"
                  >
                    Analyze {files.length > 1 ? `${files.length} Files` : "Claims"} →
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Your data is encrypted in transit and never shared with third parties. HIPAA compliant.
          </p>
        </div>
      </section>
    </>
  );
}