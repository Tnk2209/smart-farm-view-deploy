import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getRiskDashboardSummary } from '../lib/api';
import type { RiskDashboardSummary, PillarType, RiskLevel, StationRisk } from '../lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertTriangle,
  Droplets,
  Wind,
  CloudRain,
  Bug,
  RefreshCw,
  Info,
  TrendingUp,
  Activity,
  ArrowUpDown,
  Filter,
  MapPin,
} from 'lucide-react';

// Combined station risk across all 4 pillars
interface StationRiskRow {
  station_id: number;
  station_name: string;
  province: string;
  drought: StationRisk | null;
  flood: StationRisk | null;
  storm: StationRisk | null;
  disease: StationRisk | null;
}

export default function RiskDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<RiskDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(10);

  // Filter & Sort state
  const [filterProvince, setFilterProvince] = useState<string>('all');
  const [filterRiskLevel, setFilterRiskLevel] = useState<RiskLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'province'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRiskDashboardSummary(days);
      if (response.success && response.data) {
        setDashboardData(response.data);
      } else {
        setError(response.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [days]);

  // Combine station risks from all 4 pillars
  const combineStationRisks = (data: RiskDashboardSummary): StationRiskRow[] => {
    const stationMap = new Map<number, StationRiskRow>();

    // Process all 4 pillars
    const pillars: PillarType[] = ['drought', 'flood', 'storm', 'disease'];
    
    pillars.forEach((pillar) => {
      data[pillar].stations.forEach((station) => {
        if (!stationMap.has(station.station_id)) {
          stationMap.set(station.station_id, {
            station_id: station.station_id,
            station_name: station.station_name,
            province: station.province,
            drought: null,
            flood: null,
            storm: null,
            disease: null,
          });
        }
        const row = stationMap.get(station.station_id)!;
        row[pillar] = station;
      });
    });

    return Array.from(stationMap.values());
  };

  // Get unique provinces for filter
  const provinces = useMemo(() => {
    if (!dashboardData) return [];
    const rows = combineStationRisks(dashboardData);
    return Array.from(new Set(rows.map(r => r.province))).sort();
  }, [dashboardData]);

  // Filtered and sorted station rows
  const stationRows = useMemo(() => {
    if (!dashboardData) return [];
    
    let rows = combineStationRisks(dashboardData);

    // Filter by province
    if (filterProvince !== 'all') {
      rows = rows.filter(r => r.province === filterProvince);
    }

    // Filter by risk level (any pillar matches)
    if (filterRiskLevel !== 'all') {
      rows = rows.filter(r => 
        r.drought?.risk_level === filterRiskLevel ||
        r.flood?.risk_level === filterRiskLevel ||
        r.storm?.risk_level === filterRiskLevel ||
        r.disease?.risk_level === filterRiskLevel
      );
    }

    // Sort
    rows.sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'name') {
        compareValue = a.station_name.localeCompare(b.station_name, 'th');
      } else if (sortBy === 'province') {
        compareValue = a.province.localeCompare(b.province, 'th');
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return rows;
  }, [dashboardData, filterProvince, filterRiskLevel, sortBy, sortOrder]);

  const getPillarConfig = (type: PillarType) => {
    const configs = {
      drought: {
        title: 'ภัยแล้ง',
        titleEn: 'Drought Risk',
        icon: Droplets,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        description: 'Based on rainfall & soil moisture',
      },
      flood: {
        title: 'น้ำท่วม',
        titleEn: 'Flood Risk',
        icon: CloudRain,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        description: 'Based on heavy rainfall & river level',
      },
      storm: {
        title: 'พายุ',
        titleEn: 'Storm Risk',
        icon: Wind,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        description: 'Based on wind speed & pressure',
      },
      disease: {
        title: 'โรค/แมลง',
        titleEn: 'Disease Risk',
        icon: Bug,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        description: 'Based on BUS Algorithm',
      },
    };
    return configs[type];
  };

  const getRiskBadgeVariant = (level: RiskLevel): 'default' | 'secondary' | 'destructive' => {
    switch (level) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  const getRiskBadgeText = (level: RiskLevel): string => {
    switch (level) {
      case 'high':
        return 'High Risk';
      case 'medium':
        return 'Medium Risk';
      case 'low':
        return 'Low Risk';
    }
  };

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
    }
  };

  const toggleSort = (field: 'name' | 'province') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderRiskCell = (risk: StationRisk | null) => {
    if (!risk || risk.risk_score === 0) {
      return (
        <Badge variant="outline" className="text-gray-400">
          N/A
        </Badge>
      );
    }
    return (
      <Badge variant={getRiskBadgeVariant(risk.risk_level)}>
        {risk.risk_level.toUpperCase()}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">4 Pillars Risk Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            ความเสี่ยง 4 ด้าน: ภัยแล้ง, น้ำท่วม, พายุ, โรคและแมลงศัตรูพืช
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={10}>Last 10 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <Button onClick={fetchDashboardData} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>4 Pillars Risk Analysis:</strong> ระบบวิเคราะห์ความเสี่ยง 4 ด้านหลัก โดย Disease Risk ใช้ 
          <strong> BUS Algorithm</strong> (คำนวณจริง) ส่วนอีก 3 ด้านใช้ simple logic analysis
        </AlertDescription>
      </Alert>

      {/* Loading State */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 4 Pillars Cards */}
      {dashboardData && !loading && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {(['drought', 'flood', 'storm', 'disease'] as PillarType[]).map((pillar) => {
              const config = getPillarConfig(pillar);
              const data = dashboardData[pillar];
              const IconComponent = config.icon;

              return (
                <Card key={pillar} className="hover:shadow-lg transition-shadow">
                  <CardHeader className={`${config.bgColor} rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`h-5 w-5 ${config.color}`} />
                        <CardTitle className="text-lg dark:text-black">{config.title}</CardTitle>
                      </div>
                      <span className="text-2xl">{getRiskIcon(data.risk_level)}</span>
                    </div>
                    <CardDescription className="text-xs">
                      {config.titleEn}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {/* Risk Level Badge */}
                    <div className="flex justify-center">
                      <Badge
                        variant={getRiskBadgeVariant(data.risk_level)}
                        className="text-base px-4 py-1"
                      >
                        {getRiskBadgeText(data.risk_level)}
                      </Badge>
                    </div>

                    {/* Statistics */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Affected Stations</span>
                        <span className="font-semibold">{data.affected_stations}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <span className="text-red-500">●</span> High Risk
                        </span>
                        <span className="font-semibold">{data.high_risk_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <span className="text-orange-500">●</span> Medium Risk
                        </span>
                        <span className="font-semibold">{data.medium_risk_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <span className="text-green-500">●</span> Low Risk
                        </span>
                        <span className="font-semibold">{data.low_risk_count}</span>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (pillar === 'disease') {
                          window.location.href = '/disease-risk';
                        } else {
                          alert(`Detail page for ${config.title} coming soon!`);
                        }
                      }}
                    >
                      View Details →
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Overall Risk Summary
              </CardTitle>
              <CardDescription>
                Last updated: {new Date(dashboardData.last_updated).toLocaleString('th-TH')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Stations</p>
                  <p className="text-2xl font-bold">{dashboardData.total_stations}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">High Risk Alerts</p>
                  <p className="text-2xl font-bold text-red-600">
                    {dashboardData.drought.high_risk_count +
                      dashboardData.flood.high_risk_count +
                      dashboardData.storm.high_risk_count +
                      dashboardData.disease.high_risk_count}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Medium Risk Alerts</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {dashboardData.drought.medium_risk_count +
                      dashboardData.flood.medium_risk_count +
                      dashboardData.storm.medium_risk_count +
                      dashboardData.disease.medium_risk_count}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Analysis Period</p>
                  <p className="text-2xl font-bold">{days} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Station Risk Details Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Station Risk Details
                  </CardTitle>
                  <CardDescription>
                    ความเสี่ยง 4 ด้านของแต่ละสถานี ({stationRows.length} stations)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={filterProvince}
                    onChange={(e) => setFilterProvince(e.target.value)}
                    className="border rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="all">All Provinces</option>
                    {provinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterRiskLevel}
                    onChange={(e) => setFilterRiskLevel(e.target.value as RiskLevel | 'all')}
                    className="border rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="high">High Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort('name')}
                          className="flex items-center gap-1"
                        >
                          Station Name
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[120px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSort('province')}
                          className="flex items-center gap-1"
                        >
                          Province
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center">
                          <Droplets className="h-4 w-4 text-orange-600" />
                          <span className="text-xs">Drought</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center">
                          <CloudRain className="h-4 w-4 text-blue-600" />
                          <span className="text-xs">Flood</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center">
                          <Wind className="h-4 w-4 text-purple-600" />
                          <span className="text-xs">Storm</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex flex-col items-center">
                          <Bug className="h-4 w-4 text-red-600" />
                          <span className="text-xs">Disease</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stationRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No stations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      stationRows.map((row) => (
                        <TableRow key={row.station_id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{row.station_name}</TableCell>
                          <TableCell>{row.province}</TableCell>
                          <TableCell className="text-center">
                            {renderRiskCell(row.drought)}
                          </TableCell>
                          <TableCell className="text-center">
                            {renderRiskCell(row.flood)}
                          </TableCell>
                          <TableCell className="text-center">
                            {renderRiskCell(row.storm)}
                          </TableCell>
                          <TableCell className="text-center">
                            {renderRiskCell(row.disease)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/stations/${row.station_id}`)}
                            >
                              View →
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Table Info */}
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  <strong>Note:</strong> "N/A" indicates insufficient data for risk calculation. 
                  Each pillar requires specific sensors at the station.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Risk Analysis Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Bug className="h-4 w-4 text-red-600" />
                    Disease Risk (โรคและแมลง)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    ใช้ <strong>BUS Algorithm</strong> (Blast Unit of Severity) วิเคราะห์จาก Temperature, Humidity, 
                    Dew Point และ Leaf Wetness Duration - คำนวณจริงตามสูตรวิทยาศาสตร์
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-orange-600" />
                    Drought Risk (ภัยแล้ง)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    วิเคราะห์จาก <strong>Rainfall</strong> (ปริมาณฝน 7 วัน) และ <strong>Soil Moisture</strong> (ความชื้นดิน) 
                    - ใช้ simple logic สำหรับ demo
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CloudRain className="h-4 w-4 text-blue-600" />
                    Flood Risk (น้ำท่วม)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    วิเคราะห์จาก <strong>Heavy Rainfall</strong> (ฝนตก 24 ชม.) และ <strong>River Level</strong> (ระดับน้ำในแม่น้ำ) 
                    - mock calculation
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Wind className="h-4 w-4 text-purple-600" />
                    Storm Risk (พายุ)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    วิเคราะห์จาก <strong>Wind Speed</strong> (ความเร็วลม) และ <strong>Pressure Drop</strong> (การตกของความกดอากาศ) 
                    - simple threshold-based
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </DashboardLayout>
  );
}
