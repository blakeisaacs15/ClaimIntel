import Link from "next/link";

export default function Hero() {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-800/60 border border-brand-600/40 text-brand-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
          Dental Billing Intelligence
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
          Stop Losing Revenue to{" "}
          <span className="text-brand-300">Denied Claims</span>
        </h1>

        <p className="text-lg sm:text-xl text-brand-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          ClaimIntel identifies denial patterns, flags errors before submission,
          and helps your dental practice recover revenue faster — powered by AI.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="#upload"
            className="w-full sm:w-auto bg-white text-brand-800 font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg text-base"
          >
            Upload Claims CSV
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto border border-brand-500/50 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-800/60 transition-colors text-base"
          >
            View Demo Dashboard →
          </Link>
        </div>

        {/* Social proof stats */}
        <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
          {[
            { value: "500+", label: "Dental Practices" },
            { value: "98%", label: "First-Pass Rate" },
            { value: "$2.3M+", label: "Revenue Recovered" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-xs sm:text-sm text-brand-300 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
