import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import UploadSection from "@/components/UploadSection";

export default function UploadPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 overflow-auto bg-gray-50">
        <header className="bg-white border-b border-gray-100 h-16 flex items-center px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Upload Claims</h1>
            <p className="text-xs text-gray-400">Upload a CSV to analyze denials and holds</p>
          </div>
        </header>
        <main>
          <UploadSection />
        </main>
      </div>
    </div>
  );
}
