import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import ClientList from './pages/clients/ClientList';
import ClientForm from './pages/clients/ClientForm';
import ProjectList from './pages/projects/ProjectList';
import ProjectForm from './pages/projects/ProjectForm';
import TimesheetList from './pages/timesheets/TimesheetList';
import TimesheetForm from './pages/timesheets/TimesheetForm';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceForm from './pages/invoices/InvoiceForm';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import EstimateList from './pages/estimates/EstimateList';
import EstimateForm from './pages/estimates/EstimateForm';
import EstimateDetail from './pages/estimates/EstimateDetail';
import SettingsPage from './pages/settings/SettingsPage';
import TimerPage from './pages/timer/TimerPage';
import ChargeCodesPage from './pages/charge-codes/ChargeCodesPage';
import { getToken } from './api/index';
import { TimerProvider } from './context/TimerContext';
import { FeaturesProvider } from './context/FeaturesContext';
import DialogProvider from './components/DialogProvider';

function RequireAuth({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <DialogProvider />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<RequireAuth><FeaturesProvider><TimerProvider><Layout /></TimerProvider></FeaturesProvider></RequireAuth>}>
          <Route index element={<Navigate to="/clients" replace />} />

          <Route path="clients" element={<ClientList />} />
          <Route path="clients/new" element={<ClientForm />} />
          <Route path="clients/:id/edit" element={<ClientForm />} />

          <Route path="projects" element={<ProjectList />} />
          <Route path="projects/new" element={<ProjectForm />} />
          <Route path="projects/:id/edit" element={<ProjectForm />} />

          <Route path="timesheets" element={<TimesheetList />} />
          <Route path="timesheets/new" element={<TimesheetForm />} />
          <Route path="timesheets/:id/edit" element={<TimesheetForm />} />

          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/new" element={<InvoiceForm />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />

          <Route path="estimates" element={<EstimateList />} />
          <Route path="estimates/new" element={<EstimateForm />} />
          <Route path="estimates/:id" element={<EstimateDetail />} />

          <Route path="timer" element={<TimerPage />} />
          <Route path="charge-codes" element={<ChargeCodesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
