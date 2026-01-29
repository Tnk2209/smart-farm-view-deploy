import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth, getRoleDisplayName } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Shield, Database, Info, ExternalLink } from 'lucide-react';

export default function AdminSettings() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            System configuration and information
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Current User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Current Session
              </CardTitle>
              <CardDescription>
                Your current login information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">
                  {user?.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{user?.username}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge>{user && getRoleDisplayName(user.role)}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-sm">#{user?.user_id}</span>
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                System Information
              </CardTitle>
              <CardDescription>
                Application version and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono">1.0.0-demo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <Badge variant="secondary">Demo</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Status</span>
                <Badge variant="default">Mock Data</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database</span>
                <Badge variant="outline">In-Memory</Badge>
              </div>
            </CardContent>
          </Card>

          {/* RBAC Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Role-Based Access Control (RBAC)
              </CardTitle>
              <CardDescription>
                Permission matrix for different user roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Feature</th>
                      <th className="text-center py-2 px-4">User</th>
                      <th className="text-center py-2 px-4">Manager</th>
                      <th className="text-center py-2 px-4">Super User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2 pr-4">View Dashboard</td>
                      <td className="text-center py-2 px-4">✓</td>
                      <td className="text-center py-2 px-4">✓</td>
                      <td className="text-center py-2 px-4">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">View Sensor Data</td>
                      <td className="text-center py-2 px-4">✓</td>
                      <td className="text-center py-2 px-4">✓</td>
                      <td className="text-center py-2 px-4">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Manage Station</td>
                      <td className="text-center py-2 px-4 text-muted-foreground">—</td>
                      <td className="text-center py-2 px-4">✓</td>
                      <td className="text-center py-2 px-4">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Manage Sensor</td>
                      <td className="text-center py-2 px-4 text-muted-foreground">—</td>
                      <td className="text-center py-2 px-4">✓</td>
                      <td className="text-center py-2 px-4">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Configure Threshold</td>
                      <td className="text-center py-2 px-4 text-muted-foreground">—</td>
                      <td className="text-center py-2 px-4 text-muted-foreground">—</td>
                      <td className="text-center py-2 px-4">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Manage User</td>
                      <td className="text-center py-2 px-4 text-muted-foreground">—</td>
                      <td className="text-center py-2 px-4 text-muted-foreground">—</td>
                      <td className="text-center py-2 px-4">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
