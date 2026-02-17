
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { SeverityBadge } from '@/components/SeverityBadge';
import { getDashboardSummary, getAlerts, getStations } from '@/lib/api';
import { DashboardSummary, Alert, Station } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Radio, Thermometer, AlertTriangle, AlertCircle, MapPin,
    ArrowRight, Clock, Wind, Droplets, CloudRain, Sun,
    Battery, CheckCircle, Zap, Activity
} from 'lucide-react';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig
} from '@/components/ui/chart';
import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';

const chartConfig: ChartConfig = {
    normal: { label: 'Normal', color: 'hsl(var(--chart-1))' },
    warning: { label: 'Warning', color: 'hsl(var(--chart-5))' },
    critical: { label: 'Critical', color: 'hsl(var(--destructive))' },
    offline: { label: 'Offline', color: 'hsl(var(--muted))' },
};

export default function ManagerDashboard() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const [summaryRes, alertsRes, stationsRes] = await Promise.all([
                    getDashboardSummary(),
                    getAlerts(),
                    getStations(),
                ]);

                if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
                if (alertsRes.success && alertsRes.data) setRecentAlerts(alertsRes.data.slice(0, 5));
                if (stationsRes.success && stationsRes.data) setStations(stationsRes.data);

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-32 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="h-[400px] rounded-xl" />
                </div>
            </DashboardLayout>
        );
    }

    const statusData = summary ? [
        { name: 'Normal', value: summary.normal_stations, fill: 'hsl(var(--chart-1))' },
        { name: 'Warning', value: summary.warning_stations, fill: 'hsl(var(--chart-5))' },
        { name: 'Critical', value: summary.critical_stations, fill: 'hsl(var(--destructive))' },
    ].filter(d => d.value > 0) : [];

    // Provincial Calculation
    const provincialDataMap = stations.reduce((acc, station) => {
        acc[station.province] = (acc[station.province] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const provincialData = Object.entries(provincialDataMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Top 8 provinces

    // Filter Problematic Stations
    const problematicStations = stations.filter(s => s.status !== 'normal');

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-primary">Manager Overview</h1>
                        <p className="text-muted-foreground mt-1">
                            High-level insights across 42 monitoring stations.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Updated: {format(new Date(), 'HH:mm')}
                        </span>
                        <Button asChild>
                            <Link to="/reports">Generate Report</Link>
                        </Button>
                    </div>
                </div>

                {/* Summary Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Stations"
                        value={summary?.total_stations || 0}
                        subtitle="Active across all provinces"
                        icon={MapPin}
                        variant="default"
                    />
                    <StatCard
                        title="Sensor Network"
                        value={summary?.total_sensors || 0}
                        subtitle="Individual data points"
                        icon={Radio}
                        variant="default"
                    />
                    <StatCard
                        title="Alerts System"
                        value={summary?.active_alerts || 0}
                        subtitle="Active notifications"
                        icon={AlertTriangle}
                        variant="warning"
                    />
                    <StatCard
                        title="System Risk"
                        value={summary?.critical_stations || 0}
                        subtitle="Critical stations"
                        icon={AlertCircle}
                        variant="danger"
                    />
                </div>

                {/* Charts Row: Status & Provincial Distribution */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Network Health Chart */}
                    <Card className="border shadow-sm">
                        <CardHeader>
                            <CardTitle>Network Health Status</CardTitle>
                            <CardDescription>Overall system status distribution</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="text-3xl font-bold">{summary?.total_stations}</span>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-4">
                                {statusData.map((item) => (
                                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                                        <span>{item.name} ({item.value})</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Provincial Distribution Chart */}
                    <Card className="border shadow-sm">
                        <CardHeader>
                            <CardTitle>Provincial Distribution</CardTitle>
                            <CardDescription>Top provinces by station count</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={provincialData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Row: Problematic Stations & Recent Alerts */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Problematic Stations List */}
                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                    Stations Requiring Attention
                                </CardTitle>
                                <CardDescription>Stations reporting Warning or Critical status</CardDescription>
                            </div>
                            {problematicStations.length > 0 && (
                                <Badge variant="destructive">{problematicStations.length} Issues</Badge>
                            )}
                        </CardHeader>
                        <CardContent>
                            {problematicStations.length > 0 ? (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                    {problematicStations
                                        .sort((a, b) => {
                                            const weight = { critical: 3, warning: 2, offline: 1, normal: 0 };
                                            return (weight[b.status as keyof typeof weight] || 0) - (weight[a.status as keyof typeof weight] || 0);
                                        })
                                        .map(station => {
                                            // Find latest alert for this station from recentAlerts
                                            const stationAlert = recentAlerts.find(a => a.station_id === station.station_id);

                                            return (
                                                <Link
                                                    key={station.station_id}
                                                    to={`/stations/${station.station_id}`}
                                                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${station.status === 'critical' ? 'bg-destructive/10 text-destructive animate-pulse' :
                                                                station.status === 'warning' ? 'bg-orange-100 text-orange-600' :
                                                                    'bg-muted text-muted-foreground'
                                                            }`}>
                                                            {station.status === 'critical' ? <AlertCircle className="h-4 w-4" /> :
                                                                station.status === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                                                                    <Activity className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                                                    {station.station_name}
                                                                </p>
                                                                {station.status === 'critical' && (
                                                                    <Badge variant="destructive" className="h-5 text-[10px] px-1.5">Critical</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {stationAlert ? (
                                                                    <span className="text-destructive/80 truncate block max-w-[200px]">
                                                                        {stationAlert.alert_message}
                                                                    </span>
                                                                ) : (
                                                                    <span>{station.province} • <span className="opacity-75">Check System</span></span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <StatusBadge status={station.status} />
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                    <CheckCircle className="h-10 w-10 mb-2 opacity-20 text-green-500" />
                                    <p>All systems operational</p>
                                    <p className="text-xs opacity-60">No irregularities detected in network</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Alerts (Keep this as it's useful timeline) */}
                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Alert Log</CardTitle>
                                <CardDescription>Latest system anomalies history</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link to="/alerts">View All</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                {recentAlerts.length > 0 ? (
                                    recentAlerts.map((alert) => (
                                        <div key={alert.alert_id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                                            <div className={`mt-0.5 p-1.5 rounded-full bg-background border ${alert.severity === 'high' ? 'text-red-500 border-red-200' :
                                                alert.severity === 'medium' ? 'text-orange-500 border-orange-200' :
                                                    'text-yellow-500 border-yellow-200'
                                                }`}>
                                                <AlertTriangle className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium transition-colors hover:text-primary cursor-pointer">
                                                        {alert.alert_type}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(alert.created_at), 'MMM d, HH:mm')}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{alert.alert_message}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                                        <CheckCircle className="h-10 w-10 mb-2 opacity-20" />
                                        <p>No active alerts</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
