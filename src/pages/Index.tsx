
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Dashboard } from "@/components/Dashboard";
import { SpaceManagement } from "@/components/SpaceManagement";
import { AssetTracking } from "@/components/AssetTracking";
import { WorkOrders } from "@/components/WorkOrders";
import { Reports } from "@/components/Reports";
import { CleaningManagement } from "@/components/CleaningManagement";
import { MaintenanceManagement } from "@/components/MaintenanceManagement";
import { QuotationsInvoicing } from "@/components/QuotationsInvoicing";
import { UserManagement } from "@/components/UserManagement";

const Index = () => {
  const [activeSection, setActiveSection] = useState("dashboard");

  const renderActiveSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard />;
      case "spaces":
        return <SpaceManagement />;
      case "assets":
        return <AssetTracking />;
      case "work-orders":
        return <WorkOrders />;
      case "cleaning":
        return <CleaningManagement />;
      case "maintenance":
        return <MaintenanceManagement />;
      case "quotations":
        return <QuotationsInvoicing />;
      case "users":
        return <UserManagement />;
      case "reports":
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <main className="flex-1 p-6">
          {renderActiveSection()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
