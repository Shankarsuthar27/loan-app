/**
 * Summary calculation service — pure functions for testability.
 * These are decoupled from Supabase so they can be unit-tested with Jest.
 */
export interface LoanRecord {
    id: string;
    user_id: string;
    friend_name: string;
    amount: number;
    due_date: string;
    is_repaid: boolean;
    receipt_image_url?: string | null;
    created_at: string;
    updated_at: string;
}
export interface LoanSummary {
    total_lent: number;
    total_repaid: number;
    total_outstanding: number;
    total_overdue: number;
    loan_count: number;
    repaid_count: number;
    overdue_count: number;
}
/**
 * Checks if a loan is overdue.
 * A loan is overdue if:
 *   - is_repaid is false, AND
 *   - due_date is strictly before today (midnight local time)
 */
export declare const isLoanOverdue: (loan: LoanRecord, now?: Date) => boolean;
/**
 * Calculates the aggregated summary from an array of loan records.
 */
export declare const calculateSummary: (loans: LoanRecord[], now?: Date) => LoanSummary;
//# sourceMappingURL=summaryService.d.ts.map