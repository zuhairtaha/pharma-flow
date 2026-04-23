import { HashRouter, Navigate, Route, Routes } from 'react-router';
import Layout from './components/Layout';
import { DataProvider } from './store/DataContext';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import CustomerStatement from './pages/CustomerStatement';
import Invoices from './pages/Invoices';
import NewInvoice from './pages/NewInvoice';
import InvoiceView from './pages/InvoiceView';
import Expiry from './pages/Expiry';
import Debts from './pages/Debts';
import Settings from './pages/Settings';

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="expiry" element={<Expiry />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="debts" element={<Debts />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerStatement />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<NewInvoice />} />
            <Route path="invoices/:id" element={<InvoiceView />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
