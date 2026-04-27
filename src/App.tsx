import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from '@/context/AppContext';
import Dashboard from '@/pages/Dashboard';
import ClientsPage from '@/pages/clients/Clients';
import ClientDetailPage from '@/pages/clients/ClientDetail';
import DeliveriesPage from '@/pages/deliveries/Deliveries';
import DeliveryDetailPage from '@/pages/deliveries/DeliveryDetail';
import FactoryDetailPage from '@/pages/factories/FactoryDetail';
import FactoriesPage from '@/pages/factories/Factories';
import RemindersPage from '@/pages/reminders/Reminders';

function AppShell() {
  const { theme } = useApp();

  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200"
      data-theme={theme}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/factories" element={<FactoriesPage />} />
          <Route path="/factories/:id" element={<FactoryDetailPage />} />
          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
