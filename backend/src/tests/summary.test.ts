import { calculateSummary, isLoanOverdue, LoanRecord } from '../services/summaryService';

// ---- Helpers ----
const makeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const makeLoan = (overrides: Partial<LoanRecord> = {}): LoanRecord => ({
  id: 'test-uuid',
  user_id: 'user-uuid',
  friend_name: 'Alice',
  amount: 100,
  due_date: makeDate(7), // due in 7 days by default
  is_repaid: false,
  receipt_image_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ================================================================
// isLoanOverdue Tests
// ================================================================
describe('isLoanOverdue()', () => {
  const today = new Date(2024, 5, 15); // June 15, 2024

  it('returns false for a repaid loan regardless of due date', () => {
    const loan = makeLoan({ is_repaid: true, due_date: '2024-01-01' });
    expect(isLoanOverdue(loan, today)).toBe(false);
  });

  it('returns false for an active loan due today', () => {
    const loan = makeLoan({ due_date: '2024-06-15' });
    expect(isLoanOverdue(loan, today)).toBe(false);
  });

  it('returns false for an active loan due in the future', () => {
    const loan = makeLoan({ due_date: '2024-12-31' });
    expect(isLoanOverdue(loan, today)).toBe(false);
  });

  it('returns true for an active loan past its due date', () => {
    const loan = makeLoan({ due_date: '2024-06-01', is_repaid: false });
    expect(isLoanOverdue(loan, today)).toBe(true);
  });

  it('returns true for a yesterday due date', () => {
    const loan = makeLoan({ due_date: '2024-06-14', is_repaid: false });
    expect(isLoanOverdue(loan, today)).toBe(true);
  });
});

// ================================================================
// calculateSummary Tests
// ================================================================
describe('calculateSummary()', () => {
  const mockNow = new Date(2024, 5, 15); // June 15, 2024

  it('returns zero summary for empty loan list', () => {
    const result = calculateSummary([], mockNow);
    expect(result).toEqual({
      total_lent: 0,
      total_repaid: 0,
      total_outstanding: 0,
      total_overdue: 0,
      loan_count: 0,
      repaid_count: 0,
      overdue_count: 0,
    });
  });

  it('calculates correct totals for all active loans', () => {
    const loans: LoanRecord[] = [
      makeLoan({ amount: 500, due_date: '2024-12-01', is_repaid: false }),
      makeLoan({ amount: 250, due_date: '2024-11-01', is_repaid: false }),
    ];
    const result = calculateSummary(loans, mockNow);
    expect(result.total_lent).toBe(750);
    expect(result.total_repaid).toBe(0);
    expect(result.total_outstanding).toBe(750);
    expect(result.total_overdue).toBe(0);
    expect(result.loan_count).toBe(2);
  });

  it('calculates correct totals for all repaid loans', () => {
    const loans: LoanRecord[] = [
      makeLoan({ amount: 1000, is_repaid: true }),
      makeLoan({ amount: 200, is_repaid: true }),
    ];
    const result = calculateSummary(loans, mockNow);
    expect(result.total_lent).toBe(1200);
    expect(result.total_repaid).toBe(1200);
    expect(result.total_outstanding).toBe(0);
    expect(result.repaid_count).toBe(2);
  });

  it('calculates overdue amounts correctly', () => {
    const loans: LoanRecord[] = [
      makeLoan({ amount: 300, due_date: '2024-06-01', is_repaid: false }), // overdue
      makeLoan({ amount: 100, due_date: '2024-06-14', is_repaid: false }), // overdue (yesterday)
      makeLoan({ amount: 500, due_date: '2024-12-01', is_repaid: false }), // future, NOT overdue
      makeLoan({ amount: 200, due_date: '2024-01-01', is_repaid: true }),  // repaid, NOT overdue
    ];
    const result = calculateSummary(loans, mockNow);
    expect(result.total_overdue).toBe(400);
    expect(result.overdue_count).toBe(2);
    expect(result.total_lent).toBe(1100);
    expect(result.total_repaid).toBe(200);
    expect(result.total_outstanding).toBe(900);
  });

  it('handles decimal amounts correctly', () => {
    const loans: LoanRecord[] = [
      makeLoan({ amount: 10.5, is_repaid: false }),
      makeLoan({ amount: 20.33, is_repaid: true }),
      makeLoan({ amount: 5.17, is_repaid: false }),
    ];
    const result = calculateSummary(loans, mockNow);
    expect(result.total_lent).toBe(36);
    expect(result.total_repaid).toBe(20.33);
    expect(result.total_outstanding).toBe(15.67);
  });

  it('returns correct counts', () => {
    const loans: LoanRecord[] = [
      makeLoan({ is_repaid: true }),
      makeLoan({ is_repaid: true }),
      makeLoan({ is_repaid: false, due_date: '2024-01-01' }),
    ];
    const result = calculateSummary(loans, mockNow);
    expect(result.loan_count).toBe(3);
    expect(result.repaid_count).toBe(2);
    expect(result.overdue_count).toBe(1);
  });
});
