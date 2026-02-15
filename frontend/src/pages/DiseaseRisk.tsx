import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllStationsDiseaseRisk } from '../lib/api';
import type { AllStationsDiseaseRisk, RiskLevel } from '../lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
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
  Activity, 
  Droplets, 
  Thermometer,
  RefreshCw,
  Info,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

export default function DiseaseRisk() {
  const { user } = useAuth();
  const [diseaseData, setDiseaseData] = useState<AllStationsDiseaseRisk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(10);

  const fetchDiseaseRisk = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllStationsDiseaseRisk(days);
      if (response.success && response.data) {
        setDiseaseData(response.data);
      } else {
        setError(response.error || 'Failed to load disease risk data');
      }
    } catch (err) {
      setError('Failed to load disease risk data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiseaseRisk();
  }, [days]);

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

  if (user?.role === 'USER') {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Disease risk analysis is only available for Manager and Super User roles. 
            As a Farmer, you can view disease risk for your registered farm plots in the Farm Plots section.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Disease Risk Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Blast Unit of Severity (BUS) Algorithm - UC12
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
          <Button onClick={fetchDiseaseRisk} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* BUS Algorithm Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>BUS (Blast Unit of Severity)</strong> analyzes temperature and humidity data to predict rice blast disease risk. 
          A BUS score ≥ 2.25 indicates <strong>high risk</strong> of disease occurrence.
        </AlertDescription>
      </Alert>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {diseaseData && !loading && (
        <>
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stations</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{diseaseData.summary.total_stations}</div>
                <p className="text-xs text-muted-foreground">Monitoring stations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {diseaseData.summary.high_risk}
                </div>
                <p className="text-xs text-muted-foreground">BUS ≥ 2.25</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {diseaseData.summary.medium_risk}
                </div>
                <p className="text-xs text-muted-foreground">BUS 1.5 - 2.24</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {diseaseData.summary.low_risk}
                </div>
                <p className="text-xs text-muted-foreground">BUS &lt; 1.5</p>
              </CardContent>
            </Card>
          </div>

          {/* Stations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Disease Risk by Station</CardTitle>
              <CardDescription>
                BUS scores and risk levels for all monitoring stations (last {days} days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead className="text-right">BUS Score</TableHead>
                    <TableHead className="text-right">LWD (hrs)</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diseaseData.stations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No stations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    diseaseData.stations
                      .sort((a, b) => b.bus_score - a.bus_score)
                      .map((station) => (
                        <TableRow key={station.station_id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {station.station_name}
                            </div>
                          </TableCell>
                          <TableCell>{station.province}</TableCell>
                          <TableCell className="text-right font-mono">
                            {station.has_data ? station.bus_score.toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {station.has_data && station.lwd_hours !== undefined ? (
                              <div className="flex items-center justify-end gap-1">
                                <Droplets className="h-3 w-3 text-blue-500" />
                                {station.lwd_hours}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            {station.has_data ? (
                              <Badge variant={getRiskBadgeVariant(station.risk_level)}>
                                {getRiskBadgeText(station.risk_level)}
                              </Badge>
                            ) : (
                              <Badge variant="outline">No Data</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {station.has_data ? (
                              <Badge variant="secondary" className="gap-1">
                                <Activity className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                No Data
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* BUS Calculation Info */}
          <Card>
            <CardHeader>
              <CardTitle>BUS Algorithm Details</CardTitle>
              <CardDescription>
                How the Blast Unit of Severity is calculated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Temperature (T)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Hourly air temperature data from weather stations. Optimal disease development occurs between 19°C - 29°C.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    Relative Humidity (RH)
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Hourly humidity measurements. High RH (&gt;90%) for extended periods increases disease risk.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Dew Point (Td)</h4>
                  <p className="text-sm text-muted-foreground">
                    Calculated using UCAR formula: <code className="bg-muted px-1 py-0.5 rounded">Td = T - (100 - RH) / 5</code>
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Leaf Wetness Duration (LWD)</h4>
                  <p className="text-sm text-muted-foreground">
                    Number of hours with RH &gt; 90%. Minimum 4 hours required for disease development.
                  </p>
                </div>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Risk Threshold:</strong> BUS score ≥ 2.25 indicates high risk of blast disease occurrence. 
                  Farmers should apply preventive measures when risk is elevated.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
