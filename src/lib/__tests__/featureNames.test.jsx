import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import apiClient from '@/lib/apiClient'
import { featureLabel, _resetFeatureNames } from '@/lib/featureNames'
import PlanCard from '@/components/subscription/PlanCard'

// PPT slide 2: the VIP plan listed "Vipexclusive Chatrooms" because the card
// title-cased the feature key instead of using the name the admin saved
// ("VIP Exclusive Chat Rooms").
describe('feature names on plan cards', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    _resetFeatureNames()
  })

  it('prefers the catalogue name, then known labels, then Title Case', () => {
    const names = { vipexclusive_chatrooms: 'VIP Exclusive Chat Rooms' }
    expect(featureLabel('vipexclusive_chatrooms', names)).toBe('VIP Exclusive Chat Rooms')
    expect(featureLabel('pledge_pool', names)).toBe('Pledge Pool Access')
    expect(featureLabel('custom_alerts', names)).toBe('Custom Alerts')
    expect(featureLabel('Already Named', names)).toBe('Already Named')
    expect(featureLabel(null, names)).toBe('Feature')
  })

  it('the plan card shows the admin-entered feature name', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: [{ feature_key: 'vipexclusive_chatrooms', feature_name: 'VIP Exclusive Chat Rooms' }],
    })
    const plan = { id: 'vip', name: 'VIP', price_monthly: 499, price_annually: 4999, features: ['vipexclusive_chatrooms'] }
    render(<PlanCard plan={plan} user={null} cycle="monthly" currentPlanTier="Free" onSelect={() => {}} />)

    expect(await screen.findByText('VIP Exclusive Chat Rooms')).toBeInTheDocument()
    expect(screen.queryByText('Vipexclusive Chatrooms')).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/features')
  })
})
