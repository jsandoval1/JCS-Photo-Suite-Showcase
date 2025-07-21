import { useEffect, useState } from 'react'
import './App.css'
import { Navbar, Footer, ProtectedRoute, PublicRoute } from './components'
import { Routes, Route } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import Home from './views/Home'
import Features from './views/Features'
import Pricing from './views/Pricing'
import Contact from './views/Contact'
import Legal from './views/Legal'
import Login from './views/Login'
import Register from './views/Register'
import Dashboard from './views/Dashboard'
import Checkout from './views/Checkout'
import LicenseManagement from './views/LicenseManagement'
import SubscriptionManagement from './views/SubscriptionManagement'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import {useLocation }from 'react-router-dom'


function App() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const location = useLocation();
  const authPages = ['/login', '/register']

  const hideLayout = authPages.includes(location.pathname)

  const handleGetStarted = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    // TODO: Integrate with your licensing API
    console.log('Getting started with email:', email)
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      alert('Thank you! We\'ll be in touch soon.')
    }, 1000)
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app">
    {!hideLayout && <Navbar />}
          <Routes>
            {/* Public routes - accessible to everyone */}
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/legal" element={<Legal />} />
            
            {/* Auth routes - only for non-authenticated users */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            
            {/* Protected routes - only for authenticated users */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } />
            <Route path="/license-management" element={
              <ProtectedRoute>
                <LicenseManagement />
              </ProtectedRoute>
            } />
            <Route path="/subscription-management" element={
              <ProtectedRoute>
                <SubscriptionManagement />
              </ProtectedRoute>
            } />
          </Routes>
          {!hideLayout && <Footer />}
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
