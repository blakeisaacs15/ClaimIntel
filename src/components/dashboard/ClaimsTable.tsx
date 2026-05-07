const claims = [
  { id: "CLM-1042", patient: "Sarah Johnson", date: "Jan 15, 2024", payer: "Delta Dental", procedure: "D2740", amount: 1250, reason: "Missing Authorization", status: "pending" },
  { id: "CLM-1041", patient: "Michael Chen", date: "Jan 14, 2024", payer: "Cigna", procedure: "D6010", amount: 3200, reason: "Frequency Limitation", status: "appealed" },
  { id: "CLM-1039", patient: "Emily Rodriguez", date: "Jan 13, 2024", payer: "Aetna", procedure: "D4341", amount: 285, reason: "Missing Documentation", status: "resolved" },
  { id: "CLM-1038", patient: "Robert Kim", date: "Jan 12, 2024", payer: "MetLife", procedure: "D2950", amount: 485, reason: "Duplicate Claim", status: "resolved" },
  { id: "CLM-1036", patient: "Amanda Foster", date: "Jan 11, 2024", payer: "Guardian", procedure: "D7210", amount: 875, reason: "Not a Covered Benefit", status: "pending" },
  { id: "CLM-1035", patient: "David Thompson", date: "Jan 10, 2024", payer: "United", procedure: "D0330", amount: 195, reason: "Missing Authorization", status: "appealed" },
  { id: "CLM-1033", patient: "Lisa Martinez", date: "Jan 9, 2024", payer: "Delta Dental", procedure: "D2391", amount: 225, reason: "Incorrect Tooth #", status: "resolved" },
  { id: "CLM-1031", patient: "James Wilson", date: "Jan 8, 2024", payer: "Cigna", procedure: "D4910", amount: 155, reason: "Frequency Limitation", status: "pending" },
];

const statusConfig = {
  pending: { label: "Pending", classes: "bg-amber-100 text-amber-700" },
  appealed: { label: "In Appeal", classes: "bg-blue-100 text-blue-700" },
  resolved: { label: "Resolved", classes: "bg-green-100 text-green-700" },
};

export default function ClaimsTable() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">Recent Denied Claims</h3>
          <p className="text-xs text-gray-400 mt-0.5">89 total denials this period</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-300 transition-colors">
            Export CSV
          </button>
          <button className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
            View all →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {["Claim ID", "Patient", "Date", "Payer", "Procedure", "Amount", "Denial Reason", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {claims.map((claim) => {
              const status = statusConfig[claim.status as keyof typeof statusConfig];
              return (
                <tr key={claim.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-brand-700">
                    {claim.id}
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {claim.patient}
                  </td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{claim.date}</td>
                  <td className="px-5 py-4 text-gray-700 whitespace-nowrap">{claim.payer}</td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {claim.procedure}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900 whitespace-nowrap">
                    ${claim.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{claim.reason}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${status.classes}`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
