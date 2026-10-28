// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/common/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeePortal from './pages/EmployeePortal';
import ClaimsManagement from './pages/ClaimsManagement';
import VerificationEngine from './pages/VerificationEngine';
import ReviewApprovalPage from './pages/ReviewApprovalPage';
import PolicyConfigPage from './pages/PolicyConfigPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReportsPage from './pages/ReportsPage';

// Authenticated App Shell Layout with Sidebar
function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes with Sidebar Layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <AppLayout>
              <EmployeePortal />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/claims"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ClaimsManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Only Routes */}
      <Route
        path="/verification-engine"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <VerificationEngine />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/review-approval"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <ReviewApprovalPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/policies"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <PolicyConfigPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <AuditLogsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout>
              <ReportsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect to Dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
