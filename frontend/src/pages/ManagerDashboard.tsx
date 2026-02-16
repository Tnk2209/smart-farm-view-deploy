
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
import { Radio, Thermometer, AlertTriangle, AlertCircle, MapPin, ArrowRight, Clock } from 'lucide-react';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
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

        fetchData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i}>
                                <CardHeader className="pb-2">
                                    <Skeleton className="h-4 w-24" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-16" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const statusData = summary ? [
        { name: 'Normal', value: summary.normal_stations, fill: 'hsl(var(--chart-1))' },
        { name: 'Warning', value: summary.warning_stations, fill: 'hsl(var(--chart-5))' },
        { name: 'Critical', value: summary.critical_stations, fill: 'hsl(var(--destructive))' },
    ].filter(d => d.value > 0) : [];

    // Provincial summary - top 5 provinces by station count
    const provincialData = stations.reduce((acc, station) => {
        acc[station.province] = (acc[station.province] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topProvinces = Object.entries(provincialData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([province, count]) => ({ province, count }));

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Overview of agricultural monitoring stations across Thailand
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Stations"
                        value={summary?.total_stations || 0}
                        subtitle="Across Thailand"
                        icon={Radio}
                        variant="default"
                    />
                    <StatCard
                        title="Total Sensors"
                        value={summary?.total_sensors || 0}
                        subtitle="Active monitoring"
                        icon={Thermometer}
                        variant="success"
                    />
                    <StatCard
                        title="Active Alerts"
                        value={summary?.active_alerts || 0}
                        subtitle="Unacknowledged"
                        icon={AlertTriangle}
                        variant="warning"
                    />
                    <StatCard
                        title="Critical Status"
                        value={summary?.critical_stations || 0}
                        subtitle="Requires attention"
                        icon={AlertCircle}
                        variant="danger"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Station Status Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Station Status Distribution</CardTitle>
                            <CardDescription>Current status of all monitoring stations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[250px]">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        strokeWidth={2}
                                        stroke="hsl(var(--background))"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ChartContainer>
                            <div className="flex flex-wrap justify-center gap-4 mt-4">
                                {statusData.map((item) => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <div
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: item.fill }}
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            {item.name}: {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Provincial Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Stations by Province</CardTitle>
                            <CardDescription>Top provinces with monitoring stations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[250px]">
                                <BarChart data={topProvinces} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="province"
                                        width={100}
                                        tick={{ fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar
                                        dataKey="count"
                                        fill="hsl(var(--primary))"
                                        radius={[0, 4, 4, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Alerts and Quick Actions */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Recent Alerts */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Alerts</CardTitle>
                                <CardDescription>Latest alerts from all stations</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link to="/alerts">
                                    View All
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {recentAlerts.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No recent alerts
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {recentAlerts.map((alert) => (
                                        <div
                                            key={alert.alert_id}
                                            className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                                        >
                                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.severity === 'high' ? 'text-destructive' :
                                                    alert.severity === 'medium' ? 'text-chart-5' : 'text-chart-3'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {alert.alert_message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <SeverityBadge severity={alert.severity} size="sm" />
                                                    <span className="text-xs text-muted-foreground flex items-center">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {format(new Date(alert.created_at), 'MMM d, HH:mm')}
                                                    </span>
                                                </div>
                                            </div>
                                            {alert.is_acknowledged && (
                                                <span className="text-xs text-muted-foreground">Acknowledged</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Navigate to key areas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <Link to="/map">
                                    <MapPin className="mr-2 h-4 w-4" />
                                    View Map
                                </Link>
                            </Button>
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <Link to="/stations">
                                    <Radio className="mr-2 h-4 w-4" />
                                    All Stations
                                </Link>
                            </Button>
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <Link to="/sensors">
                                    <Thermometer className="mr-2 h-4 w-4" />
                                    All Sensors
                                </Link>
                            </Button>
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <Link to="/alerts">
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    View Alerts
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
