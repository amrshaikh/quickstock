import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Checkout from './pages/Checkout'
import Inventory from './pages/Inventory'
import Statements from './pages/Statements'
import AppLayout from './components/layout/AppLayout'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  
  if (loading) return <div className="h-screen flex items-center justify-center bg-[var(--color-background)] text-[var(--color-primary-900)]">Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="statements" element={<Statements />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
