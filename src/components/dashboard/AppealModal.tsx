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
  rendering_provider?: string;
}

interface Provider {
  id: string;
  full_name: string;
  npi: string | null;
  role: string;
  color: string;
}

interface AppealModalProps {
  claim: Claim;
  onClose: () => void;
}

const EXHIBIT_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function exhibitLabel(index: number) {
  return `Exhibit ${EXHIBIT_LABELS[index] ?? index + 1}`;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AppealModal({ claim, onClose }: AppealModalProps) {
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [lastGeneratedProviderId, setLastGeneratedProviderId] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      let defaultProvider: Provider | null = null;

      if (session) {
        const { data: provs } = await supabase
          .from("providers")
          .select("id,full_name,npi,role,color")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true });

        if (!cancelled && provs?.length) {
          setProviders(provs);
          const renderingName = claim.rendering_provider;
          const matched = renderingName
            ? provs.find((p: Provider) =>
                p.full_name.trim().toLowerCase() === renderingName.trim().toLowerCase()
              )
            : null;
          defaultProvider = matched ?? null;
          const defaultId = defaultProvider?.id ?? "";
          setSelectedProviderId(defaultId);
          setLastGeneratedProviderId(defaultId);
        }
      }

      if (cancelled) return;
      setLoading(true);
      setError(null);
      setLetter("");

      const claimPayload = defaultProvider
        ? { ...claim, providerOverride: { full_name: defaultProvider.full_name, npi: defaultProvider.npi } }
        : claim;

      const res = await fetch("/api/generate-appeal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ claim: claimPayload }),
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
    };

    init().catch(() => {
      if (!cancelled) {
        setError("Failed to generate appeal letter. Please try again.");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [claim]);

  const handleRegenerate = async () => {
    const prov = providers.find(p => p.id === selectedProviderId) ?? null;
    setLastGeneratedProviderId(selectedProviderId);
    setLoading(true);
    setError(null);
    setLetter("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const claimPayload = prov
        ? { ...claim, providerOverride: { full_name: prov.full_name, npi: prov.npi } }
        : claim;

      const res = await fetch("/api/generate-appeal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ claim: claimPayload }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setLetter(data.letter ?? "");
      }
    } catch {
      setError("Failed to regenerate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Attachments ───────────────────────────────────────────────────────────

  const addFiles = (incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter(f =>
      f.type === "image/jpeg" || f.type === "image/png" || f.type === "application/pdf"
    );
    setAttachments(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...accepted.filter(f => !existing.has(f.name + f.size))];
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // ── Copy ──────────────────────────────────────────────────────────────────

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

  // ── Download PDF ──────────────────────────────────────────────────────────

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
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

      for (const para of letter.split(/\n\n+/)) {
        const trimmed = para.trim();
        if (!trimmed) continue;
        const lines = doc.splitTextToSize(trimmed, maxWidth);
        const blockH = lines.length * lineH;
        if (y + blockH > pageH - margin) { doc.addPage(); y = margin; }
        doc.text(lines, margin, y);
        y += blockH + 4;
      }

      const exhibitOrder = attachments.map((f, i) => ({ file: f, index: i }));

      for (const { file, index } of exhibitOrder) {
        if (!file.type.startsWith("image/")) continue;
        doc.addPage();
        doc.setFillColor(245, 245, 245);
        doc.rect(0, 0, pageW, 16, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(exhibitLabel(index).toUpperCase(), margin, 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(file.name, margin + 32, 10);
        doc.setTextColor(0, 0, 0);
        const imgData = await fileToDataURL(file);
        const fmt = file.type === "image/png" ? "PNG" : "JPEG";
        const props = doc.getImageProperties(imgData);
        const maxW = pageW - margin * 2;
        const maxH = pageH - 20 - margin;
        const ratio = Math.min(maxW / props.width, maxH / props.height);
        const w = props.width * ratio;
        const h = props.height * ratio;
        doc.addImage(imgData, fmt, (pageW - w) / 2, 20, w, h);
      }

      const pdfAttachments = attachments.filter(f => f.type === "application/pdf");
      if (pdfAttachments.length === 0) {
        const patientName = (claim.patient ?? "patient").replace(/\s+/g, "-");
        const claimId = claim.claim_id ?? claim.id ?? "claim";
        doc.save(`appeal-${patientName}-${claimId}.pdf`);
        return;
      }

      const { PDFDocument, StandardFonts, rgb, grayscale } = await import("pdf-lib");
      const jsPDFBytes = doc.output("arraybuffer");
      const merged = await PDFDocument.load(jsPDFBytes);
      const font = await merged.embedFont(StandardFonts.HelveticaBold);
      const fontNormal = await merged.embedFont(StandardFonts.Helvetica);

      for (const { file, index } of exhibitOrder) {
        if (file.type !== "application/pdf") continue;
        const cover = merged.addPage([612, 792]);
        cover.drawRectangle({ x: 0, y: 756, width: 612, height: 36, color: grayscale(0.95) });
        cover.drawText(exhibitLabel(index).toUpperCase(), {
          x: 36, y: 766, size: 13, font, color: rgb(0.2, 0.2, 0.2),
        });
        cover.drawText(file.name, {
          x: 36, y: 746, size: 10, font: fontNormal, color: rgb(0.45, 0.45, 0.45),
        });
        const attachBytes = await file.arrayBuffer();
        const attachDoc = await PDFDocument.load(attachBytes);
        const copiedPages = await merged.copyPages(attachDoc, attachDoc.getPageIndices());
        copiedPages.forEach(p => merged.addPage(p));
      }

      const finalBytes = await merged.save();
      const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const patientName = (claim.patient ?? "patient").replace(/\s+/g, "-");
      const claimId = claim.claim_id ?? claim.id ?? "claim";
      a.href = url;
      a.download = `appeal-${patientName}-${claimId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  const providerChanged = selectedProviderId !== lastGeneratedProviderId;
  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Appeal Letter</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {claim.patient} &middot; {claim.procedure_code ?? "—"} &middot; {claim.payer}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Provider selector — shown when providers exist */}
        {providers.length > 0 && (
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedProvider?.color ?? "#9ca3af" }}
              />
              <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Signing provider</label>
              <select
                value={selectedProviderId}
                onChange={e => setSelectedProviderId(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">Practice default (from letterhead)</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} · {p.role}{p.npi ? ` · NPI ${p.npi}` : ""}
                  </option>
                ))}
              </select>
              {providerChanged && !loading && (
                <button
                  onClick={handleRegenerate}
                  className="text-xs font-semibold text-white bg-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
                >
                  Regenerate
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Generating appeal letter...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button
                onClick={handleRegenerate}
                className="text-sm text-teal-600 underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && letter && (
            <>
              {/* Letter textarea */}
              <textarea
                ref={textareaRef}
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                style={{ minHeight: "280px" }}
                className="w-full text-sm font-mono text-gray-800 leading-relaxed border border-gray-200 rounded-xl px-5 py-4 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                spellCheck={false}
              />

              {/* Attachment zone */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Attachments
                  <span className="ml-2 font-normal normal-case text-gray-400">X-rays and supporting documents — included as exhibits in the PDF</span>
                </p>

                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    "border-2 border-dashed rounded-xl px-5 py-4 text-center cursor-pointer transition-colors",
                    isDragging ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    multiple
                    className="hidden"
                    onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                  />
                  <p className="text-sm text-gray-500">
                    Drop files here or <span className="text-teal-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, PDF accepted</p>
                </div>

                {attachments.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {attachments.map((file, i) => (
                      <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                          {exhibitLabel(i)}
                        </span>
                        {file.type === "application/pdf" ? (
                          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        <span className="text-sm text-gray-800 flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatBytes(file.size)}</span>
                        <button
                          onClick={() => removeAttachment(i)}
                          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                          aria-label="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && letter && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <p className="text-xs text-gray-400">
              {attachments.length > 0
                ? `${attachments.length} exhibit${attachments.length > 1 ? "s" : ""} will be appended`
                : "Edit directly before downloading or sending."}
            </p>
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
                disabled={generating}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-teal-700 px-4 py-2 rounded-lg hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Building PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF{attachments.length > 0 ? ` (+${attachments.length})` : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
