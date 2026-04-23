import { HashRouter, Navigate, Route, Routes } from 'react-router';
import Layout from './components/Layout.jsx';
import { DataProvider } from './store/DataContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Customers from './pages/Customers.jsx';
import CustomerStatement from './pages/CustomerStatement.jsx';
import Invoices from './pages/Invoices.jsx';
import NewInvoice from './pages/NewInvoice.jsx';
import InvoiceView from './pages/InvoiceView.jsx';
import Expiry from './pages/Expiry.jsx';
import Debts from './pages/Debts.jsx';
import Settings from './pages/Settings.jsx';

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
