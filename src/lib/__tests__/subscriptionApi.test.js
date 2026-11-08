import { listPrice, priceView, normaliseCycle, isFreeSubscription, rupees, finiteOrNull } from '@/lib/subscriptionApi'

const premium = { id: 'p', name: 'Premium', price: '999.00', price_monthly: '999.00', price_annually: '9990.00' }

describe('subscription price helpers', () => {
  it('normalises every spelling of the billing cycle', () => {
    expect(['monthly', 'month', undefined, 'whatever'].map(normaliseCycle)).toEqual(['monthly', 'monthly', 'monthly', 'monthly'])
    expect(['annually', 'annual', 'yearly', 'Year'].map(normaliseCycle)).toEqual(['annually', 'annually', 'annually', 'annually'])
  })

  it('reads list prices from DECIMAL strings; annual falls back to 12 x monthly like the server', () => {
    expect(listPrice(premium, 'monthly')).toBe(999)
    expect(listPrice(premium, 'annually')).toBe(9990)
    expect(listPrice({ price_monthly: 100 }, 'annually')).toBe(1200)
    expect(listPrice({}, 'monthly')).toBe(0)
  })

  it('applies the server quote per cycle and never produces NaN (the "₹NaN" regression)', () => {
    const quotes = {
      monthly: { finalAmount: 499.5, discountAmount: 499.5 },
      annually: { finalAmount: 4995, discountAmount: 4995 },
    }
    const m = priceView(premium, 'monthly', quotes)
    const y = priceView(premium, 'annually', quotes)
    expect([m.final, m.saving, m.discounted]).toEqual([499.5, 499.5, true])
    expect([y.final, y.saving, y.discounted]).toEqual([4995, 4995, true])
  })

  it('toggling the cycle changes the discounted price too', () => {
    const quotes = { monthly: { finalAmount: 500 }, annually: { finalAmount: 5000 } }
    expect(priceView(premium, 'monthly', quotes).final).not.toBe(priceView(premium, 'annually', quotes).final)
  })

  it('falls back to the list price when the quote is missing, malformed or not a saving', () => {
    expect(priceView(premium, 'monthly', null).final).toBe(999)
    expect(priceView(premium, 'monthly', { monthly: null }).final).toBe(999)
    expect(priceView(premium, 'monthly', { monthly: { finalAmount: undefined } })).toMatchObject({ final: 999, discounted: false })
    expect(priceView(premium, 'monthly', { monthly: { finalAmount: 'abc' } })).toMatchObject({ final: 999, discounted: false })
    expect(priceView(premium, 'monthly', { monthly: { finalAmount: 1500 } })).toMatchObject({ final: 999, discounted: false })
    // a quote for one cycle only affects that cycle
    expect(priceView(premium, 'annually', { monthly: { finalAmount: 500 }, annually: null }).final).toBe(9990)
  })

  it('formats rupees, keeping paise when there are any and never printing NaN', () => {
    expect(rupees(499.5)).toBe('₹499.50')
    expect(rupees(1499)).toBe('₹1,499')
    expect(rupees(NaN)).toBe('—')
    expect(rupees(undefined)).toBe('—')
    expect(finiteOrNull('')).toBeNull()
  })

  it('recognises a Free subscription by flag or by name with no end date', () => {
    expect(isFreeSubscription(null)).toBe(true)
    expect(isFreeSubscription({ is_free: true })).toBe(true)
    expect(isFreeSubscription({ plan_type: 'Free', end_date: null })).toBe(true)
    expect(isFreeSubscription({ plan_type: 'Basic' })).toBe(true)
    expect(isFreeSubscription({ plan_type: 'Premium', end_date: '2030-01-01' })).toBe(false)
    expect(isFreeSubscription({ plan_type: 'Free', end_date: '2030-01-01' })).toBe(false)
  })
})
