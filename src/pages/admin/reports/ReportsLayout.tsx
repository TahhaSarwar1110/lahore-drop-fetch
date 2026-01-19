import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Package } from "lucide-react";
import { ReportsSidebar } from "@/components/admin/reports/ReportsSidebar";

interface ReportsLayoutProps {
  children: React.ReactNode;
  activeSection: string;
}

export const ReportsLayout = ({ children, activeSection }: ReportsLayoutProps) => {
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <ReportsSidebar activeSection={activeSection} />
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
