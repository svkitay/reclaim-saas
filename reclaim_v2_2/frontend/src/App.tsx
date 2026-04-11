import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Header from "./components/Header";
import { Toaster } from "react-hot-toast";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Retailer pages
import Dashboard from "./pages/retailer/Dashboard";
import Customers from "./pages/retailer/Customers";
import Analytics from "./pages/retailer/Analytics";
import CampaignLog from "./pages/retailer/CampaignLog";
import Settings from "./pages/retailer/Settings";

// Admin pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminRetailers from "./pages/admin/AdminRetailers";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminLogs from "./pages/admin/AdminLogs";

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-widest mb-2" style={{ color: "#0B1120" }}>
            RECLAIM<span style={{ color: "#0EA5E9" }}>.</span>
          </h1>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main>{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-widest mb-2" style={{ color: "#0B1120" }}>
            RECLAIM<span style={{ color: "#0EA5E9" }}>.</span>
          </h1>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to={user.role === "super_admin" ? "/admin" : "/dashboard"} replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />

      {/* Retailer routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute><AppLayout><Customers /></AppLayout></ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>
      } />
      <Route path="/logs" element={
        <ProtectedRoute><AppLayout><CampaignLog /></AppLayout></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly><AppLayout><AdminOverview /></AppLayout></ProtectedRoute>
      } />
      <Route path="/admin/retailers" element={
        <ProtectedRoute adminOnly><AppLayout><AdminRetailers /></AppLayout></ProtectedRoute>
      } />
      <Route path="/admin/customers" element={
        <ProtectedRoute adminOnly><AppLayout><AdminCustomers /></AppLayout></ProtectedRoute>
      } />
      <Route path="/admin/logs" element={
        <ProtectedRoute adminOnly><AppLayout><AdminLogs /></AppLayout></ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={user ? (user.role === "super_admin" ? "/admin" : "/dashboard") : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
