"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { supabase } from "@/lib/supabase";
import { ACTION_LABELS } from "@/lib/activity";

interface ActivityEntry {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface Provider {
  id: string;
  full_name: string;
  npi: string | null;
  role: string;
  color: string;
  created_at: string;
}

const PROVIDER_COLORS = [
  '#0d9488', '#2563eb', '#7c3aed', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#db2777',
];

const PROVIDER_ROLES = ['Doctor', 'Hygienist', 'Front Desk', 'Biller'];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";
const primaryBtn =
  "bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

async function upsertSettings(payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const { data: existing } = await supabase
    .from("user_settings").select("user_id").eq("user_id", session.user.id).single();
  return existing
    ? supabase.from("user_settings").update(payload).eq("user_id", session.user.id)
    : supabase.from("user_settings").insert({ user_id: session.user.id, ...payload });
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  // Practice Profile
  const [practiceName, setPracticeName] = useState("");
  const [practiceAddress, setPracticeAddress] = useState("");
  const [practiceCityStateZip, setPracticeCityStateZip] = useState("");
  const [practicePhone, setPracticePhone] = useState("");
  const [providerName, setProviderName] = useState("");
  const [npiNumber, setNpiNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<"idle" | "success" | "error">("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  // Account — display name + email
  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState<"idle" | "success" | "error">("idle");
  const [accountMsg, setAccountMsg] = useState<string | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "success" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // OD Key
  const [odKey, setOdKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<"idle" | "success" | "error">("idle");
  const [keyError, setKeyError] = useState<string | null>(null);

  // Team & Activity
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  // Providers
  const [providers, setProviders] = useState<Provider[]>([]);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderNpi, setNewProviderNpi] = useState('');
  const [newProviderRole, setNewProviderRole] = useState('Doctor');
  const [newProviderColor, setNewProviderColor] = useState(PROVIDER_COLORS[0]);
  const [addingProvider, setAddingProvider] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNpi, setEditNpi] = useState('');
  const [editRole, setEditRole] = useState('Doctor');
  const [editColor, setEditColor] = useState(PROVIDER_COLORS[0]);
  const [savingEdit, setSavingEdit] = useState(false);

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/sign-in"); return; }

      setUserEmail(session.user.email ?? "");
      setLastSignIn((session.user as any).last_sign_in_at ?? null);

      const { data: settings } = await supabase
        .from("user_settings").select("*").eq("user_id", session.user.id).single();

      if (settings) {
        setSavedKey(settings.od_customer_key ?? null);
        setDisplayName(settings.display_name ?? "");
        setPracticeName(settings.practice_name ?? "");
        setPracticeAddress(settings.practice_address ?? "");
        setPracticeCityStateZip(settings.practice_city_state_zip ?? "");
        setPracticePhone(settings.practice_phone ?? "");
        setProviderName(settings.provider_name ?? "");
        setNpiNumber(settings.npi_number ?? "");
      }

      const { data: log } = await supabase
        .from("activity_log").select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setActivityLog(log ?? []);

      const { data: provs } = await supabase
        .from("providers")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      setProviders(provs ?? []);
      setLoading(false);
    });
  }, [router]);

  // ── save handlers ─────────────────────────────────────────────────────────

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileStatus("idle");
    setProfileError(null);
    try {
      const { error } = await upsertSettings({
        practice_name: practiceName.trim(),
        practice_address: practiceAddress.trim(),
        practice_city_state_zip: practiceCityStateZip.trim(),
        practice_phone: practicePhone.trim(),
        provider_name: providerName.trim(),
        npi_number: npiNumber.trim(),
      });
      setProfileStatus(error ? "error" : "success");
      if (error) setProfileError(error.message);
    } catch (e: any) {
      setProfileStatus("error");
      setProfileError(e.message);
    }
    setSavingProfile(false);
  };

  const saveAccount = async () => {
    setSavingAccount(true);
    setAccountStatus("idle");
    setAccountMsg(null);
    try {
      const { error: settingsErr } = await upsertSettings({ display_name: displayName.trim() });

      if (newEmail.trim() && newEmail.trim() !== userEmail) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail.trim() });
        if (emailErr) {
          setAccountMsg(emailErr.message);
          setAccountStatus("error");
          setSavingAccount(false);
          return;
        }
        setAccountMsg(`Confirmation sent to ${newEmail.trim()}. Email updates after you confirm.`);
        setNewEmail("");
        setAccountStatus("success");
        setSavingAccount(false);
        return;
      }

      setAccountStatus(settingsErr ? "error" : "success");
      if (settingsErr) setAccountMsg(settingsErr.message);
    } catch (e: any) {
      setAccountStatus("error");
      setAccountMsg(e.message);
    }
    setSavingAccount(false);
  };

  const changePassword = async () => {
    setPasswordError(null);
    if (!newPassword) return;
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters."); return; }
    setSavingPassword(true);
    setPasswordStatus("idle");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      setPasswordStatus("error");
    } else {
      setPasswordStatus("success");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  const saveKey = async () => {
    if (!odKey.trim()) return;
    setSavingKey(true);
    setKeyStatus("idle");
    setKeyError(null);
    try {
      const { error } = await upsertSettings({ od_customer_key: odKey.trim() });
      if (error) {
        setKeyError(error.message);
        setKeyStatus("error");
      } else {
        setSavedKey(odKey.trim());
        setOdKey("");
        setKeyStatus("success");
      }
    } catch (e: any) {
      setKeyError(e.message);
      setKeyStatus("error");
    }
    setSavingKey(false);
  };

  const addProvider = async () => {
    if (!newProviderName.trim()) return;
    setAddingProvider(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAddingProvider(false); return; }
    const { data, error } = await supabase.from("providers").insert({
      user_id: session.user.id,
      full_name: newProviderName.trim(),
      npi: newProviderNpi.trim() || null,
      role: newProviderRole,
      color: newProviderColor,
    }).select().single();
    if (!error && data) {
      setProviders(prev => [...prev, data]);
      setNewProviderName('');
      setNewProviderNpi('');
      setNewProviderRole('Doctor');
      setNewProviderColor(PROVIDER_COLORS[0]);
    }
    setAddingProvider(false);
  };

  const deleteProvider = async (id: string) => {
    await supabase.from("providers").delete().eq("id", id);
    setProviders(prev => prev.filter(p => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (p: Provider) => {
    setEditingId(p.id);
    setEditName(p.full_name);
    setEditNpi(p.npi ?? '');
    setEditRole(p.role);
    setEditColor(p.color);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase.from("providers").update({
      full_name: editName.trim(),
      npi: editNpi.trim() || null,
      role: editRole,
      color: editColor,
    }).eq("id", editingId);
    if (!error) {
      setProviders(prev => prev.map(p =>
        p.id === editingId
          ? { ...p, full_name: editName.trim(), npi: editNpi.trim() || null, role: editRole, color: editColor }
          : p
      ));
      setEditingId(null);
    }
    setSavingEdit(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const lastAction = activityLog[0] ?? null;

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Settings</h1>
            <p className="text-xs text-gray-400">Manage your practice profile, account, and integrations</p>
          </div>
        </header>

        <main className="p-8 max-w-2xl space-y-8">

          {/* ── 1. Practice Profile ──────────────────────────────────────────── */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Practice Profile</h2>
            <p className="text-xs text-gray-400 mb-5">
              Used as the letterhead in generated appeal letters and documents.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Practice Name</label>
                <input type="text" value={practiceName} onChange={e => setPracticeName(e.target.value)}
                  placeholder="Bright Smiles Dental" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider Name</label>
                <input type="text" value={providerName} onChange={e => setProviderName(e.target.value)}
                  placeholder="Jane Smith, DDS" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">NPI Number</label>
                <input type="text" value={npiNumber} onChange={e => setNpiNumber(e.target.value)}
                  placeholder="1234567890" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Street Address</label>
                <input type="text" value={practiceAddress} onChange={e => setPracticeAddress(e.target.value)}
                  placeholder="123 Main Street, Suite 100" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City, State ZIP</label>
                <input type="text" value={practiceCityStateZip} onChange={e => setPracticeCityStateZip(e.target.value)}
                  placeholder="Austin, TX 78701" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={practicePhone} onChange={e => setPracticePhone(e.target.value)}
                  placeholder="(512) 555-0100" className={inputCls} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button onClick={saveProfile} disabled={savingProfile} className={primaryBtn}>
                {savingProfile ? "Saving..." : "Save Practice Profile"}
              </button>
              {profileStatus === "success" && <span className="text-sm text-green-700">Saved.</span>}
              {profileStatus === "error" && <span className="text-sm text-red-600">{profileError ?? "Failed to save."}</span>}
            </div>
          </section>

          {/* ── 2. Account Settings ───────────────────────────────────────────── */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Account Settings</h2>
              <p className="text-xs text-gray-400">Update your display name, email, password, and integrations.</p>
            </div>

            {/* Display name + email */}
            <div className="space-y-4 pb-6 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
                <input type="text" value={displayName} onChange={e => { setDisplayName(e.target.value); setAccountStatus("idle"); }}
                  placeholder="Your name" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <p className="text-xs text-gray-400 mb-1.5">
                  Current: <span className="font-medium text-gray-600">{userEmail}</span>
                </p>
                <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setAccountStatus("idle"); }}
                  placeholder="Enter new email to update" className={inputCls} />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveAccount} disabled={savingAccount} className={primaryBtn}>
                  {savingAccount ? "Saving..." : "Save"}
                </button>
                {accountStatus === "success" && !accountMsg && <span className="text-sm text-green-700">Saved.</span>}
                {accountMsg && (
                  <span className={`text-sm ${accountStatus === "error" ? "text-red-600" : "text-green-700"}`}>
                    {accountMsg}
                  </span>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-4 pb-6 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setPasswordStatus("idle"); setPasswordError(null); }}
                    placeholder="Min. 8 characters" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setPasswordStatus("idle"); setPasswordError(null); }}
                    placeholder="Repeat new password" className={inputCls} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={changePassword} disabled={savingPassword || !newPassword} className={primaryBtn}>
                  {savingPassword ? "Updating..." : "Change Password"}
                </button>
                {passwordStatus === "success" && <span className="text-sm text-green-700">Password updated.</span>}
                {passwordError && <span className="text-sm text-red-600">{passwordError}</span>}
              </div>
            </div>

            {/* Open Dental Integration */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Open Dental Integration</h3>
              <p className="text-xs text-gray-400">
                Your API authorization token from Open Dental. Used to fetch live claim data for the Hold Claims page.
              </p>
              {savedKey && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-800">
                    Key saved &middot; <span className="font-mono">{savedKey.slice(0, 10)}&bull;&bull;&bull;</span>
                  </span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {savedKey ? "Replace API Token" : "API Token"}
                </label>
                <input type="password" value={odKey}
                  onChange={e => { setOdKey(e.target.value); setKeyStatus("idle"); }}
                  onKeyDown={e => e.key === "Enter" && saveKey()}
                  placeholder={savedKey ? "Enter new token to replace existing" : "ODFHIR YOUR_CUSTOMER_KEY"}
                  className={`${inputCls} font-mono`} />
                <p className="text-xs text-gray-400 mt-1.5">
                  Format: <span className="font-mono">ODFHIR YOUR_CUSTOMER_KEY</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={saveKey} disabled={!odKey.trim() || savingKey} className={primaryBtn}>
                  {savingKey ? "Saving..." : "Save Token"}
                </button>
                {keyStatus === "success" && <span className="text-sm text-green-700">Token saved.</span>}
                {keyStatus === "error" && <span className="text-sm text-red-600">{keyError ?? "Failed to save."}</span>}
              </div>
            </div>
          </section>

          {/* ── 3. Team & Activity Log ────────────────────────────────────────── */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Team &amp; Activity Log</h2>
              <p className="text-xs text-gray-400">Users on this account and their recent activity.</p>
            </div>

            {/* Team Members */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Team Members</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Name", "Email", "Last Login", "Last Action"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-2 pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3 pr-6 font-medium text-gray-900">
                        {displayName || userEmail.split("@")[0]}
                      </td>
                      <td className="py-3 pr-6 text-gray-500 text-xs">{userEmail}</td>
                      <td className="py-3 pr-6 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(lastSignIn)}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {lastAction ? (
                          <>
                            {ACTION_LABELS[lastAction.action] ?? lastAction.action}
                            <span className="text-gray-300 mx-1">·</span>
                            {timeAgo(lastAction.created_at)}
                          </>
                        ) : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity Log */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h3>
              {activityLog.length === 0 ? (
                <p className="text-sm text-gray-400">No activity recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Action", "Time"].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-2 pr-6">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {activityLog.map(entry => (
                        <tr key={entry.id}>
                          <td className="py-2.5 pr-6 text-gray-700">
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </td>
                          <td className="py-2.5 text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(entry.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* ── 4. Providers ──────────────────────────────────────────────────── */}
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Providers</h2>
              <p className="text-xs text-gray-400">
                Add your doctors and staff. Providers are matched to claims by name for scorecard analytics.
              </p>
            </div>

            {providers.length > 0 && (
              <div className="space-y-2">
                {providers.map(p => editingId === p.id ? (
                  <div key={p.id} className="border border-teal-200 bg-teal-50/30 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                          className={inputCls} autoFocus />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">NPI Number</label>
                        <input type="text" value={editNpi} onChange={e => setEditNpi(e.target.value)}
                          placeholder="optional" className={`${inputCls} font-mono`} />
                      </div>
                    </div>
                    <div className="flex items-end gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                        <select value={editRole} onChange={e => setEditRole(e.target.value)} className={inputCls}>
                          {PROVIDER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
                        <div className="flex items-center gap-1.5">
                          {PROVIDER_COLORS.map(c => (
                            <button key={c} onClick={() => setEditColor(c)}
                              className={`w-6 h-6 rounded-full transition-all ${editColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={saveEdit} disabled={savingEdit || !editName.trim()} className={primaryBtn}>
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={p.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium text-gray-900">{p.full_name}</span>
                      {p.npi && (
                        <span className="text-xs text-gray-400 font-mono">{p.npi}</span>
                      )}
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-medium">
                        {p.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(p)}
                        className="text-gray-300 hover:text-teal-600 transition-colors p-1"
                        title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteProvider(p.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add provider form */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Provider</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newProviderName}
                    onChange={e => setNewProviderName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">NPI Number</label>
                  <input
                    type="text"
                    value={newProviderNpi}
                    onChange={e => setNewProviderNpi(e.target.value)}
                    placeholder="1234567890 (optional)"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newProviderRole}
                    onChange={e => setNewProviderRole(e.target.value)}
                    className={inputCls}
                  >
                    {PROVIDER_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex items-center gap-1.5">
                    {PROVIDER_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewProviderColor(c)}
                        className={`w-6 h-6 rounded-full transition-all ${newProviderColor === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={addProvider}
                disabled={addingProvider || !newProviderName.trim()}
                className={primaryBtn}
              >
                {addingProvider ? 'Adding...' : '+ Add Provider'}
              </button>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
