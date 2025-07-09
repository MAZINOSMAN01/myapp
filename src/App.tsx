// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from './context/AuthContext'; 
import { DatabaseMigration } from './components/DatabaseMigration';

// --- استيراد كل المكونات والصفحات ---

// Pages and Layout
import Index from './pages/Index';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import NotFound from './pages/NotFound';

// Core Components
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './components/Dashboard';
import { WorkOrders } from './components/WorkOrders';
import { UserManagement } from './components/UserManagement';
import { Reports } from './components/Reports';

// Newly Added & Modified Components
import { MaintenancePage } from './components/MaintenancePage';
import { AssetManagement } from './components/AssetManagement'; // **إضافة: استيراد مكون إدارة الأصول**
import { MOTsManagement } from './components/MOTsManagement';
import { IssueLog } from './components/IssueLog';
import { LessonsLearned } from './components/LessonsLearned';
import { SpaceManagement } from './components/SpaceManagement'; 
import { CleaningManagement } from './components/CleaningManagement';
import { QuotationsInvoicing } from './components/QuotationsInvoicing';
import { ArchiveReports } from './components/ArchiveReports';
import MaintenanceChecklistPage from './pages/MaintenanceChecklistPage';
import { MaintenanceChecklist}  from './components/MaintenanceChecklist';

const queryClient = new QueryClient();

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading Application...
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Index />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="space-management" element={<SpaceManagement />} />

          {/* --- هنا تم التعديل --- */}
          <Route path="assets" element={<AssetManagement />} /> 
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="cleaning-management" element={<CleaningManagement />} />
          <Route path="maintenance-management" element={<MaintenancePage />} />
          <Route path="maintenance-management/checklist/:planId" element={<MaintenanceChecklist />} />
          <Route path="quotations-invoicing" element={<QuotationsInvoicing />} />
          <Route path="issue-log" element={<IssueLog />} />
          <Route path="lessons-learned" element={<LessonsLearned />} />
          <Route path="mots" element={<MOTsManagement />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="archive-reports" element={<ArchiveReports />} />
          <Route path="database-migration" element={<DatabaseMigration />} />
        </Route>
      </Route>
      
      {/* Fallback for any route not matched */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Toaster />
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;