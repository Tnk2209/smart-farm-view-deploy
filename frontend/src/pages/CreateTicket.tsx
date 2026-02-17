import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getStationById, getStationLatestData } from '@/lib/api';
import { Sensor } from '@/lib/types';

export default function CreateTicket() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const stationIdParam = searchParams.get('station_id');
    const sourceParam = searchParams.get('source'); // 'qr' or undefined
    const { user } = useAuth();

    const isTechnicalUser = user?.role === 'MANAGER' || user?.role === 'SUPER_USER';
    // If technical user coming from station QR, imply HARDWARE. Otherwise if general user, default to SOFTWARE.
    const defaultCategory = (isTechnicalUser && stationIdParam) ? 'HARDWARE' : 'SOFTWARE';

    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
        defaultValues: {
            category: defaultCategory,
            topic: '',
            description: '',
            priority: 'normal',
            station_id: stationIdParam || '',
            affected_sensor: '',
            error_code: '',
            tech_note: ''
        }
    });

    // If station_id is present, fetch station details to show name
    const { data: stationRes } = useQuery({
        queryKey: ['station', stationIdParam],
        queryFn: async () => {
            if (!stationIdParam) return null;
            return await getStationById(parseInt(stationIdParam));
        },
        enabled: !!stationIdParam
    });

    const station = stationRes?.data;
    // const isTechnicalUser is defined above used by useForm defaultValues

    // Fetch sensors for technical users if station is selected
    const { data: sensorsRes } = useQuery({
        queryKey: ['station-sensors', stationIdParam],
        queryFn: async () => {
            if (!stationIdParam) return null;
            return await getStationLatestData(parseInt(stationIdParam));
        },
        enabled: !!stationIdParam && isTechnicalUser
    });

    const sensors = sensorsRes?.data?.map((d: any) => d.sensor as Sensor) || [];

    const createMutation = useMutation({
        mutationFn: ticketService.createTicket,
        onSuccess: () => {
            toast.success('แจ้งปัญหาเรียบร้อยแล้ว');
            navigate('/support');
        },
        onError: () => {
            toast.error('ไม่สามารถแจ้งปัญหาได้ โปรดลองใหม่อีกครั้ง');
        }
    });

    const onSubmit = (data: any) => {
        // Format technical details into description if present
        let finalDescription = data.description;
        if (isTechnicalUser && data.category === 'HARDWARE') {
            const techParts = [];
            if (data.affected_sensor) {
                const sensor = sensors.find(s => s.sensor_id.toString() === data.affected_sensor);
                techParts.push(`Affected Sensor: ${sensor?.sensor_type || data.affected_sensor} (ID: ${data.affected_sensor})`);
            }
            if (data.error_code) techParts.push(`Error Code: ${data.error_code}`);
            if (data.tech_note) techParts.push(`Technical Note: ${data.tech_note}`);

            if (techParts.length > 0) {
                finalDescription += `\n\n--- Technical Details ---\n${techParts.join('\n')}`;
            }
        }

        createMutation.mutate({
            ...data,
            description: finalDescription,
            source: sourceParam === 'qr' ? 'QR_CODE' : 'WEB',
            station_id: data.station_id ? parseInt(data.station_id) : undefined
        });
    };

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-8 pb-12">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/support')} className="gap-2 mb-4 pl-0 hover:bg-transparent hover:text-primary transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        กลับไปหน้า Support
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">แจ้งปัญหาใหม่</h1>
                    <p className="text-muted-foreground mt-2">
                        กรอกรายละเอียดปัญหาที่พบเพื่อให้ทีมงานตรวจสอบและแก้ไข
                    </p>
                </div>

                <Card className="border-none shadow-lg overflow-hidden">
                    {/* Station Info Banner (if from QR) */}
                    {stationIdParam && (
                        <div className="bg-primary/10 border-b border-primary/20 p-6 flex items-start gap-4">
                            <div className="bg-primary/20 p-2.5 rounded-full">
                                <Loader2 className="h-6 w-6 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-primary-foreground/90 text-foreground">แจ้งปัญหาจากสถานี: {station?.station_name || `Station #${stationIdParam}`}</h3>
                                <p className="text-sm text-muted-foreground mt-1">Device ID: <span className="font-mono">{station?.device_id}</span></p>
                                <input type="hidden" {...register('station_id')} />
                            </div>
                        </div>
                    )}

                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2.5">
                                        <Label htmlFor="category" className="text-sm font-semibold text-foreground/80">หมวดหมู่ปัญหา</Label>
                                        <Select onValueChange={(val) => setValue('category', val as any)} defaultValue={defaultCategory}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="เลือกหมวดหมู่" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* Hardware option available only for Technical Users via QR/Station context */}
                                                {isTechnicalUser && stationIdParam && <SelectItem value="HARDWARE">อุปกรณ์ฮาร์ดแวร์ (Hardware)</SelectItem>}
                                                <SelectItem value="SOFTWARE">ซอฟต์แวร์/แอปพลิเคชัน (Software)</SelectItem>
                                                <SelectItem value="DATA">ข้อมูลผิดปกติ (Data Issue)</SelectItem>
                                                {!stationIdParam && <SelectItem value="ACCOUNT">บัญชีผู้ใช้ (Account)</SelectItem>}
                                                <SelectItem value="OTHER">อื่นๆ (Other)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="priority" className="text-sm font-semibold text-foreground/80">ความเร่งด่วน</Label>
                                        <Select onValueChange={(val) => setValue('priority', val)} defaultValue="normal">
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="เลือกระดับความเร่งด่วน" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                                        ต่ำ (รอได้)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="normal">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                        ปกติ (ทั่วไป)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="high">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                        สูง (กระทบการงาน)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="critical">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                        วิกฤต (ระบบล่ม)
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <Label htmlFor="topic" className="text-sm font-semibold text-foreground/80">หัวข้อปัญหา</Label>
                                    <Input
                                        id="topic"
                                        className="h-11"
                                        {...register('topic', { required: 'โปรดระบุหัวข้อปัญหา' })}
                                        placeholder="เช่น เข้าใช้งานไม่ได้, เซ็นเซอร์ไม่อ่านค่า"
                                    />
                                    {errors.topic && <p className="text-sm text-destructive mt-1">{errors.topic.message as string}</p>}
                                </div>

                                <div className="space-y-2.5">
                                    <Label htmlFor="description" className="text-sm font-semibold text-foreground/80">รายละเอียดเพิ่มเติม</Label>
                                    <Textarea
                                        id="description"
                                        className="min-h-[150px] resize-y"
                                        {...register('description', { required: 'โปรดระบุรายละเอียด' })}
                                        placeholder="อธิบายอาการที่พบ หรือสิ่งที่ต้องการให้ช่วยเหลือ..."
                                    />
                                    {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message as string}</p>}
                                </div>
                            </div>

                            {isTechnicalUser && watch('category') === 'HARDWARE' && (
                                <div className="rounded-xl border bg-muted/30 overflow-hidden">
                                    <div className="bg-muted px-6 py-3 border-b flex items-center gap-2">
                                        <div className="p-1 bg-foreground/10 rounded">
                                            <Loader2 className="h-4 w-4" /> {/* Just using an icon, loader2 is a placeholder icon name */}
                                        </div>
                                        <h3 className="font-semibold text-sm uppercase tracking-wide text-foreground/80">
                                            ข้อมูลทางเทคนิค (สำหรับเจ้าหน้าที่)
                                        </h3>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {stationIdParam && (
                                                <div className="space-y-2.5">
                                                    <Label htmlFor="affected_sensor" className="text-sm font-medium">อุปกรณ์ที่พบปัญหา</Label>
                                                    <Select onValueChange={(val) => setValue('affected_sensor', val)}>
                                                        <SelectTrigger className="h-10 bg-background">
                                                            <SelectValue placeholder="เลือกเซ็นเซอร์ (ถ้ามี)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {sensors.map((sensor) => (
                                                                <SelectItem key={sensor.sensor_id} value={sensor.sensor_id.toString()}>
                                                                    {sensor.sensor_type} ({sensor.sensor_id})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div className="space-y-2.5">
                                                <Label htmlFor="error_code" className="text-sm font-medium">รหัสข้อผิดพลาด (Error Code)</Label>
                                                <Input
                                                    id="error_code"
                                                    className="h-10 bg-background font-mono text-sm"
                                                    {...register('error_code')}
                                                    placeholder="เช่น ERR-001, 503"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2.5">
                                            <Label htmlFor="tech_note" className="text-sm font-medium">หมายเหตุทางเทคนิค</Label>
                                            <Textarea
                                                id="tech_note"
                                                {...register('tech_note')}
                                                placeholder="รายละเอียดเพิ่มเติมทางเทคนิค..."
                                                rows={3}
                                                className="bg-background font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-4 border-t">
                                <Button variant="outline" type="button" onClick={() => navigate('/support')} className="w-32">
                                    ยกเลิก
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending} className="w-32 shadow-lg hover:shadow-xl transition-all">
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    ส่งแจ้งปัญหา
                                </Button>
                            </div>

                        </form>
                    </CardContent >
                </Card >
            </div >
        </DashboardLayout >
    );
}
