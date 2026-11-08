import { formatINR, formatNumber, formatDate, formatDateTime, toNumber, daysUntil } from '@/lib/format'

describe('formatINR', () => {
  it('formats numbers and DECIMAL strings with Indian grouping', () => {
    expect(formatINR(1499)).toBe('₹1,499')
    expect(formatINR('999.00')).toBe('₹999')
    expect(formatINR(499.5)).toBe('₹499.50')
    expect(formatINR(1234567)).toBe('₹12,34,567')
    expect(formatINR(0)).toBe('₹0')
    expect(formatINR(0, { alwaysDecimals: true })).toBe('₹0.00')
  })

  it('never throws and never prints NaN/undefined for missing or bad values', () => {
    for (const bad of [undefined, null, '', 'abc', NaN, Infinity, {}, [], true]) {
      expect(formatINR(bad)).toBe('—')
    }
    expect(formatINR(undefined, { placeholder: 'N/A' })).toBe('N/A')
  })

  it('regression: a subscription row has no `price` (it lives on the plan), and the profile must not crash on it', () => {
    const subscription = { plan_type: 'Free', end_date: null } // exactly what my-subscription returns for Free
    expect(() => formatINR(subscription.price)).not.toThrow()
    expect(formatINR(subscription.price)).toBe('—')
    expect(formatINR(subscription.SubscriptionPlan?.price_monthly)).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats valid dates and ISO strings', () => {
    expect(formatDate('2026-11-05T10:00:00.000Z')).toMatch(/5 Nov 2026|Nov 5, 2026/)
    expect(formatDateTime('2026-11-05T10:00:00.000Z')).toMatch(/2026/)
  })

  it('returns the placeholder for null (Free has no end date), undefined and garbage - not "Invalid Date" or a 1970 epoch', () => {
    for (const bad of [null, undefined, '', 'not a date', NaN]) {
      expect(formatDate(bad)).toBe('—')
      expect(formatDateTime(bad)).toBe('—')
    }
    expect(formatDate(null)).not.toMatch(/1970/)
  })
})

describe('helpers', () => {
  it('toNumber / formatNumber / daysUntil', () => {
    expect(toNumber('12.5')).toBe(12.5)
    expect(toNumber(null)).toBeNull()
    expect(formatNumber(1500)).toBe('1,500')
    expect(formatNumber(undefined)).toBe('—')
    const now = new Date('2026-11-05T00:00:00Z')
    expect(daysUntil('2026-11-15T00:00:00Z', now)).toBe(10)
    expect(daysUntil(null, now)).toBeNull()
  })
})
