const denialReasons = [
  { label: "Missing Authorization", count: 31, pct: 35 },
  { label: "Frequency Limitation", count: 24, pct: 27 },
  { label: "Missing Documentation", count: 18, pct: 20 },
  { label: "Not a Covered Benefit", count: 9, pct: 10 },
  { label: "Duplicate Claim", count: 7, pct: 8 },
];

const topPayers = [
  { name: "Delta Dental", denied: 28, total: 312, rate: 9.0 },
  { name: "Cigna", denied: 21, total: 198, rate: 10.6 },
  { name: "Aetna", denied: 17, total: 205, rate: 8.3 },
  { name: "MetLife", denied: 14, total: 287, rate: 4.9 },
  { name: "Guardian", denied: 9, total: 245, rate: 3.7 },
];

export default function DenialChart() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Denial Reasons */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Denial Reasons</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 30 days · 89 denials</p>
          </div>
          <button className="text-xs text-brand-600 font-medium hover:text-brand-700 transition-colors">
            View all →
          </button>
        </div>

        <div className="space-y-4">
          {denialReasons.map((reason) => (
            <div key={reason.label}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-gray-700">{reason.label}</span>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-gray-400 text-xs">{reason.count} claims</span>
                  <span className="font-semibold text-gray-900 w-8 text-right">{reason.pct}%</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full transition-all duration-500"
                  style={{ width: `${reason.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Payers */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900">Denial Rate by Payer</h3>
          <p className="text-xs text-gray-400 mt-0.5">Ranked by denial rate</p>
        </div>

        <div className="space-y-3">
          {topPayers.map((payer, index) => (
            <div
              key={payer.name}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{payer.name}</p>
                <p className="text-xs text-gray-400">
                  {payer.denied} / {payer.total} claims
                </p>
              </div>
              <span
                className={[
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  payer.rate > 9
                    ? "bg-red-100 text-red-700"
                    : payer.rate > 6
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700",
                ].join(" ")}
              >
                {payer.rate}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
