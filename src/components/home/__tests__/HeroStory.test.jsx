import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'

let onStep
const chart = { setTarget: vi.fn(), destroy: vi.fn() }
vi.mock('../heroChart', () => ({
  STEP_AT: [0, 0.5, 0.84],
  createHeroChart: vi.fn((canvas, opts) => { onStep = opts.onStep; return chart }),
}))

import HeroStory from '../HeroStory'
import { createHeroChart } from '../heroChart'

const data = { roomCount: 12, pollCount: 4, loading: false }

describe('HeroStory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the existing hero copy, CTAs and live counts as the first step', () => {
    const onGetStarted = vi.fn()
    render(<HeroStory data={data} onGetStarted={onGetStarted} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Invest Smarter\.Discuss Better\.Grow Together\./)
    fireEvent.click(screen.getByRole('button', { name: /Join the Community/ }))
    expect(onGetStarted).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Explore Features' }).getAttribute('href')).toBe('#features')
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByRole('img', { name: /candlestick chart/ })).toBeTruthy()
  })

  it('starts the chart on mount, feeds it scroll progress and stops it on unmount', () => {
    const { unmount } = render(<HeroStory data={data} onGetStarted={() => {}} />)
    expect(createHeroChart).toHaveBeenCalledTimes(1)
    expect(chart.setTarget).toHaveBeenCalled()
    chart.setTarget.mockClear()
    fireEvent.scroll(window)
    expect(chart.setTarget).toHaveBeenCalled()
    unmount()
    expect(chart.destroy).toHaveBeenCalled()
  })

  it('switches copy and overlays with the step; the example poll is only usable on its step and never submits', () => {
    const onGetStarted = vi.fn()
    const { container } = render(<HeroStory data={data} onGetStarted={onGetStarted} />)
    const poll = container.querySelector('fieldset')
    expect(poll.disabled).toBe(true)
    expect(screen.getByRole('button', { name: /Join a Chat Room/, hidden: true }).tabIndex).toBe(-1)

    act(() => onStep(1))
    expect(screen.getByRole('button', { name: /Join a Chat Room/ }).tabIndex).toBe(0)
    expect(screen.getByRole('button', { name: /Join the Community/, hidden: true }).tabIndex).toBe(-1)

    act(() => onStep(2))
    expect(poll.disabled).toBe(false)
    const buy = screen.getByRole('radio', { name: 'Buy' })
    fireEvent.click(buy)
    expect(buy.checked).toBe(true)
    expect(onGetStarted).not.toHaveBeenCalled()
    expect(container.querySelector('form')).toBeNull()
  })

  it('rail buttons scroll to each step', () => {
    window.scrollTo = vi.fn()
    render(<HeroStory data={data} onGetStarted={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show Community Polls' }))
    expect(window.scrollTo).toHaveBeenCalled()
  })
})
