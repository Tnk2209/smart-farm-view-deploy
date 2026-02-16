import { ReactNode, Fragment } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { useLocation, Link } from 'react-router-dom';

interface DashboardLayoutProps {
  children: ReactNode;
}

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  map: 'Map View',
  stations: 'Stations',
  sensors: 'Sensors',
  alerts: 'Alerts',
  'risk-dashboard': '4 Pillars Risk Dashboard',
  'disease-risk': 'Disease Risk Analysis',
  'register-plot': 'Register Farm Plot',
  admin: 'Administration',
  users: 'Users',
  thresholds: 'Thresholds',
  settings: 'Settings',
  'approve-plots': 'Approve Farm Plots',
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {pathSegments.map((segment, index) => {
                  const path = '/' + pathSegments.slice(0, index + 1).join('/');
                  const isLast = index === pathSegments.length - 1;
                  const name = routeNames[segment] || segment;
                  
                  // Check if segment is a number (ID)
                  const isId = !isNaN(Number(segment));
                  const displayName = isId ? `#${segment}` : name;

                  return (
                    <Fragment key={path}>
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{displayName}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={path}>{displayName}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
