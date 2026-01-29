import { AlertSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: AlertSeverity;
  size?: 'sm' | 'default';
}

export function SeverityBadge({ severity, size = 'default' }: SeverityBadgeProps) {
  const styles: Record<AlertSeverity, { className: string; label: string }> = {
    low: { className: 'bg-chart-3/20 text-chart-3 border-chart-3/30', label: 'Low' },
    medium: { className: 'bg-chart-4/20 text-chart-4 border-chart-4/30', label: 'Medium' },
    high: { className: 'bg-destructive/20 text-destructive border-destructive/30', label: 'High' },
  };

  const style = styles[severity];

  return (
    <Badge 
      variant="outline"
      className={cn(
        style.className,
        size === 'sm' && 'text-xs px-2 py-0'
      )}
    >
      {style.label}
    </Badge>
  );
}
