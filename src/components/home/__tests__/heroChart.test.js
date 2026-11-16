import { vi } from 'vitest'
import { createHeroChart, stepFor, STEP_AT } from '../heroChart'

describe('heroChart', () => {
  it('maps scroll progress to the three steps, and each jump target lands on its step', () => {
    expect(stepFor(0)).toBe(0)
    expect(stepFor(0.33)).toBe(0)
    expect(stepFor(0.34)).toBe(1)
    expect(stepFor(0.66)).toBe(1)
    expect(stepFor(0.67)).toBe(2)
    expect(STEP_AT.map(stepFor)).toEqual([0, 1, 2])
  })

  it('without a 2D context it still reports steps, and destroy stops the loop', () => {
    let frame
    vi.stubGlobal('requestAnimationFrame', (cb) => { frame = cb; return 1 })
    const cancel = vi.fn()
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const panel = document.createElement('div')
    const canvas = document.createElement('canvas')
    canvas.getContext = () => null
    panel.appendChild(canvas)
    const onStep = vi.fn()
    const chart = createHeroChart(canvas, { reduceMotion: true, onStep })
    frame(performance.now())
    expect(onStep).toHaveBeenLastCalledWith(0)
    chart.setTarget(0.9)
    frame(performance.now() + 16)
    expect(onStep).toHaveBeenLastCalledWith(2)
    chart.destroy()
    expect(cancel).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
