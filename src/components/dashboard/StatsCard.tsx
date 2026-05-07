interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: React.ReactNode;
  accent?: boolean;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType,
  icon,
  accent,
}: StatsCardProps) {
  const changeColor =
    changeType === "up"
      ? "text-red-500"
      : changeType === "down"
      ? "text-green-500"
      : "text-gray-400";

  const changeIcon =
    changeType === "up" ? (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    ) : changeType === "down" ? (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    ) : null;

  return (
    <div
      className={[
        "rounded-2xl p-5 border transition-shadow hover:shadow-md",
        accent
          ? "bg-brand-700 border-brand-600 text-white"
          : "bg-white border-gray-100",
      ].join(" ")}
    >
      <div className="flex items-start justify-between mb-4">
        <p className={`text-sm font-medium ${accent ? "text-brand-100" : "text-gray-500"}`}>
          {title}
        </p>
        <div
          className={[
            "w-9 h-9 rounded-xl flex items-center justify-center",
            accent ? "bg-brand-600" : "bg-brand-50",
          ].join(" ")}
        >
          <span className={accent ? "text-brand-100" : "text-brand-600"}>{icon}</span>
        </div>
      </div>
      <p className={`text-3xl font-bold mb-1.5 ${accent ? "text-white" : "text-gray-900"}`}>
        {value}
      </p>
      <div className={`flex items-center gap-1 text-xs font-medium ${changeColor}`}>
        {changeIcon}
        <span>{change}</span>
      </div>
    </div>
  );
}
