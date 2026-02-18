
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getMyFarmPlots, getStationById, getStationLatestData, getSensorData, getPlotDiseaseRisk } from '@/lib/api';
import { FarmPlot, Station, SensorData, PlotDiseaseRisk } from '@/lib/types';
import { sensorTypeLabels, sensorTypeUnits } from '@/components/SensorIcon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Sprout, Wind, Droplets, Thermometer, CloudRain, Clock, Map as MapIcon, Info, TrendingUp, AlertTriangle, CloudFog, Gauge, Monitor, Radio, Activity, RotateCcw } from 'lucide-react';
import { format, subDays, subHours, subMonths, subMinutes } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Option } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';
// ... other imports
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';

// --- Icon Configurations for Map ---
const createStationIcon = (status: Station['status'] = 'normal') => {
    const colorMap: Record<string, string> = {
        normal: '#22c55e', // green-500
        warning: '#f59e0b', // amber-500
        critical: '#ef4444', // red-500
        offline: '#94a3b8', // slate-400
    };

    const html = renderToString(
        <div className="relative flex items-center justify-center w-8 h-8">
            <span className="absolute animate-ping inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colorMap[status] || colorMap.normal }}></span>
            <span className="relative inline-flex rounded-full h-4 w-4 border-2 border-white" style={{ backgroundColor: colorMap[status] || colorMap.normal }}></span>
        </div>
    );

    return L.divIcon({
        className: 'custom-station-icon',
        html: html,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -10],
    });
};

const farmPlotIcon = L.divIcon({
    className: 'custom-farm-icon',
    html: renderToString(
        <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full border-2 border-white shadow-lg">
            <Sprout className="h-6 w-6 text-white" />
        </div>
    ),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
});

// Helper to center map
function MapCentering({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 13); // Zoom level 13 is good for ~5-10km range
    }, [center, map]);
    return null;
}

function MapResetControl() {
    const map = useMap();

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        map.setView([13.7563, 100.5018], 10);
    };

    return (
        <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-20 right-4 z-[400] shadow-md bg-white/90 hover:bg-white border text-primary"
            onClick={handleReset}
            title="Reset View"
        >
            <RotateCcw className="h-4 w-4" />
        </Button>
    );
}

export default function UserDashboard() {
    const [allPlots, setAllPlots] = useState<FarmPlot[]>([]);
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
    const [station, setStation] = useState<Station | null>(null);
    const [sensorData, setSensorData] = useState<any[]>([]);
    const [diseaseRisk, setDiseaseRisk] = useState<PlotDiseaseRisk | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);


    // Chart State
    const [chartData, setChartData] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState<string>('24h');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
        'air_temp_c', 'air_rh_pct', 'rain_rate_mmph', 'soil_rh_pct'
    ]);

    // Metric Config
    const METRIC_CONFIG: Record<string, { label: string, color: string, unit: string, axisId: string }> = {
        'air_temp_c': { label: 'Air Temp', color: '#f97316', unit: '°C', axisId: 'temp' }, // Orange
        'air_rh_pct': { label: 'Humidity', color: '#3b82f6', unit: '%', axisId: 'percent' }, // Blue
        'rain_rate_mmph': { label: 'Rain Rate', color: '#0ea5e9', unit: 'mm/h', axisId: 'rain' }, // Sky
        'soil_rh_pct': { label: 'Soil Moisture', color: '#8b5cf6', unit: '%', axisId: 'percent' }, // Violet
        'soil_temp_c': { label: 'Soil Temp', color: '#d946ef', unit: '°C', axisId: 'temp' }, // Fuchsia
        'air_pressure_kpa': { label: 'Pressure', color: '#10b981', unit: 'kPa', axisId: 'pressure' }, // Emerald
    };

    const metricOptions: Option[] = [
        { label: 'Air Temperature', value: 'air_temp_c', icon: Thermometer },
        { label: 'Air Humidity', value: 'air_rh_pct', icon: Droplets },
        { label: 'Rain Rate', value: 'rain_rate_mmph', icon: CloudRain },
        { label: 'Soil Moisture', value: 'soil_rh_pct', icon: Radio }, // Icon placeholder
        { label: 'Soil Temperature', value: 'soil_temp_c', icon: Thermometer },
        { label: 'Air Pressure', value: 'air_pressure_kpa', icon: Gauge },
    ];

    // Derived state
    const activePlots = useMemo(() => allPlots.filter(p => p.status === 'active'), [allPlots]);
    const pendingPlots = useMemo(() => allPlots.filter(p => p.status === 'pending'), [allPlots]);
    const rejectedPlots = useMemo(() => allPlots.filter(p => p.status === 'rejected'), [allPlots]);


    // Initial Fetch
    useEffect(() => {
        const fetchPlots = async () => {
            try {
                const plotsRes = await getMyFarmPlots();
                if (plotsRes.success && plotsRes.data) {
                    setAllPlots(plotsRes.data);
                    const firstActive = plotsRes.data.find(p => p.status === 'active');
                    if (firstActive) {
                        setSelectedPlotId(firstActive.plot_id.toString());
                    }
                }
            } catch (err) {
                console.error('Failed to fetch plots:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlots();
    }, []);

    // Fetch data when plot changes
    useEffect(() => {
        const fetchPlotData = async () => {
            if (!selectedPlotId) return;

            setDataLoading(true);
            const currentPlot = activePlots.find(p => p.plot_id.toString() === selectedPlotId);

            if (currentPlot) {
                try {
                    // Fetch Disease Risk for the plot
                    getPlotDiseaseRisk(currentPlot.plot_id).then(res => {
                        if (res.success && res.data) setDiseaseRisk(res.data);
                        else setDiseaseRisk(null);
                    });

                    if (currentPlot.nearest_station_id) {
                        const [stationRes, dataRes] = await Promise.all([
                            getStationById(currentPlot.nearest_station_id),
                            getStationLatestData(currentPlot.nearest_station_id)
                        ]);

                        if (stationRes.success && stationRes.data) {
                            setStation(stationRes.data);
                        }

                        if (dataRes.success && dataRes.data) {
                            const flattenedData = dataRes.data.map((item: any) => ({
                                ...item.sensor,
                                value: item.latestData?.value,
                                recorded_at: item.latestData?.recorded_at,
                                data_id: item.latestData?.data_id
                            }));

                            setSensorData(flattenedData);

                            // Fetch history for charts
                            fetchChartHistory(flattenedData, timeRange);
                        } else {
                            setSensorData([]);
                        }
                    } else {
                        setStation(null);
                        setSensorData([]);
                    }
                } catch (error) {
                    console.error("Error fetching plot data", error);
                }
            }
            setDataLoading(false);
        };

        fetchPlotData();
    }, [selectedPlotId, activePlots]);

    useEffect(() => {
        if (sensorData.length > 0) {
            fetchChartHistory(sensorData, timeRange);
        }
    }, [timeRange, sensorData]);

    const fetchChartHistory = async (sensors: any[], range: string) => {
        if (!sensors.length) return;

        // Calculate Start Date
        const endDate = new Date();
        let startDate = subHours(endDate, 24); // Default 24h

        switch (range) {
            case '30m': startDate = subMinutes(endDate, 30); break;
            case '1h': startDate = subHours(endDate, 1); break;
            case '3h': startDate = subHours(endDate, 3); break;
            case '6h': startDate = subHours(endDate, 6); break;
            case '24h': startDate = subHours(endDate, 24); break;
            case '14d': startDate = subDays(endDate, 14); break;
            case '30d': startDate = subDays(endDate, 30); break;
        }

        // Helper to find sensor by type substring
        const findSensor = (keyword: string) => sensors.find(s => s.sensor_type.includes(keyword));

        // Define sensors to fetch
        const targets = [
            { key: 'air_temp_c', sensor: findSensor('air_temp_c') || findSensor('temp') },
            { key: 'air_rh_pct', sensor: findSensor('air_rh_pct') || findSensor('humid') },
            { key: 'rain_rate_mmph', sensor: findSensor('rain_rate') || findSensor('rain') },
            { key: 'soil_rh_pct', sensor: findSensor('soil_rh') || findSensor('soil') },
            { key: 'soil_temp_c', sensor: findSensor('soil_temp') },
            { key: 'air_pressure_kpa', sensor: findSensor('pressure') },
        ];

        // Fetch all concurrently
        const results = await Promise.all(
            targets.map(async (t) => {
                if (!t.sensor) return { key: t.key, data: [] };
                try {
                    const res = await getSensorData(t.sensor.sensor_id, startDate.toISOString(), endDate.toISOString());
                    return { key: t.key, data: res.success && res.data ? res.data : [] };
                } catch (e) {
                    console.error(`Error fetching ${t.key}`, e);
                    return { key: t.key, data: [] };
                }
            })
        );

        // Merge Data Strategy: Bucket by timestamp
        const timeMap = new Map<string, any>();

        // Date formatting for chart axis
        const axisFormat = ['30m', '1h', '3h'].includes(range) ? 'HH:mm' :
            ['6h', '24h'].includes(range) ? 'HH:mm' : 'dd/MM';

        results.forEach(({ key, data }) => {
            data.forEach((point: any) => {
                // Round time to nearest minute to align slightly off sensors
                const date = new Date(point.recorded_at);
                date.setSeconds(0, 0);
                const timeKey = date.getTime();

                if (!timeMap.has(timeKey.toString())) {
                    timeMap.set(timeKey.toString(), {
                        originalTime: date,
                        time: format(date, axisFormat),
                        fullDate: date.toISOString(), // for sorting
                    });
                }
                const entry = timeMap.get(timeKey.toString());
                entry[key] = point.value; // Inject value dynamically
            });
        });

        // Convert Map to Array and Sort
        const mergedData = Array.from(timeMap.values()).sort((a, b) =>
            new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
        );

        setChartData(mergedData);
    };

    if (loading) return <DashboardSkeleton />;
    if (allPlots.length === 0) return <WelcomeState />;
    if (activePlots.length === 0) return <PendingState plots={[...pendingPlots, ...rejectedPlots]} />;

    const currentPlot = activePlots.find(p => p.plot_id.toString() === selectedPlotId);

    // Safe values for the UI
    const rainValue = sensorData.find(s => s.sensor_type.toLowerCase().includes('rain'))?.value ?? 0;
    const soilValue = sensorData.find(s => s.sensor_type.toLowerCase().includes('soil'))?.value ?? 0;
    const windValue = sensorData.find(s => s.sensor_type.toLowerCase().includes('wind'))?.value ?? 0;

    // Risk Pillars Data
    const riskData = [
        { subject: 'Drought', A: soilValue < 30 ? 90 : 20, fullMark: 100 }, // Mock logic: Low soil moisture = high drought risk
        { subject: 'Flood', A: rainValue > 50 ? 80 : 10, fullMark: 100 }, // Mock logic
        { subject: 'Storm', A: windValue > 20 ? 70 : 15, fullMark: 100 }, // Mock logic
        { subject: 'Pests', A: (diseaseRisk?.bus_score || 0) > 2 ? 85 : 30, fullMark: 100 },
    ];

    const isHighRisk = (diseaseRisk?.bus_score || 0) >= 2.25;

    return (
        <DashboardLayout>
            <div className="space-y-10 animate-in fade-in duration-500 pb-10">
                {/* Header: Plot Selector & Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Farm Dashboard</h1>
                        <p className="text-muted-foreground">Monitor your farm's health and risks in real-time.</p>
                    </div>
                    <div className="w-full md:w-[250px]">
                        <Select value={selectedPlotId || ''} onValueChange={setSelectedPlotId}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select Plot" />
                            </SelectTrigger>
                            <SelectContent>
                                {activePlots.map(p => (
                                    <SelectItem key={p.plot_id} value={p.plot_id.toString()}>
                                        Plot #{p.plot_id} - {p.land_title_deed || 'No Deed'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 1. 4-Pillar Risk Analysis (Top Section) */}
                <div className="grid gap-4 md:grid-cols-4">
                    <RiskCard
                        title="ภัยแล้ง"
                        subTitle="Drought Risk"
                        percent={riskData[0].A}
                        type="drought"
                    />
                    <RiskCard
                        title="น้ำท่วม"
                        subTitle="Flood Risk"
                        percent={riskData[1].A}
                        type="flood"
                    />
                    <RiskCard
                        title="พายุ"
                        subTitle="Storm Risk"
                        percent={riskData[2].A}
                        type="storm"
                    />
                    <RiskCard
                        title="โรค/แมลง"
                        subTitle="Disease Risk"
                        percent={riskData[3].A}
                        type="disease"
                    />
                </div>

                {/* 2. Middle Section: Map & Risk Analysis */}
                <div className="grid gap-6 md:grid-cols-12 items-start h-[700px]">
                    {/* Interactive Map (Left - Larger) */}
                    <Card className="md:col-span-8 overflow-hidden flex flex-col h-[700px]">
                        <CardHeader className="py-4 px-6 border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <MapIcon className="h-5 w-5" /> Plot & Station Map
                                </CardTitle>
                                {station && (
                                    <Badge variant={station.status === 'normal' ? 'default' : 'destructive'}>
                                        Station: {station.status}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <div className="flex-1 relative z-0 min-h-0">
                            {currentPlot && (
                                <MapContainer
                                    center={[currentPlot.lat, currentPlot.lon]}
                                    zoom={13}
                                    className="h-full w-full"
                                    scrollWheelZoom={true}
                                >
                                    <MapResetControl />
                                    <TileLayer
                                        attribution='&copy; OpenStreetMap'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapCentering center={[currentPlot.lat, currentPlot.lon]} />

                                    {/* User Plot */}
                                    <Marker position={[currentPlot.lat, currentPlot.lon]} icon={farmPlotIcon}>
                                        <Popup>
                                            <div className="font-semibold">My Plot #{currentPlot.plot_id}</div>
                                            <div className="text-xs">{currentPlot.utm_coords}</div>
                                        </Popup>
                                    </Marker>

                                    {/* Station */}
                                    {station && (
                                        <>
                                            <Marker
                                                position={[station.latitude, station.longitude]}
                                                icon={createStationIcon(station.status)}
                                            >
                                                <Popup>
                                                    <div className="font-semibold">{station.station_name}</div>
                                                    <div className="text-xs">Distance: ~{(Math.sqrt(Math.pow(station.latitude - currentPlot.lat, 2) + Math.pow(station.longitude - currentPlot.lon, 2)) * 111).toFixed(2)} km</div>
                                                </Popup>
                                            </Marker>
                                            {/* Line connecting them */}
                                            <Polyline
                                                positions={[
                                                    [currentPlot.lat, currentPlot.lon],
                                                    [station.latitude, station.longitude]
                                                ]}
                                                pathOptions={{ color: 'blue', dashArray: '5, 10' }}
                                            />
                                        </>
                                    )}
                                </MapContainer>
                            )}

                            {/* Overlay Info */}
                            <div className="absolute top-4 right-4 z-[999] bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg border max-w-lg">
                                <h4 className="font-semibold text-sm mb-2 border-b pb-1 text-black">Plot Details</h4>
                                <div className="space-y-1 font-semibold text-xs text-black">
                                    <div className="flex justify-between"><span>Deed:</span> <span className="font-mono">{currentPlot?.land_title_deed}</span></div>
                                    <div className="flex justify-between"><span>Area:</span> <span>{currentPlot?.area_size_rai} Rai</span></div>
                                    <div className="flex justify-between"><span>UTM:</span> <span className="font-mono">{currentPlot?.utm_coords || '-'}</span></div>
                                    <div className="flex justify-between text-muted-foreground mt-2"><span>Nearest Station:</span> <span>{station?.station_name || 'N/A'}</span></div>
                                </div>
                            </div>

                            {/* Interaction Hint */}
                            <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border flex items-center gap-2 pointer-events-none">
                                <div className="bg-primary/10 p-1.5 rounded">
                                    <span className="text-xs font-bold text-primary">Ctrl</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium">
                                    + Scroll / Drag to Zoom & Pan
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Sensor Status (Right - Smaller) */}
                    <div className="md:col-span-4 flex flex-col gap-4 h-[700px]">
                        <div className="bg-card rounded-xl border shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Monitor className="h-5 w-5 text-blue-600" />
                                    Live Sensors
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-xs text-muted-foreground">Live</span>
                                </div>
                            </div>

                            <div className="p-4 overflow-y-auto grow">
                                {sensorData.filter(s => s.sensor_type in sensorTypeLabels).length > 0 ? (
                                    <div className="space-y-3">
                                        {sensorData
                                            .filter(s => s.sensor_type in sensorTypeLabels)
                                            .map((sensor, idx) => (
                                                <MiniSensorCard key={sensor.sensor_id || idx} data={sensor} />
                                            ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                                        <Monitor className="h-10 w-10 mb-2 opacity-20" />
                                        <p>No sensor data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Bottom Section: Environmental Trends */}
                <Card className="overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 py-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" /> Environmental Trends
                                </CardTitle>

                                {/* Time Range Selector - Quick Access */}
                                <div className="flex items-center gap-1 bg-background p-1 rounded-lg border">
                                    <Select value={timeRange} onValueChange={setTimeRange}>
                                        <SelectTrigger className="h-7 w-auto px-2 border-0 focus:ring-0 bg-transparent hover:bg-muted/50 transition-colors flex items-center gap-1.5 rounded-md">
                                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                                                {timeRange === '24h' ? '24 hr' : timeRange}
                                            </span>
                                        </SelectTrigger >
                                        <SelectContent align="end">
                                            <SelectItem value="30m">30 Mins</SelectItem>
                                            <SelectItem value="1h">1 Hour</SelectItem>
                                            <SelectItem value="3h">3 Hours</SelectItem>
                                            <SelectItem value="6h">6 Hours</SelectItem>
                                            <SelectItem value="24h">24 Hours</SelectItem>
                                            <SelectItem value="14d">14 Days</SelectItem>
                                            <SelectItem value="30d">30 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Metric Filters - Visual Toggles */}
                            <div className="flex flex-wrap gap-2">
                                {metricOptions.map((option) => {
                                    const isSelected = selectedMetrics.includes(option.value);
                                    const config = METRIC_CONFIG[option.value];
                                    const Icon = option.icon || Activity;

                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedMetrics(prev => prev.filter(m => m !== option.value));
                                                } else {
                                                    setSelectedMetrics(prev => [...prev, option.value]);
                                                }
                                            }}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border select-none",
                                                isSelected
                                                    ? "bg-white shadow-sm border-transparent ring-1 ring-border"
                                                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                                            )}
                                            style={isSelected ? { borderColor: config.color, color: config.color } : {}}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            {option.label}
                                            {isSelected && <span className="ml-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="time"
                                        minTickGap={30}
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />

                                    {/* Y-Axes Configuration */}
                                    <YAxis yAxisId="temp" orientation="left" stroke="#f97316" label={{ value: '°C', angle: -90, position: 'insideLeft', fill: '#f97316' }} />
                                    <YAxis yAxisId="percent" orientation="right" stroke="#3b82f6" label={{ value: '%', angle: 90, position: 'insideRight', fill: '#3b82f6' }} />
                                    <YAxis yAxisId="pressure" orientation="right" hide domain={['auto', 'auto']} />
                                    <YAxis yAxisId="rain" orientation="right" hide domain={[0, 'auto']} />

                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />

                                    {/* Dynamic Lines based on selection */}
                                    {selectedMetrics.map((metricKey) => {
                                        const config = METRIC_CONFIG[metricKey];
                                        if (!config) return null;
                                        return (
                                            <Line
                                                key={metricKey}
                                                yAxisId={config.axisId}
                                                type="monotone"
                                                dataKey={metricKey}
                                                name={config.label}
                                                unit={config.unit}
                                                stroke={config.color}
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                connectNulls
                                            />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div >
        </DashboardLayout >
    );
}

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover/95 backdrop-blur border rounded-xl shadow-xl p-3 text-xs min-w-[150px]">
                <p className="font-semibold mb-2 text-foreground border-b pb-2 flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {label}
                </p>
                <div className="space-y-1.5">
                    {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full ring-2 ring-opacity-50" style={{ backgroundColor: p.color, '--tw-ring-color': p.color } as any} />
                                <span className="text-muted-foreground">{p.name}</span>
                            </div>
                            <span className="font-mono font-bold">
                                {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
                                <span className="text-muted-foreground/70 ml-0.5 text-[10px]">{p.unit}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// --- Sub States ---

function WelcomeState() {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="p-6 bg-emerald-50 rounded-full">
                    <Sprout className="h-16 w-16 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold">Welcome to Smart Farm View</h2>
                <p className="max-w-md text-muted-foreground">Register your first farm plot to start monitoring environmental data and disease risks.</p>
                <Button size="lg" asChild>
                    <Link to="/register-plot">Register Plot</Link>
                </Button>
            </div>
        </DashboardLayout>
    );
}

function PendingState({ plots }: { plots: FarmPlot[] }) {
    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="p-6 bg-amber-50 rounded-full">
                    <Clock className="h-16 w-16 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold">Registration Pending</h2>
                <p className="max-w-md text-muted-foreground">
                    You have {plots.length} plot(s) waiting for approval.
                    Once approved, your dashboard will activate automatically.
                </p>
            </div>
        </DashboardLayout>
    );
}



function RiskCard({ title, subTitle, percent, type }: { title: string, subTitle: string, percent: number, type: 'drought' | 'flood' | 'storm' | 'disease' }) {
    const getConfig = () => {
        switch (type) {
            case 'drought': // Orange/Yellow
                return {
                    icon: Thermometer,
                    bg: 'bg-orange-50 dark:bg-orange-950/20',
                    border: 'border-orange-100 dark:border-orange-900',
                    text: 'text-orange-600 dark:text-orange-400',
                    bar: 'bg-orange-500'
                };
            case 'flood': // Blue
                return {
                    icon: CloudRain,
                    bg: 'bg-blue-50 dark:bg-blue-950/20',
                    border: 'border-blue-100 dark:border-blue-900',
                    text: 'text-blue-600 dark:text-blue-400',
                    bar: 'bg-blue-500'
                };
            case 'storm': // Purple
                return {
                    icon: Wind,
                    bg: 'bg-purple-50 dark:bg-purple-950/20',
                    border: 'border-purple-100 dark:border-purple-900',
                    text: 'text-purple-600 dark:text-purple-400',
                    bar: 'bg-purple-500'
                };
            case 'disease': // Red/Pink
                return {
                    icon: AlertTriangle, // Using Alert for Bug replacement if needed, or import Bug
                    bg: 'bg-red-50 dark:bg-red-950/20',
                    border: 'border-red-100 dark:border-red-900',
                    text: 'text-red-600 dark:text-red-400',
                    bar: 'bg-red-500'
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    // Determine Status
    let status = 'Low Risk';
    let levelText = 'Low';
    let statusColor = 'bg-emerald-500';
    if (percent >= 40) {
        status = 'Medium Risk';
        levelText = 'Medium';
        statusColor = 'bg-amber-500';
    }
    if (percent >= 70) {
        status = 'High Risk';
        levelText = 'High';
        statusColor = 'bg-red-500';
    }

    return (
        <Card className={`border ${config.border} shadow-sm hover:shadow-md transition-all`}>
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-base">{title}</h4>
                        <p className="text-xs text-muted-foreground">{subTitle}</p>
                    </div>
                    <div className={`p-2 rounded-full ${config.bg} ${config.text}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-end gap-1">
                        <span className={`text-3xl font-bold ${config.text.split(' ')[0]}`}>{levelText}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${config.bar} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>

                    <Badge className={`w-full justify-center ${statusColor} text-white hover:bg-opacity-90 border-0`}>
                        {status}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

function MiniSensorCard({ data }: { data: any }) {
    const navigate = useNavigate();

    const getIcon = (type: string) => {
        const lower = (type || '').toLowerCase();
        if (lower.includes('temp')) return Thermometer;
        if (lower.includes('humid')) return Droplets;
        if (lower.includes('rain')) return CloudRain;
        if (lower.includes('wind')) return Wind;
        if (lower.includes('press')) return Gauge;
        if (lower.includes('soil')) return Radio;
        return Activity;
    };

    const getColor = (type: string) => {
        const lower = (type || '').toLowerCase();
        if (lower.includes('temp')) return { text: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:border-orange-400' };
        if (lower.includes('humid')) return { text: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:border-blue-400' };
        if (lower.includes('rain')) return { text: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-200', hover: 'hover:border-cyan-400' };
        if (lower.includes('wind')) return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', hover: 'hover:border-slate-400' };
        if (lower.includes('soil')) return { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:border-emerald-400' };
        return { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:border-emerald-400' };
    };

    const Icon = getIcon(data.sensor_type);
    const colors = getColor(data.sensor_type);

    return (
        <div
            onClick={() => navigate(`/sensors/${data.sensor_id}`)}
            className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer group"
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors" title={sensorTypeLabels[data.sensor_type]}>
                    {sensorTypeLabels[data.sensor_type] || (data.sensor_type || 'Sensor').replace(/_/g, ' ')}
                </span>
            </div>

            <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-bold tracking-tight ${colors.text}`}>
                    {typeof data.value === 'number' ? data.value.toFixed(1) : (data.value || '--')}
                </span>
                {(sensorTypeUnits[data.sensor_type] || data.unit) && (
                    <span className="text-xs font-medium text-muted-foreground/70">
                        {sensorTypeUnits[data.sensor_type] || data.unit}
                    </span>
                )}
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex justify-between">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-12 h-[500px]">
                    <Skeleton className="md:col-span-8 rounded-xl" />
                    <Skeleton className="md:col-span-4 rounded-xl" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </DashboardLayout>
    );
}
