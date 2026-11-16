import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import CreatePlanModal, { limitHelper } from '../CreatePlanModal'

function fill(onSubmit, editingPlan = null) {
  render(<CreatePlanModal open onClose={() => {}} onSubmit={onSubmit} editingPlan={editingPlan} />)
  fireEvent.change(screen.getByLabelText(/Plan Name/i), { target: { value: 'Basic Stock Advisory' } })
  fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: '499' } })
  fireEvent.change(screen.getByPlaceholderText(/Daily stock recommendations/i), { target: { value: 'Two calls a week' } })
}

describe('CreatePlanModal recommendation limit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('helper text shows the monthly cap for a weekly limit', () => {
    expect(limitHelper('2', 'week')).toBe('Up to 2 per week, so the monthly cap is 8.')
    expect(limitHelper('10', 'month')).toMatch(/10 recommendations per calendar month/)
    expect(limitHelper('', 'week')).toMatch(/Leave blank for no limit/)
  })

  it('typing a limit updates the helper and is sent with the plan', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    fill(onSubmit)
    fireEvent.change(screen.getByLabelText('Stock recommendations allowed'), { target: { value: '2' } })
    expect(screen.getByTestId('limit-helper')).toHaveTextContent('monthly cap is 8')
    fireEvent.click(screen.getByRole('button', { name: /^create plan$/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ limit_count: 2, limit_period: 'week' })
  })

  it('blank means unlimited (null); an invalid number is refused before anything is sent', async () => {
    const onSubmit = vi.fn().mockResolvedValue()
    fill(onSubmit)
    fireEvent.click(screen.getByRole('button', { name: /^create plan$/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].limit_count).toBeNull()

    onSubmit.mockClear()
    fireEvent.change(screen.getByLabelText('Stock recommendations allowed'), { target: { value: '1001' } })
    fireEvent.click(screen.getByRole('button', { name: /^create plan$/i }))
    // Refused either by the browser's own min/max check or by the handler's toast.
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('editing pre-fills the limit in force', () => {
    render(<CreatePlanModal open onClose={() => {}} onSubmit={vi.fn()} editingPlan={{ id: 'p1', name: 'Basic', price: '500', billing_interval: 'monthly', features: ['x'], limit_count: 5, limit_period: 'month' }} />)
    expect(screen.getByLabelText('Stock recommendations allowed')).toHaveValue(5)
    expect(screen.getByTestId('limit-helper')).toHaveTextContent('5 recommendations per calendar month')
  })
})
