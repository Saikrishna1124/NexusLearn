import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { StudentDashboard } from './pages/dashboards/StudentDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { CourseCatalog } from './pages/CourseCatalog';
import { CourseDetail } from './pages/CourseDetail';
import { CodePlayground } from './pages/CodePlayground';

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  // If user is authenticated but profile is missing, we can't check roles
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
        <p className="text-gray-400 mb-8">We couldn't load your user profile. Please try refreshing or contact support.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-indigo-600 px-6 py-2 rounded-xl font-bold"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (requiredRole && profile.role !== requiredRole && profile.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (user) return <Navigate to="/dashboard" />;

  return <>{children}</>;
};

const DashboardRedirect = () => {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (!profile) return <Navigate to="/login" />;

  if (profile.role === 'admin') return <Navigate to="/admin/dashboard" />;
  return <Navigate to="/student/dashboard" />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            <PublicRoute>
              <AuthPage mode="login" />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <AuthPage mode="signup" />
            </PublicRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          } />

          <Route path="/admin/dashboard" element={
            <ProtectedRoute requiredRole="admin">
              <DashboardLayout>
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/student/dashboard" element={
            <ProtectedRoute requiredRole="student">
              <DashboardLayout>
                <StudentDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/student/courses" element={
            <ProtectedRoute requiredRole="student">
              <DashboardLayout>
                <CourseCatalog />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/student/playground" element={
            <ProtectedRoute requiredRole="student">
              <DashboardLayout>
                <CodePlayground />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/courses/:id" element={
            <ProtectedRoute requiredRole="student">
              <DashboardLayout>
                <CourseDetail />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Add more routes for courses, lessons, etc. */}

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
