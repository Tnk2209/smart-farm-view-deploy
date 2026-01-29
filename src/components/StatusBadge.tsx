import { Station } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: Station['status'] | 'active' | 'inactive' | 'error';
  size?: 'sm' | 'default';
}

const statusStyles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  normal: { variant: 'default', label: 'Normal' },
  active: { variant: 'default', label: 'Active' },
  warning: { variant: 'secondary', label: 'Warning' },
  inactive: { variant: 'secondary', label: 'Inactive' },
  critical: { variant: 'destructive', label: 'Critical' },
  error: { variant: 'destructive', label: 'Error' },
  offline: { variant: 'outline', label: 'Offline' },
};

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const style = statusStyles[status] || { variant: 'outline', label: status };
  
  return (
    <Badge 
      variant={style.variant}
      className={cn(
        size === 'sm' && 'text-xs px-2 py-0'
      )}
    >
      <span className={cn(
        'mr-1.5 h-2 w-2 rounded-full',
        status === 'normal' || status === 'active' ? 'bg-chart-2' : '',
        status === 'warning' || status === 'inactive' ? 'bg-chart-4' : '',
        status === 'critical' || status === 'error' ? 'bg-destructive' : '',
        status === 'offline' ? 'bg-muted' : '',
      )} />
      {style.label}
    </Badge>
  );
}
