import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: 'view_dashboard' | 'view_sensor_data' | 'manage_station' | 'manage_sensor' | 'configure_threshold' | 'manage_user';
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, requiredPermission, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
