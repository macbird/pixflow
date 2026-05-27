import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { AppShell } from './app/layouts/AppShell';
import { PlansPage } from './features/plans/pages/PlansPage';
import { ServersPage } from './features/servers/pages/ServersPage';
import { TagsPage } from './features/tags/pages/TagsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" />;
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
            path="/tags" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <TagsPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
