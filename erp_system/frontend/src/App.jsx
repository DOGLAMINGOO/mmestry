import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import NotFound from './pages/NotFound.jsx'
import Home from './pages/Home.jsx'
import Inventory from './pages/Inventory.jsx'
import InventoryDetail from './pages/InventoryDetail.jsx'
import CustomerOrders from './pages/CustomerOrders.jsx'
import CreateCustomerOrder from './pages/CreateCustomerOrder.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'


function Logout(){
  localStorage.clear()
  return <Navigate to="/login" />
}


function RegisterAndLogout(){
  localStorage.clear()                //good habit to clear any previous tokens while registering
  return <Register />
}


function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/logout' element={<Logout />} />
          <Route path='/register' element={<RegisterAndLogout />} />
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
            path='/inventory/:id'
            element={
              <ProtectedRoute>
                <InventoryDetail />
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
