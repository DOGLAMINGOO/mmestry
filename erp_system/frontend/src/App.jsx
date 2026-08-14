import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Home from './pages/Home.jsx'
import Inventory from './pages/Inventory.jsx'
import InventoryDetail from './pages/InventoryDetail.jsx'
import CustomerOrders from './pages/CustomerOrders.jsx'
import CreateCustomerOrder from './pages/CreateCustomerOrder.jsx'
import EditCustomerOrder from './pages/EditCustomerOrder.jsx'
import Production from './pages/Production.jsx'
import CreateProductionEntry from './pages/CreateProductionEntry.jsx'
import EditProductionEntry from './pages/EditProductionEntry.jsx'
import Dispatch from './pages/Dispatch.jsx'
import DispatchHistoryPage from './pages/DispatchHistory.jsx'
import ProductionReportsHistory from './pages/ProductionReportsHistory.jsx'
import InventoryLogs from './pages/InventoryLogs.jsx'
import StockReceiptLogs from './pages/StockReceiptLogs.jsx'
import CustomerOrderLogs from './pages/CustomerOrderLogs.jsx'
import AdminManagement from './pages/AdminManagement.jsx'
import ERPLayout from './components/ERPLayout.jsx'
import api from './api'

function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

// App wrapper with user context
function AppWithUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const fetchUser = async () => {
      const accessToken = localStorage.getItem('access')
      if (accessToken) {
        try {
          const res = await api.get('/api/user/me/')
          setUser(res.data)
        } catch (err) {
          console.error('Failed to fetch user:', err)
          localStorage.clear()
        }
      }
      setLoading(false)
    }
    
    fetchUser()
  }, [])

  const isAuthPage = location.pathname === '/login' || location.pathname === '/logout'
  
  if (loading && !isAuthPage) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path='/login' element={<Login />} />
      <Route path='/logout' element={<Logout />} />
      
      {user && user.role ? (
        <>
          <Route element={<LayoutWrapper user={user}><Home /></LayoutWrapper>} path="/" />
          <Route element={<LayoutWrapper user={user}><Inventory /></LayoutWrapper>} path="/inventory" />
          <Route element={<LayoutWrapper user={user}><InventoryDetail /></LayoutWrapper>} path="/inventory/:id" />
          <Route element={<LayoutWrapper user={user}><CustomerOrders /></LayoutWrapper>} path="/customer-orders" />
          <Route element={<LayoutWrapper user={user}><CreateCustomerOrder /></LayoutWrapper>} path="/customer-orders/new" />
          <Route element={<LayoutWrapper user={user}><EditCustomerOrder /></LayoutWrapper>} path="/customer-orders/edit/:id" />
          <Route element={<LayoutWrapper user={user}><Production /></LayoutWrapper>} path="/production" />
          <Route element={<LayoutWrapper user={user}><CreateProductionEntry /></LayoutWrapper>} path="/production/start/:id" />
          <Route element={<LayoutWrapper user={user}><EditProductionEntry /></LayoutWrapper>} path="/production/report/:id" />
          <Route element={<LayoutWrapper user={user}><Dispatch /></LayoutWrapper>} path="/dispatch" />
          <Route element={<LayoutWrapper user={user}><DispatchHistoryPage /></LayoutWrapper>} path="/dispatch-history" />
          <Route element={<LayoutWrapper user={user}><ProductionReportsHistory /></LayoutWrapper>} path="/production-reports" />
          <Route element={<LayoutWrapper user={user}><InventoryLogs /></LayoutWrapper>} path="/inventory-logs" />
          <Route element={<LayoutWrapper user={user}><StockReceiptLogs /></LayoutWrapper>} path="/stock-receipt-logs" />
          <Route element={<LayoutWrapper user={user}><CustomerOrderLogs /></LayoutWrapper>} path="/customer-order-logs" />
          {user.role === 'ADMIN' && (
            <Route element={<LayoutWrapper user={user}><AdminManagement /></LayoutWrapper>} path="/admin/management" />
          )}
        </>
      ) : (
        <Route path='*' element={<Navigate to="/login" />} />
      )}
      
      <Route path='*' element={<NotFound />} />
    </Routes>
  )
}

function LayoutWrapper({ user, children }) {
  return <ERPLayout user={user}>{children}</ERPLayout>
}

function App() {
  return (
    <BrowserRouter>
      <AppWithUser />
    </BrowserRouter>
  )
}

export default App
