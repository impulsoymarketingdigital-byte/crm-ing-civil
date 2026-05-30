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
