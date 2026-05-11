import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

const releases = [
  {
    version: "1.5",
    date: "May 2025",
    badge: "Latest",
    badgeCls: "bg-teal-50 text-teal-700 ring-teal-200",
    items: [
      { type: "new", text: "PWA support — install ClaimIntel as a native app on desktop and mobile" },
      { type: "new", text: "Offline page with reconnect prompt when network is unavailable" },
      { type: "new", text: "Install App button in the dashboard header (Chrome / Edge)" },
    ],
  },
  {
    version: "1.4",
    date: "May 2025",
    badge: null,
    badgeCls: "",
    items: [
      { type: "new", text: "Claim Number field on Add / Edit Claim — enter the actual EOB claim ID" },
      { type: "new", text: "Claim Status dropdown (Denied, Pending, Approved, On Hold) with Denied as default" },
      { type: "new", text: "Status column in All Claims table with color-coded badges" },
      { type: "improved", text: "Edit Claim modal pre-populates Claim Number and Status from the existing record" },
    ],
  },
  {
    version: "1.3",
    date: "May 2025",
    badge: null,
    badgeCls: "",
    items: [
      { type: "improved", text: "Sidebar refreshed — slate-900 background, brighter text, hover highlights" },
      { type: "improved", text: "Main content area uses off-white (gray-50) background across all pages" },
      { type: "improved", text: "Cards upgraded with visible shadows and stronger borders throughout" },
      { type: "improved", text: "Data tables sharpened — crisper headers, row dividers, and column spacing" },
    ],
  },
  {
    version: "1.2",
    date: "April 2025",
    badge: null,
    badgeCls: "",
    items: [
      { type: "new", text: "Manual claim entry — New Claim button on All Claims page" },
      { type: "new", text: "Edit and delete individual claims directly from the claims table" },
      { type: "new", text: "Providers feature — per-provider scorecards and Settings CRUD" },
      { type: "improved", text: "Rendering providers wired into appeal letter generator" },
    ],
  },
  {
    version: "1.1",
    date: "April 2025",
    badge: null,
    badgeCls: "",
    items: [
      { type: "new", text: "AI-powered appeal letter generator per denied claim" },
      { type: "new", text: "Payers page with denial rate benchmarks vs. national averages" },
      { type: "new", text: "Analytics dashboard with denial trends and payer breakdowns" },
      { type: "new", text: "Actions page with prioritized items ranked by revenue at risk" },
    ],
  },
  {
    version: "1.0",
    date: "March 2025",
    badge: null,
    badgeCls: "",
    items: [
      { type: "new", text: "CSV upload and AI-powered denial analysis" },
      { type: "new", text: "Overview dashboard with stats, denial reasons, and payer breakdown" },
      { type: "new", text: "Hold Claims integration with Open Dental" },
      { type: "new", text: "User authentication — sign up, sign in, password reset" },
    ],
  },
];

const typeCfg = {
  new:      { label: "New",      cls: "bg-teal-50 text-teal-700 ring-teal-200" },
  improved: { label: "Improved", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  fix:      { label: "Fix",      cls: "bg-amber-50 text-amber-700 ring-amber-200" },
};

export default function ChangelogPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">What&apos;s New</h1>
            <p className="text-xs text-gray-400">ClaimIntel release history</p>
          </div>
        </header>

        <main className="p-8 max-w-2xl space-y-8">
          {releases.map((release) => (
            <div key={release.version} className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-base font-bold text-gray-900">v{release.version}</span>
                {release.badge && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ring-1 ${release.badgeCls}`}>
                    {release.badge}
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">{release.date}</span>
              </div>
              <ul className="space-y-2.5">
                {release.items.map((item, i) => {
                  const t = typeCfg[item.type as keyof typeof typeCfg] ?? typeCfg.new;
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ring-1 flex-shrink-0 ${t.cls}`}>
                        {t.label}
                      </span>
                      <span className="text-sm text-gray-700">{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
