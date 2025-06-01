import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/auth/Login';
import SignUpPage  from './pages/auth/SignUpPage';
import HomePage from './pages/protected/HomePage';
import ProfilePage from './pages/protected/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute'; // We'll create this
import MaintenancePage from './pages/MaintenancePage'; // Added import
import MobilePage from './pages/MobilePage';
import { useEffect, useState } from 'react';

// TODO: Move this to an environment variable or a config file
const MAINTENANCE_MODE = false; // Set to true to enable maintenance mode

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768); // You can adjust this breakpoint
    };

    // Check on mount
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  if (isMobile) {
    return <MobilePage />;
  }

  return (
    <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignUpPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Catch all route - redirect to home if authenticated, otherwise to login */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <Navigate to="/" replace />
              </ProtectedRoute>
            }
          />
        </Routes>
    </AuthProvider>
  );
}

export default App;