import { apiFetch } from '@/lib/apiConfig';

export interface SupportTicket {
    ticket_id: number;
    ticket_number: string;
    user_id: number;
    station_id?: number;
    category: 'HARDWARE' | 'SOFTWARE' | 'DATA' | 'ACCOUNT' | 'OTHER';
    topic: string;
    description: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
    assigned_to?: number;
    resolution_note?: string;
    source: 'WEB' | 'QR_CODE';
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    username?: string;
    station_name?: string;
    assignee_name?: string;
}

export const ticketService = {
    getAllTickets: async () => {
        const response = await apiFetch<{ success: boolean; data: SupportTicket[] }>('/tickets');
        return response.data;
    },

    getTicketById: async (id: number) => {
        const response = await apiFetch<{ success: boolean; data: SupportTicket }>(`/tickets/${id}`);
        return response.data;
    },

    createTicket: async (data: {
        category: string;
        topic: string;
        description: string;
        priority?: string;
        source?: string;
        station_id?: number;
    }) => {
        const response = await apiFetch<{ success: boolean; data: SupportTicket }>('/tickets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    updateTicketStatus: async (
        id: number,
        data: { status: string; resolution_note?: string }
    ) => {
        const response = await apiFetch<{ success: boolean; data: SupportTicket }>(`/tickets/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        return response.data;
    },
};
