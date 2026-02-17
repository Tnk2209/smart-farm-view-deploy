import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getThresholds, updateThreshold } from '@/lib/api';
import { Threshold } from '@/lib/types';
import { SensorIcon, sensorTypeLabels, sensorTypeUnits } from '@/components/SensorIcon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { SlidersHorizontal, Edit, Save } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AdminThresholds() {
    const [thresholds, setThresholds] = useState<Threshold[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingThreshold, setEditingThreshold] = useState<Threshold | null>(null);
    const [formData, setFormData] = useState({ min_value: 0, max_value: 0 });
    const { toast } = useToast();

    useEffect(() => {
        fetchThresholds();
    }, []);

    const fetchThresholds = async () => {
        try {
            const response = await getThresholds();
            if (response.success) {
                setThresholds(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch thresholds:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (threshold: Threshold) => {
        setEditingThreshold(threshold);
        setFormData({
            min_value: threshold.min_value,
            max_value: threshold.max_value,
        });
    };

    const handleSave = async () => {
        if (!editingThreshold) return;

        if (formData.min_value >= formData.max_value) {
            toast({
                title: "Validation Error",
                description: "Minimum value must be less than maximum value.",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await updateThreshold(editingThreshold.threshold_id, {
                min_value: formData.min_value,
                max_value: formData.max_value,
            });

            if (response.success && response.data) {
                setThresholds(prev => prev.map(t =>
                    t.threshold_id === editingThreshold.threshold_id ? response.data! : t
                ));
                setEditingThreshold(null);
                toast({
                    title: "Threshold Updated",
                    description: `${sensorTypeLabels[editingThreshold.sensor_type]} threshold has been updated.`,
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update threshold.",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Threshold Management</h1>
                    <p className="text-muted-foreground">
                        Configure alert thresholds for each sensor type
                    </p>
                </div>

                {/* Info Card */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <SlidersHorizontal className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="font-medium">About Thresholds</p>
                                <p className="text-sm text-muted-foreground">
                                    Thresholds define the acceptable range for each sensor type. When a sensor reading
                                    falls outside this range, an alert will be generated. The minimum value must always
                                    be less than the maximum value.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Thresholds Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5" />
                            All Thresholds ({thresholds.length})
                        </CardTitle>
                        <CardDescription>
                            Define min/max values for sensor alerts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sensor Type</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Min Value</TableHead>
                                    <TableHead>Max Value</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {thresholds.map((threshold) => (
                                    <TableRow key={threshold.threshold_id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <SensorIcon type={threshold.sensor_type} className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{sensorTypeLabels[threshold.sensor_type]}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {sensorTypeUnits[threshold.sensor_type]}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono">{threshold.min_value}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono">{threshold.max_value}</span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {format(new Date(threshold.updated_at), 'MMM d, yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(threshold)}
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={!!editingThreshold} onOpenChange={(open) => !open && setEditingThreshold(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Edit Threshold - {editingThreshold && sensorTypeLabels[editingThreshold.sensor_type]}
                            </DialogTitle>
                            <DialogDescription>
                                Configure the acceptable range for this sensor type.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="min_value">
                                    Minimum Value ({editingThreshold && sensorTypeUnits[editingThreshold.sensor_type]})
                                </Label>
                                <Input
                                    id="min_value"
                                    type="number"
                                    step="0.1"
                                    value={formData.min_value}
                                    onChange={(e) => setFormData(prev => ({ ...prev, min_value: parseFloat(e.target.value) || 0 }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Alert will be triggered if value falls below this.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="max_value">
                                    Maximum Value ({editingThreshold && sensorTypeUnits[editingThreshold.sensor_type]})
                                </Label>
                                <Input
                                    id="max_value"
                                    type="number"
                                    step="0.1"
                                    value={formData.max_value}
                                    onChange={(e) => setFormData(prev => ({ ...prev, max_value: parseFloat(e.target.value) || 0 }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Alert will be triggered if value exceeds this.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingThreshold(null)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}