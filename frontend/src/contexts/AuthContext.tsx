import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, UserRole } from '@/lib/types';
import { login as apiLogin, logout as apiLogout } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

// Permissions based on Access Control Matrix from document
type Permission =
  | 'view_dashboard'
  | 'view_sensor_data'
  | 'manage_station'
  | 'manage_sensor'
  | 'configure_threshold'
  | 'manage_user'
  | 'view_4_pillars_risk'
  | 'view_helpdesk';

// Role-based permissions matrix (from document STEP 7.5)
const rolePermissions: Record<UserRole, Permission[]> = {
  USER: ['view_dashboard', 'view_sensor_data'],
  MANAGER: ['view_dashboard', 'view_sensor_data', 'manage_station', 'manage_sensor', 'view_4_pillars_risk'],
  SUPER_USER: ['view_dashboard', 'view_sensor_data', 'manage_station', 'manage_sensor', 'configure_threshold', 'manage_user', 'view_4_pillars_risk'],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check localStorage for existing session
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiLogin(username, password);
      if (response.success && response.data) {
        setUser(response.data.user);
        localStorage.setItem('auth_user', JSON.stringify(response.data.user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    localStorage.removeItem('auth_user');
  }, []);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return rolePermissions[user.role].includes(permission);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        token,
        logout,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role display helper
export const getRoleDisplayName = (role: UserRole): string => {
  const names: Record<UserRole, string> = {
    USER: 'User',
    MANAGER: 'Manager',
    SUPER_USER: 'Super User',
  };
  return names[role];
};

// Role badge color helper
export const getRoleBadgeVariant = (role: UserRole): 'default' | 'secondary' | 'outline' => {
  const variants: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
    USER: 'outline',
    MANAGER: 'secondary',
    SUPER_USER: 'default',
  };
  return variants[role];
};
