"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

interface Claim {
  id?: string;
  claim_id?: string;
  patient?: string;
  payer?: string;
  procedure_code?: string;
  amount?: number | string;
  denial_reason?: string;
  date_of_service?: string;
  date?: string;
  reason?: string;
}

interface AppealModalProps {
  claim: Claim;
  onClose: () => void;
}

export default function AppealModal({ claim, onClose }: AppealModalProps) {
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLetter("");

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;

      const res = await fetch("/api/generate-appeal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ claim }),
      });

      if (cancelled) return;
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setLetter(data.letter ?? "");
        logActivity("generate_appeal", {
          claim_id: claim.claim_id ?? claim.id,
          payer: claim.payer,
          procedure: claim.procedure_code,
        });
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) { setError("Failed to generate appeal letter. Please try again."); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [claim]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "letter" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 25;
    const maxWidth = pageW - margin * 2;
    const lineH = 5.5;
    let y = margin;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const paragraphs = letter.split(/\n\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      const lines = doc.splitTextToSize(trimmed, maxWidth);
      const blockH = lines.length * lineH;

      if (y + blockH > pageH - margin) {
        doc.addPage();
        y = margin;
      }

      doc.text(lines, margin, y);
      y += blockH + 4;
    }

    const patientName = (claim.patient ?? "patient").replace(/\s+/g, "-");
    const claimId = claim.claim_id ?? claim.id ?? "claim";
    doc.save(`appeal-${patientName}-${claimId}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Appeal Letter</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {claim.patient} &middot; {claim.procedure_code ?? "—"} &middot; {claim.payer}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-5 gap-4 min-h-0">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Generating appeal letter...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-red-600 font-medium">{error}</p>
                <button
                  onClick={() => { setError(null); setLoading(true); }}
                  className="mt-3 text-sm text-teal-600 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && letter && (
            <textarea
              ref={textareaRef}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              className="flex-1 min-h-0 w-full text-sm font-mono text-gray-800 leading-relaxed border border-gray-200 rounded-xl px-5 py-4 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        {!loading && !error && letter && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">Edit directly before downloading or sending.</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-teal-700 px-4 py-2 rounded-lg hover:bg-teal-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
