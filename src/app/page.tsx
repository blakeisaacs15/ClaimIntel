import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturesSection from "@/components/FeaturesSection";
import UploadSection from "@/components/UploadSection";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <FeaturesSection />
        <UploadSection />

        {/* CTA Section */}
        <section className="py-24 bg-brand-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              Ready to stop leaving money on the table?
            </h2>
            <p className="text-lg text-brand-200 mb-10 max-w-xl mx-auto">
              Join 500+ dental practices using ClaimIntel to recover denied revenue and
              improve first-pass claim rates.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="#upload"
                className="w-full sm:w-auto bg-white text-brand-800 font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg"
              >
                Start Free — Upload CSV
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto border border-brand-500/50 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-700/60 transition-colors"
              >
                Explore Demo Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
