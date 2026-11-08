import { payoutAmount, normalizePayout, sumPayouts, isPaidStatus, commissionParts } from '@/lib/payoutView'

// Regression (BE-11 review): Financials > Payouts crashed on
// request.requested_amount.toLocaleString for any row from the real table,
// which stores `amount`.
describe('payoutAmount', () => {
  it('reads the real column, falls back to the legacy one, never throws', () => {
    expect(payoutAmount({ amount: '1500.50' })).toBe(1500.5)
    expect(payoutAmount({ requested_amount: 20 })).toBe(20)
    expect(payoutAmount({ amount: null, requested_amount: 7 })).toBe(7)
    for (const bad of [undefined, null, {}, { amount: 'abc' }]) expect(payoutAmount(bad)).toBe(0)
  })
})

describe('normalizePayout', () => {
  it('maps real columns onto the names older screens read, and processed -> paid', () => {
    const n = normalizePayout({
      amount: '300.00', payment_method: 'upi', payment_details: { upi_id: 'a@b', bank_details: { x: 1 } },
      reference_number: 'UTR1', processed_at: '2026-01-01', created_at: '2025-12-31', status: 'processed',
    })
    expect(n.requested_amount).toBe(300)
    expect(n.payout_method).toBe('upi')
    expect(n.upi_id).toBe('a@b')
    expect(n.bank_details).toEqual({ x: 1 })
    expect(n.transaction_reference).toBe('UTR1')
    expect(n.created_date).toBe('2025-12-31')
    expect(n.status).toBe('paid')
  })
  it('tolerates a row with no details and null input', () => {
    expect(normalizePayout({ amount: 1, status: 'pending' }).requested_amount).toBe(1)
    expect(normalizePayout(null)).toBeNull()
  })
})

describe('sums and status helpers', () => {
  const rows = [{ amount: '100', status: 'paid' }, { amount: 50, status: 'pending' }, { requested_amount: 25, status: 'processed' }]
  it('sums by status using the real amount', () => {
    expect(sumPayouts(rows, isPaidStatus)).toBe(125)
    expect(sumPayouts(rows, (s) => s === 'pending')).toBe(50)
    expect(sumPayouts(undefined, isPaidStatus)).toBe(0)
  })
})

describe('commissionParts', () => {
  it('prefers the server-created shape and falls back to the old client one', () => {
    expect(commissionParts({ amount: '800.00', metadata: { gross_amount: 1000, platform_fee: 200 } })).toEqual({ gross: 1000, fee: 200, net: 800 })
    expect(commissionParts({ gross_amount: 10, platform_fee: 2, advisor_payout: 8 })).toEqual({ gross: 10, fee: 2, net: 8 })
    expect(commissionParts(null)).toEqual({ gross: 0, fee: 0, net: 0 })
  })
})
