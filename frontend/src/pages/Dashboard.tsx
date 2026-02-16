
import { useAuth } from '@/contexts/AuthContext';
import ManagerDashboard from './ManagerDashboard';
import UserDashboard from './UserDashboard';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-12 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Super User and Manager see the Manager Dashboard
  if (user?.role === 'SUPER_USER' || user?.role === 'MANAGER') {
    return <ManagerDashboard />;
  }

  // Regular Users (Farmers) see the User Dashboard
  return <UserDashboard />;
}
