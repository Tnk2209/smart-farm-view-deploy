import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ticketService, SupportTicket } from '@/services/ticketService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Loader2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

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

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'open': return 'เปิดงาน';
        case 'in_progress': return 'กำลังดำเนินการ';
        case 'waiting': return 'รอข้อมูลเพิ่มเติม';
        case 'resolved': return 'แก้ไขแล้ว';
        case 'closed': return 'ปิดงาน';
        default: return status;
    }
};

export default function SupportCenter() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const { data: tickets, isLoading } = useQuery({
        queryKey: ['tickets'],
        queryFn: ticketService.getAllTickets,
    });

    const filteredTickets = tickets?.filter(ticket =>
        ticket.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
        ticket.topic.toLowerCase().includes(search.toLowerCase()) ||
        (ticket.station_name && ticket.station_name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Help & Support</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            แจ้งปัญหาการใช้งานและติดตามสถานะการดำเนินการ
                        </p>
                    </div>
                    <Button onClick={() => navigate('/support/create')} className="shadow-lg hover:shadow-xl transition-all">
                        <Plus className="mr-2 h-4 w-4" />
                        แจ้งเรื่องใหม่
                    </Button>
                </div>

                {/* Filter & Search */}
                <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="ค้นหา Ticket ID, หัวข้อ, หรือชื่อสถานี..."
                            className="pl-10 h-11 bg-background"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Ticket List */}
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredTickets && filteredTickets.length > 0 ? (
                    <div className="grid gap-4">
                        {filteredTickets.map((ticket) => (
                            <div
                                key={ticket.ticket_id}
                                onClick={() => navigate(`/support/${ticket.ticket_id}`)}
                                className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer"
                            >
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2.5">
                                        <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                            {ticket.ticket_number}
                                        </span>
                                        {ticket.priority === 'critical' && (
                                            <Badge variant="destructive" className="h-5 text-[10px] px-1.5 rounded-full uppercase tracking-wider">Critical</Badge>
                                        )}
                                        {ticket.priority === 'high' && (
                                            <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200 rounded-full uppercase tracking-wider">High</Badge>
                                        )}
                                        <Badge className={`h-5 text-[10px] px-1.5 rounded-full uppercase tracking-wider ${getStatusColor(ticket.status)}/10 text-${getStatusColor(ticket.status).replace('bg-', '')} border-${getStatusColor(ticket.status).replace('bg-', '')}-200 bg-transparent`}>
                                            {ticket.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                        {ticket.topic}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"></span>
                                            {format(new Date(ticket.created_at), 'dd MMM yyyy, HH:mm')}
                                        </span>
                                        <span>•</span>
                                        <span>{ticket.category}</span>
                                        {ticket.station_name && (
                                            <>
                                                <span>•</span>
                                                <span className="font-medium text-foreground/80">{ticket.station_name}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-start sm:self-center pl-0 sm:pl-4 sm:border-l sm:border-border/50">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-muted-foreground">สถานะ</p>
                                        <p className={`text-sm font-medium ${getStatusColor(ticket.status).replace('bg-', 'text-')}`}>
                                            {getStatusLabel(ticket.status)}
                                        </p>
                                    </div>
                                    <MessageSquare className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
                        <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">ไม่มีรายการแจ้งปัญหา</h3>
                        <p className="text-muted-foreground mt-2 mb-6 max-w-sm">
                            คุณยังไม่เคยแจ้งปัญหาการใช้งาน หรือไม่พบข้อมูลที่ค้นหา
                        </p>
                        <Button onClick={() => navigate('/support/create')} className="gap-2">
                            <Plus className="h-4 w-4" />
                            แจ้งเรื่องแรก
                        </Button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
