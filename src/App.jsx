import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateTeam from './pages/CreateTeam';
import AdminDashboard from './pages/AdminDashboard';
import Payment from './pages/Payment';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser, userProfile } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  if (adminOnly && userProfile?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  if (!adminOnly && userProfile?.role === 'admin') {
    return <Navigate to="/admin" />;
  }
  
  if (!adminOnly && !userProfile?.paymentApproved) {
    return <Navigate to="/payment" />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  
  if (currentUser) {
    if (userProfile?.role === 'admin') {
      return <Navigate to="/admin" />;
    }
    if (!userProfile?.paymentApproved) {
      return <Navigate to="/payment" />;
    }
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create-team" element={<ProtectedRoute><CreateTeam /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
