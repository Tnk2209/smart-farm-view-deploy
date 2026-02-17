import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '@/services/ticketService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Calendar, User, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'open': return 'bg-blue-500';
        case 'in_progress': return 'bg-yellow-500';
        case 'waiting': return 'bg-orange-500';
        case 'resolved': return 'bg-green-500';
        case 'closed': return 'bg-gray-500';
        default: return 'bg-gray-500';
    }
};

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<string>('');
    const [note, setNote] = useState('');

    const { data: ticket, isLoading } = useQuery({
        queryKey: ['ticket', id],
        queryFn: () => ticketService.getTicketById(parseInt(id!)),
        enabled: !!id
    });

    const updateStatusMutation = useMutation({
        mutationFn: (data: { status: string, resolution_note?: string }) =>
            ticketService.updateTicketStatus(parseInt(id!), data),
        onSuccess: () => {
            toast.success('อัพเดทสถานะเรียบร้อยแล้ว');
            queryClient.invalidateQueries({ queryKey: ['ticket', id] });
        },
        onError: () => {
            toast.error('ไม่สามารถอัพเดทสถานะได้');
        }
    });

    const handleUpdateStatus = () => {
        if (!status) return;
        updateStatusMutation.mutate({ status, resolution_note: note });
    };

    const isSuperUser = user?.role === 'SUPER_USER';

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-screen">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    if (!ticket) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-60">
                    <h2 className="text-xl font-bold">ไม่พบข้อมูล Ticket</h2>
                    <Button variant="link" onClick={() => navigate('/support')}>กลับไปหน้า Support</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                <Button variant="ghost" onClick={() => navigate('/support')} className="group pl-0 hover:bg-transparent hover:text-primary transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    กลับไปหน้า Support
                </Button>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-none shadow-md overflow-hidden">
                            <div className="bg-primary/5 p-1 h-2 w-full"></div>
                            <CardHeader className="pb-4">
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-muted/50">
                                                    {ticket.ticket_number}
                                                </Badge>
                                                <Badge className={`${getStatusColor(ticket.status)}/10 text-${getStatusColor(ticket.status).replace('bg-', '')} border-${getStatusColor(ticket.status).replace('bg-', '')}-200 bg-transparent hover:bg-transparent`}>
                                                    {ticket.status.replace('_', ' ').toUpperCase()}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-2xl font-bold leading-tight">
                                                {ticket.topic}
                                            </CardTitle>
                                        </div>
                                        {ticket.priority === 'critical' && (
                                            <Badge variant="destructive" className="animate-pulse shadow-red-500/20 shadow-lg">CRITICAL</Badge>
                                        )}
                                        {ticket.priority === 'high' && (
                                            <Badge className="bg-orange-500 hover:bg-orange-600 shadow-orange-500/20 shadow-lg">HIGH</Badge>
                                        )}
                                        {ticket.priority === 'normal' && (
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">NORMAL</Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6 space-y-8">
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-1 h-4 bg-primary rounded-full"></div>
                                        รายละเอียดปัญหา
                                    </h3>
                                    <div className="bg-muted/30 p-5 rounded-xl text-base leading-relaxed border border-border/50">
                                        {ticket.description}
                                    </div>
                                </div>

                                {ticket.resolution_note && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5" />
                                            การแก้ไขจากเจ้าหน้าที่
                                        </h3>
                                        <div className="bg-green-50 dark:bg-green-950/30 p-5 rounded-xl text-base border-l-4 border-green-500 shadow-sm">
                                            {ticket.resolution_note}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Admin Action Section */}
                        {isSuperUser && (
                            <Card className="border-2 border-primary/20 shadow-lg bg-card/50 backdrop-blur-sm">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <CardTitle className="flex items-center gap-2 text-primary">
                                        <div className="p-1.5 bg-primary/10 rounded-md">
                                            <User className="h-5 w-5" />
                                        </div>
                                        จัดการ Ticket (สำหรับเจ้าหน้าที่)
                                    </CardTitle>
                                    <CardDescription>
                                        เปลี่ยนสถานะและบันทึกผลการแก้ไขปัญหานี้
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">เปลี่ยนสถานะ</Label>
                                            <Select defaultValue={ticket.status} onValueChange={setStatus}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="open">🟢 Open (เปิดงาน)</SelectItem>
                                                    <SelectItem value="in_progress">🟡 In Progress (กำลังดำเนินการ)</SelectItem>
                                                    <SelectItem value="waiting">🟠 Waiting (รอข้อมูล)</SelectItem>
                                                    <SelectItem value="resolved">🔵 Resolved (แก้ไขแล้ว)</SelectItem>
                                                    <SelectItem value="closed">⚪ Closed (ปิดงาน)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">บันทึกการแก้ไข (Resolution Note)</Label>
                                        <Textarea
                                            className="min-h-[120px] resize-y font-mono text-sm"
                                            placeholder="ระบุวิธีการแก้ไข..."
                                            value={note || ticket.resolution_note || ''}
                                            onChange={(e) => setNote(e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                                <Separator />
                                <CardFooter className="bg-muted/30 py-4 flex justify-end">
                                    <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending} className="w-full sm:w-auto min-w-[150px] shadow-lg hover:shadow-xl transition-all">
                                        {updateStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        อัพเดทสถานะ
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card className="shadow-md h-fit top-6 sticky">
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-primary" />
                                    ข้อมูลเพิ่มเติม
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-5">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">ผู้แจ้ง</span>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {ticket.username.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-medium">{ticket.username}</span>
                                    </div>
                                </div>

                                <Separator className="bg-border/50" />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">หมวดหมู่</span>
                                        <Badge variant="secondary" className="w-fit">{ticket.category}</Badge>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">ช่องทาง</span>
                                        <Badge variant="outline" className="w-fit font-mono text-xs">{ticket.source}</Badge>
                                    </div>
                                </div>

                                <Separator className="bg-border/50" />

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">สร้างเมื่อ</span>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>{format(new Date(ticket.created_at), 'dd MMMM yyyy')}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground pl-6">{format(new Date(ticket.created_at), 'HH:mm น.')}</span>
                                </div>

                                {ticket.station_name && (
                                    <>
                                        <Separator className="bg-border/50" />
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">สถานีที่เกี่ยวข้อง</span>
                                            <div className="bg-muted p-2 rounded-lg text-sm border flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                                                <span className="font-medium">{ticket.station_name}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
