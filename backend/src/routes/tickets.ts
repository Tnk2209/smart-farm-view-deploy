import { Router, Request, Response } from 'express';
import {
    createTicket,
    getAllTickets,
    getTicketsByUserId,
    getTicketById,
    updateTicketStatus,
    generateTicketNumber,
} from '../database/queries.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/tickets
 * Get all tickets (Manager/Super User) or My Tickets (User)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        // User can only see their own tickets
        if (user.role === 'USER') {
            const tickets = await getTicketsByUserId(user.user_id);
            return res.json({ success: true, data: tickets });
        }

        // Manager/SuperUser see all tickets
        const tickets = await getAllTickets();
        return res.json({ success: true, data: tickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
    }
});

/**
 * GET /api/tickets/:id
 * Get ticket details
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const ticketId = parseInt(req.params.id);
        const user = (req as any).user;

        const ticket = await getTicketById(ticketId);

        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        // Access Control
        if (user.role === 'USER' && ticket.user_id !== user.user_id) {
            return res.status(403).json({ success: false, error: 'Unauthorized to view this ticket' });
        }

        return res.json({ success: true, data: ticket });
    } catch (error) {
        console.error('Error fetching ticket details:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch ticket details' });
    }
});

/**
 * POST /api/tickets
 * Create a new ticket
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { category, topic, description, priority, source, station_id } = req.body;

        if (!category || !topic || !description) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const ticketNumber = await generateTicketNumber();

        const newTicket = await createTicket(
            user.user_id,
            ticketNumber,
            category,
            topic,
            description,
            priority || 'normal',
            source || 'WEB',
            station_id ? parseInt(station_id) : undefined
        );

        return res.status(201).json({ success: true, data: newTicket });
    } catch (error) {
        console.error('Error creating ticket:', error);
        return res.status(500).json({ success: false, error: 'Failed to create ticket' });
    }
});

/**
 * PATCH /api/tickets/:id/status
 * Update ticket status (Manager/Super User only)
 */
router.patch('/:id/status', requireRole('MANAGER', 'SUPER_USER'), async (req: Request, res: Response) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { status, resolution_note } = req.body;
        const user = (req as any).user;

        if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
        }

        // Auto-assign to current user if not assigned (optional logic)
        // For now, let's keep it simple: we just update status and assignee
        const updatedTicket = await updateTicketStatus(
            ticketId,
            status,
            resolution_note,
            user.user_id // Assign to the person updating? Or keep existing? Let's assign to updater for now.
        );

        if (!updatedTicket) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        return res.json({ success: true, data: updatedTicket });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        return res.status(500).json({ success: false, error: 'Failed to update ticket status' });
    }
});

export default router;
