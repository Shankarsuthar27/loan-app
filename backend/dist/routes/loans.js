"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabaseClient_1 = require("../supabaseClient");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const schemas_1 = require("../validators/schemas");
const summaryService_1 = require("../services/summaryService");
const router = (0, express_1.Router)();
// In-memory fallback loans list for local development
const memoryLoans = [];
// All loan routes require authentication
router.use(auth_1.authenticate);
// ----------------------------------------------------------------
// GET /loans/summary
// Returns aggregated summary: total_lent, total_repaid, total_overdue
// NOTE: Must be registered BEFORE /loans/:id to avoid route collision
// ----------------------------------------------------------------
router.get('/summary', async (req, res) => {
    try {
        let userLoans = [];
        const { data: loans, error } = await supabaseClient_1.supabase
            .from('loans')
            .select('*')
            .eq('user_id', req.userId);
        if (error) {
            if (error.code === 'PGRST205') {
                userLoans = memoryLoans.filter((l) => l.user_id === req.userId);
            }
            else {
                console.error('Summary fetch error:', error);
                res.status(500).json({ success: false, message: 'Failed to fetch summary' });
                return;
            }
        }
        else {
            userLoans = (loans ?? []);
        }
        const summary = (0, summaryService_1.calculateSummary)(userLoans);
        res.status(200).json({ success: true, data: summary });
    }
    catch (err) {
        console.error('Summary error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// ----------------------------------------------------------------
// GET /loans
// Returns all loan entries for the authenticated user
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const { data: loans, error } = await supabaseClient_1.supabase
            .from('loans')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });
        if (error) {
            if (error.code === 'PGRST205') {
                const userLoans = memoryLoans
                    .filter((l) => l.user_id === req.userId)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                res.status(200).json({ success: true, data: userLoans });
                return;
            }
            console.error('Loans fetch error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch loans' });
            return;
        }
        res.status(200).json({ success: true, data: loans ?? [] });
    }
    catch (err) {
        console.error('Get loans error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// ----------------------------------------------------------------
// POST /loans
// Creates a new loan entry.
// Accepts multipart/form-data for optional receipt image upload.
// ----------------------------------------------------------------
router.post('/', upload_1.upload.single('receipt_image'), async (req, res) => {
    // Parse amount from string or number
    const rawAmount = req.body.amount;
    const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(rawAmount);
    const body = {
        ...req.body,
        amount,
        receipt_image_url: req.body.receipt_image_url ?? null,
    };
    // Validate
    const parsed = schemas_1.createLoanSchema.safeParse(body);
    if (!parsed.success) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: parsed.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }
    let receiptImageUrl = parsed.data.receipt_image_url ?? null;
    // If a file was uploaded, store its local URL (or upload to Supabase Storage)
    if (req.file) {
        receiptImageUrl = `/uploads/${req.file.filename}`;
    }
    try {
        const { data: loan, error } = await supabaseClient_1.supabase
            .from('loans')
            .insert({
            user_id: req.userId,
            friend_name: parsed.data.friend_name,
            amount: parsed.data.amount,
            due_date: parsed.data.due_date,
            receipt_image_url: receiptImageUrl,
            is_repaid: false,
        })
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST205') {
                const fallbackLoan = {
                    id: `loan-${Date.now()}`,
                    user_id: req.userId,
                    friend_name: parsed.data.friend_name,
                    amount: parsed.data.amount,
                    due_date: parsed.data.due_date,
                    receipt_image_url: receiptImageUrl,
                    is_repaid: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                memoryLoans.unshift(fallbackLoan);
                res.status(201).json({
                    success: true,
                    message: 'Loan entry created successfully (in-memory mode)',
                    data: fallbackLoan,
                });
                return;
            }
            console.error('Create loan error:', error);
            res.status(500).json({ success: false, message: 'Failed to create loan' });
            return;
        }
        res.status(201).json({
            success: true,
            message: 'Loan entry created successfully',
            data: loan,
        });
    }
    catch (err) {
        console.error('Create loan error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// ----------------------------------------------------------------
// PATCH /loans/:id/repay
// Marks a specific loan as repaid
// ----------------------------------------------------------------
router.patch('/:id/repay', async (req, res) => {
    const { id } = req.params;
    try {
        // Check in-memory first if loan exists there
        const memLoan = memoryLoans.find((l) => l.id === id && l.user_id === req.userId);
        if (memLoan) {
            if (memLoan.is_repaid) {
                res.status(400).json({ success: false, message: 'Loan is already marked as repaid' });
                return;
            }
            memLoan.is_repaid = true;
            memLoan.updated_at = new Date().toISOString();
            res.status(200).json({
                success: true,
                message: 'Loan marked as repaid',
                data: memLoan,
            });
            return;
        }
        // Verify in Supabase
        const { data: existing, error: fetchError } = await supabaseClient_1.supabase
            .from('loans')
            .select('id, is_repaid')
            .eq('id', id)
            .eq('user_id', req.userId)
            .single();
        if (fetchError || !existing) {
            res.status(404).json({ success: false, message: 'Loan not found' });
            return;
        }
        if (existing.is_repaid) {
            res.status(400).json({ success: false, message: 'Loan is already marked as repaid' });
            return;
        }
        const { data: loan, error } = await supabaseClient_1.supabase
            .from('loans')
            .update({ is_repaid: true })
            .eq('id', id)
            .eq('user_id', req.userId)
            .select()
            .single();
        if (error) {
            console.error('Repay loan error:', error);
            res.status(500).json({ success: false, message: 'Failed to update loan' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Loan marked as repaid',
            data: loan,
        });
    }
    catch (err) {
        console.error('Repay error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=loans.js.map