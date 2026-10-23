"use strict";
/**
 * Summary calculation service — pure functions for testability.
 * These are decoupled from Supabase so they can be unit-tested with Jest.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSummary = exports.isLoanOverdue = void 0;
/**
 * Checks if a loan is overdue.
 * A loan is overdue if:
 *   - is_repaid is false, AND
 *   - due_date is strictly before today (midnight local time)
 */
const isLoanOverdue = (loan, now = new Date()) => {
    if (loan.is_repaid)
        return false;
    const due = new Date(loan.due_date + 'T00:00:00'); // parse as local date
    return due < new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
exports.isLoanOverdue = isLoanOverdue;
/**
 * Calculates the aggregated summary from an array of loan records.
 */
const calculateSummary = (loans, now = new Date()) => {
    let total_lent = 0;
    let total_repaid = 0;
    let total_overdue = 0;
    let repaid_count = 0;
    let overdue_count = 0;
    for (const loan of loans) {
        const amount = Number(loan.amount);
        total_lent += amount;
        if (loan.is_repaid) {
            total_repaid += amount;
            repaid_count++;
        }
        if ((0, exports.isLoanOverdue)(loan, now)) {
            total_overdue += amount;
            overdue_count++;
        }
    }
    const total_outstanding = total_lent - total_repaid;
    return {
        total_lent: parseFloat(total_lent.toFixed(2)),
        total_repaid: parseFloat(total_repaid.toFixed(2)),
        total_outstanding: parseFloat(total_outstanding.toFixed(2)),
        total_overdue: parseFloat(total_overdue.toFixed(2)),
        loan_count: loans.length,
        repaid_count,
        overdue_count,
    };
};
exports.calculateSummary = calculateSummary;
//# sourceMappingURL=summaryService.js.map