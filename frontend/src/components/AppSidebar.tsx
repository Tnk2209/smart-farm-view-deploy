import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, getRoleDisplayName } from '@/contexts/AuthContext';
import { useThemeToggle } from '@/contexts/ThemeContext';
import { UserRole } from '@/lib/types';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  MapPin, 
  Radio, 
  Thermometer, 
  AlertTriangle, 
  Settings, 
  Users, 
  LogOut,
  Sun,
  Moon,
  Leaf,
  SlidersHorizontal,
  MapPinned,
  CheckSquare,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { title: 'Map View', url: '/map', icon: MapPin, permission: 'view_dashboard' },
  { title: 'Stations', url: '/stations', icon: Radio, permission: 'view_dashboard' },
  { title: 'Sensors', url: '/sensors', icon: Thermometer, permission: 'view_sensor_data' },
  { title: 'Alerts', url: '/alerts', icon: AlertTriangle, permission: 'view_dashboard' },
  { title: 'Disease Risk', url: '/disease-risk', icon: Activity, permission: 'view_dashboard' },
  { title: 'Register Plot', url: '/register-plot', icon: MapPinned, permission: 'view_dashboard' },
];

const adminItems = [
  { title: 'Users', url: '/admin/users', icon: Users, permission: 'manage_user' },
  { title: 'Approve Plots', url: '/admin/approve-plots', icon: CheckSquare, permission: 'manage_user' },
  { title: 'Thresholds', url: '/admin/thresholds', icon: SlidersHorizontal, permission: 'configure_threshold' },
  { title: 'Settings', url: '/admin/settings', icon: Settings, permission: 'manage_station' },
];

export function AppSidebar() {
  const { user, logout, hasPermission } = useAuth();
  const { toggleTheme, isDark, mounted } = useThemeToggle();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const visibleMenuItems = menuItems.filter(item => 
    hasPermission(item.permission as any)
  );

  const visibleAdminItems = adminItems.filter(item => 
    hasPermission(item.permission as any)
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-6 w-6" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Smart Agri</span>
              <span className="text-xs text-muted-foreground">Monitoring System</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && user && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">{user.username}</span>
              <Badge variant="outline" className="w-fit text-xs">
                {getRoleDisplayName(user.role)}
              </Badge>
            </div>
          </div>
        )}
        
        <div className={cn("flex gap-2", collapsed ? "flex-col" : "")}>
          {mounted && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="h-8 w-8"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
