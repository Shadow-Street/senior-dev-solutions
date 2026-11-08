import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/api/entities', () => ({ PromoCode: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import PromoCodeManager from '../PromoCodeManager'

// Rows exactly as the API returns them (the promo_codes model columns).
const percentCode = { id: '1', code: 'NEW50', discount_percent: 50, discount_amount: null, max_uses: 100, uses_count: 7, expires_at: '2030-06-15T00:00:00.000Z', is_active: true }
const flatCode = { id: '2', code: 'FLAT200', discount_percent: null, discount_amount: '200.00', max_uses: null, uses_count: 3, expires_at: null, is_active: false }

describe('Promo Code Management list', () => {
  it('shows real discount, usage and expiry instead of "undefined%", "/" and "No Expiry"', () => {
    const { container } = render(<PromoCodeManager promoCodes={[percentCode, flatCode]} setPromoCodes={() => {}} permissions={{ isSuperAdmin: true }} plans={[]} />)
    const rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('NEW50')
    expect(rows[0]).toContain('50%')
    expect(rows[0]).toContain('7 / 100')
    expect(rows[0]).not.toContain('No Expiry')
    expect(rows[0]).toContain('Active')
    expect(rows[1]).toContain('₹200')
    expect(rows[1]).toContain('3 / Unlimited')
    expect(rows[1]).toContain('No Expiry')
    expect(rows[1]).toContain('Inactive')
    expect(container.textContent).not.toMatch(/undefined|NaN/)
  })

  it('says so when there are no codes', () => {
    render(<PromoCodeManager promoCodes={[]} setPromoCodes={() => {}} permissions={{ isSuperAdmin: true }} />)
    expect(screen.getByText('No promo codes yet.')).toBeTruthy()
  })
})
