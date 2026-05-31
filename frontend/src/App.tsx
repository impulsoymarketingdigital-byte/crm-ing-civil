import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import InvoicesPage from './pages/InvoicesPage'
import InventoryPage from './pages/InventoryPage'
import AccountsPage from './pages/AccountsPage'
import TrialBalancePage from './pages/TrialBalancePage'
import AiOcrPage from './pages/AiOcrPage'
import ProjectsPage from './pages/ProjectsPage'
import PayrollPage from './pages/PayrollPage'
import ApuPage from './pages/ApuPage'
import BudgetPage from './pages/BudgetPage'
import CertificatesPage from './pages/CertificatesPage'
import LiquidationPage from './pages/LiquidationPage'
import SecopPage from './pages/SecopPage'
import ContabilidadPage from './pages/ContabilidadPage'
import ProveedoresPage from './pages/ProveedoresPage'
import CajaPage from './pages/CajaPage'
import ImpuestosPage from './pages/ImpuestosPage'

function Layout() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

function ProtectedApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/"              element={<DashboardPage />} />
          <Route path="/invoices"      element={<InvoicesPage />} />
          <Route path="/inventory"     element={<InventoryPage />} />
          <Route path="/accounts"      element={<AccountsPage />} />
          <Route path="/trial-balance" element={<TrialBalancePage />} />
          <Route path="/ai-ocr"        element={<AiOcrPage />} />
          <Route path="/projects"      element={<ProjectsPage />} />
          <Route path="/payroll"       element={<PayrollPage />} />
          <Route path="/apu"           element={<ApuPage />} />
          <Route path="/budgets"       element={<BudgetPage />} />
          <Route path="/certificates"  element={<CertificatesPage />} />
          <Route path="/liquidation"   element={<LiquidationPage />} />
          <Route path="/secop"         element={<SecopPage />} />
          <Route path="/contabilidad"  element={<ContabilidadPage />} />
          <Route path="/proveedores"   element={<ProveedoresPage />} />
          <Route path="/caja"          element={<CajaPage />} />
          <Route path="/impuestos"     element={<ImpuestosPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  )
}
