import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import GlobalLoadingIndicator from './GlobalLoadingIndicator';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <GlobalLoadingIndicator isLoading={true} message="Loading..." />; // Add some custom loading component
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;