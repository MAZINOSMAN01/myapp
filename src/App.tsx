// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from './context/AuthContext'; 

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
import { MaintenanceManagement } from './components/MaintenanceManagement';
import { Reports } from './components/Reports';

// Newly Added Components
import { MOTsManagement } from './components/MOTsManagement';
import { IssueLog } from './components/IssueLog';
import { LessonsLearned } from './components/LessonsLearned';
import { SpaceManagement } from './components/SpaceManagement'; 
import { AssetTracking } from './components/AssetTracking';
import { CleaningManagement } from './components/CleaningManagement';
import { QuotationsInvoicing } from './components/QuotationsInvoicing';


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
          <Route path="asset-tracking" element={<AssetTracking />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="cleaning-management" element={<CleaningManagement />} />
          <Route path="maintenance-management" element={<MaintenanceManagement />} />
          <Route path="quotations-invoicing" element={<QuotationsInvoicing />} />
          <Route path="issue-log" element={<IssueLog />} />
          <Route path="lessons-learned" element={<LessonsLearned />} />
          <Route path="mots" element={<MOTsManagement />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="reports" element={<Reports />} />
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