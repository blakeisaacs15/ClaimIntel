"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Provider {
  id: string;
  full_name: string;
  role: string;
  color: string;
}

interface NewClaim {
  id: string;
  claim_id: string;
  patient: string;
  payer: string;
  procedure_code: string;
  amount: number;
  denial_reason: string;
  date_of_service: string;
  rendering_provider: string | null;
  source_file: string;
  user_id: string;
}

interface NewClaimModalProps {
  onClose: () => void;
  onSaved: (claim: NewClaim) => void;
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";

export default function NewClaimModal({ onClose, onSaved }: NewClaimModalProps) {
  const [patient, setPatient] = useState("");
  const [payer, setPayer] = useState("");
  const [procedureCode, setProcedureCode] = useState("");
  const [dateOfService, setDateOfService] = useState("");
  const [amount, setAmount] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from("providers")
        .select("id,full_name,role,color")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      setProviders(data ?? []);
    });
  }, []);

  const handleSave = async () => {
    if (!patient.trim() || !payer.trim()) {
      setError("Patient name and payer are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const claimId = `CLM-M${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const selectedProvider = providers.find(p => p.id === selectedProviderId);

    const { data, error: insertError } = await supabase
      .from("claims")
      .insert({
        user_id: session.user.id,
        claim_id: claimId,
        patient: patient.trim(),
        payer: payer.trim(),
        procedure_code: procedureCode.trim() || null,
        amount: parseFloat(amount.replace(/[$,]/g, "")) || 0,
        denial_reason: denialReason.trim() || null,
        date_of_service: dateOfService || null,
        rendering_provider: selectedProvider?.full_name ?? null,
        source_file: "manual",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    onSaved(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Claim Manually</h2>
            <p className="text-xs text-gray-400 mt-0.5">Enter claim details to add it to your claims list.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Patient Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={patient}
                onChange={e => setPatient(e.target.value)}
                placeholder="Jane Doe"
                className={inputCls}
                autoFocus
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Payer / Insurance <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={payer}
                onChange={e => setPayer(e.target.value)}
                placeholder="Delta Dental"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Procedure Code(s)</label>
              <input
                type="text"
                value={procedureCode}
                onChange={e => setProcedureCode(e.target.value)}
                placeholder="D4341, D4342"
                className={`${inputCls} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date of Service</label>
              <input
                type="date"
                value={dateOfService}
                onChange={e => setDateOfService(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Billed Amount</label>
              <input
                type="text"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="$0.00"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rendering Provider</label>
              {providers.length > 0 ? (
                <select
                  value={selectedProviderId}
                  onChange={e => setSelectedProviderId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Unassigned —</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} · {p.role}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedProviderId}
                  onChange={e => setSelectedProviderId(e.target.value)}
                  placeholder="Provider name (optional)"
                  className={inputCls}
                />
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Denial Reason</label>
              <textarea
                value={denialReason}
                onChange={e => setDenialReason(e.target.value)}
                placeholder="e.g. Frequency limitation — D4341 not covered within 24 months"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !patient.trim() || !payer.trim()}
            className="bg-teal-700 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}
