import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import ProtectedRoute from './components/ProtectedRoute.jsx'

function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/logout' element={<Logout />} />
          <Route
            path='/'
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>} />
          <Route
            path='/inventory'
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>} />
          <Route
            path='/customer-orders'
            element={
              <ProtectedRoute>
                <CustomerOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path='/customer-orders/new'
            element={
              <ProtectedRoute>
                <CreateCustomerOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path='/customer-orders/edit/:id'
            element={
              <ProtectedRoute>
                <EditCustomerOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path='/inventory/:id'
            element={
              <ProtectedRoute>
                <InventoryDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path='/production'
            element={
              <ProtectedRoute>
                <Production />
              </ProtectedRoute>
            }
          />
          <Route
            path='/production/start/:id'
            element={
              <ProtectedRoute>
                <CreateProductionEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path='/production/report/:id'
            element={
              <ProtectedRoute>
                <EditProductionEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path='/dispatch'
            element={
              <ProtectedRoute>
                <Dispatch />
              </ProtectedRoute>
            }
          />
          <Route
            path='/dispatch-history'
            element={
              <ProtectedRoute>
                <DispatchHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </BrowserRouter>

    </>
  );
}

export default App;
