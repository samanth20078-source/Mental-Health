import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Login } from './pages/Login.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { SettingsPage } from './pages/Settings.tsx';
import { MoodTracker } from './pages/MoodTracker.tsx';
import { Assessment } from './pages/Assessment.tsx';
import { History } from './pages/History.tsx';
import { Assistant } from './pages/Assistant.tsx';
import { Layout } from './components/Layout.tsx';
import { ProfessionalDashboard } from './components/professional/ProfessionalDashboard.tsx';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400">Loading secure environment...</p></div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="log-mood" element={<MoodTracker />} />
            <Route path="assessment" element={<Assessment />} />
            <Route path="history" element={<History />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="professional" element={<ProfessionalDashboard professionalId="dr-smith-456" patientId="patient-123" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
