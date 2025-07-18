// src/pages/Index.tsx

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveSectionFromPath = () => {
    const path = location.pathname.split('/')[1] || 'dashboard';
    switch (path) {
      case 'dashboard': return 'dashboard';
      case 'space-management': return 'spaces';
      case 'assets': return 'assets';
      case 'work-orders': return 'work-orders';
      case 'cleaning-management': return 'cleaning';
      case 'maintenance-management': return 'maintenance';
      case 'quotations-invoicing': return 'quotations';
      case 'issue-log': return 'issue-log';
      case 'lessons-learned': return 'lessons-learned';
      case 'mots': return 'mots';
      case 'user-management': return 'users';
      case 'reports': return 'reports';
      case 'archive-reports': return 'archive-reports';
      case 'database-migration': return 'database-migration'; // ← إضافة هذا السطر
      default: return 'dashboard';
    }
  };

  const handleSidebarNavigation = (section: string) => {
    let path = '';
    switch (section) {
      case 'dashboard': path = '/dashboard'; break;
      case 'spaces': path = '/space-management'; break;
     // في src/pages/Index.tsx - تصحيح المسار

      case 'work-orders': path = '/work-orders'; break;
      case 'assets': path = '/assets'; break;  // كان /asset-tracking
      case 'cleaning': path = '/cleaning-management'; break;
      case 'maintenance': path = '/maintenance-management'; break;
      case 'quotations': path = '/quotations-invoicing'; break;
      case 'issue-log': path = '/issue-log'; break;
      case 'lessons-learned': path = '/lessons-learned'; break;
      case 'mots': path = '/mots'; break;
      case 'users': path = '/user-management'; break;
      case 'reports': path = '/reports'; break;
      case 'archive-reports': path = '/archive-reports'; break;
      case 'database-migration': path = '/database-migration'; break; // ← إضافة هذا السطر
      default: path = '/dashboard'; break;
    }
    navigate(path);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar
          activeSection={getActiveSectionFromPath()}
          setActiveSection={handleSidebarNavigation}
        />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet /> 
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;