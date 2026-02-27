import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/i18n';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import CustomersPage from '@/pages/customers/CustomersPage';
import ShipsPage from '@/pages/ships/ShipsPage';
import ServicesPage from '@/pages/services/ServicesPage';
import InvoicesPage from '@/pages/invoices/InvoicesPage';
import QuotesPage from '@/pages/quotes/QuotesPage';
import MeetingsPage from '@/pages/meetings/MeetingsPage';
import ExpensesPage from '@/pages/expenses/ExpensesPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import { useAuthStore } from '@/store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-lg">
      {name} — coming soon
    </div>
  );
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/customers/*" element={<CustomersPage />} />
            <Route path="/ships/*" element={<ShipsPage />} />
            <Route path="/services/*" element={<ServicesPage />} />
            <Route path="/quotes/*" element={<QuotesPage />} />
            <Route path="/invoices/*" element={<InvoicesPage />} />
            <Route path="/meetings/*" element={<MeetingsPage />} />
            <Route path="/expenses/*" element={<AdminOnly><ExpensesPage /></AdminOnly>} />
            <Route path="/documents/*" element={<Placeholder name="Documents" />} />
            <Route path="/reports/*" element={<Placeholder name="Reports" />} />
            <Route path="/settings/*" element={<AdminOnly><SettingsPage /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
