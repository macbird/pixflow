import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { AppShell } from './app/layouts/AppShell';
import { AdminShell } from './app/layouts/AdminShell';
import { PlansPage } from './features/plans/pages/PlansPage';
import { CreatePlanPage } from './features/plans/pages/CreatePlanPage';
import { EditPlanPage } from './features/plans/pages/EditPlanPage';
import { ServersPage } from './features/servers/pages/ServersPage';
import { CreateServerPage } from './features/servers/pages/CreateServerPage';
import { EditServerPage } from './features/servers/pages/EditServerPage';
import { TagsPage } from './features/tags/pages/TagsPage';
import { CreateTagPage } from './features/tags/pages/CreateTagPage';
import { EditTagPage } from './features/tags/pages/EditTagPage';
import { CustomersPage } from './features/customers/pages/CustomersPage';
import { CreateCustomerPage } from './features/customers/pages/CreateCustomerPage';
import { EditCustomerPage } from './features/customers/pages/EditCustomerPage';
import { AdminLoginPage } from './features/admin/pages/AdminLoginPage';
import { AccountsPage } from './features/admin/pages/AccountsPage';
import { CreateAccountPage } from './features/admin/pages/CreateAccountPage';
import { EditAccountPage } from './features/admin/pages/EditAccountPage';
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/admin/login" />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <h1 className="text-2xl font-bold">Dashboard</h1>
                  <p className="mt-4">Bem-vindo ao IPTV Manager. Use o menu lateral para navegar.</p>
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plans" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <PlansPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plans/new" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <CreatePlanPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plans/:id/edit" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <EditPlanPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/servers" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <ServersPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/servers/new" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <CreateServerPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/servers/:id/edit" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <EditServerPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tags" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <TagsPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tags/new" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <CreateTagPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tags/:id/edit" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <EditTagPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <CustomersPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers/new" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <CreateCustomerPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customers/:id/edit" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <EditCustomerPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminProtectedRoute>
                <AdminShell>
                  <AdminDashboardPage />
                </AdminShell>
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/accounts" 
            element={
              <AdminProtectedRoute>
                <AdminShell>
                  <AccountsPage />
                </AdminShell>
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/accounts/new" 
            element={
              <AdminProtectedRoute>
                <AdminShell>
                  <CreateAccountPage />
                </AdminShell>
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/accounts/:id/edit" 
            element={
              <AdminProtectedRoute>
                <AdminShell>
                  <EditAccountPage />
                </AdminShell>
              </AdminProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
