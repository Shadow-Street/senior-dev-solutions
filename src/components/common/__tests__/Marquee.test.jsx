import { render, screen } from '@testing-library/react'
import { renderMarqueeRow } from '../Marquee'
import { renderRatingStars } from '../RatingStars'

const items = [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }]
const row = (opts) =>
  render(
    renderMarqueeRow({
      items,
      renderItem: (item) => <p>{item.name}</p>,
      keyOf: (item) => item.id,
      label: 'Reviews',
      ...opts,
    })
  )

describe('renderMarqueeRow', () => {
  test('renders the run twice and hides every copy after the first from assistive tech', () => {
    const { container } = row({ copies: 2 })
    const track = container.querySelector('.w-max')
    expect(track.children).toHaveLength(8)
    const visible = [...track.children].filter((c) => !c.hasAttribute('aria-hidden'))
    expect(visible.map((c) => c.textContent)).toEqual(['Alpha', 'Beta'])
    expect(track.children[2]).toHaveAttribute('inert')
    expect(track.children[0]).not.toHaveAttribute('inert')
    // Focusable, so keyboard users can pause it and scroll it under reduced motion.
    expect(screen.getByRole('region', { name: 'Reviews' })).toHaveAttribute('tabindex', '0')
  })

  test('direction picks the animation and the duration can be overridden', () => {
    const { container, rerender } = row({ direction: 'right', durationSeconds: 110 })
    let track = container.querySelector('.w-max')
    expect(track.className).toContain('animate-marquee-right')
    expect(track.style.animationDuration).toBe('110s')
    rerender(
      renderMarqueeRow({ items, renderItem: (i) => <p>{i.name}</p>, keyOf: (i) => i.id, label: 'Reviews' })
    )
    track = container.querySelector('.w-max')
    expect(track.className).toContain('animate-marquee-left')
    expect(track.style.animationDuration).toBe('')
  })
})

describe('renderRatingStars', () => {
  test('fills the rating in neon and clamps junk', () => {
    const { container, rerender } = render(renderRatingStars(4))
    expect(screen.getByRole('img', { name: '4 out of 5 stars' })).toBeInTheDocument()
    expect(container.querySelectorAll('.fill-protocall-neon')).toHaveLength(4)
    rerender(renderRatingStars(9))
    expect(screen.getByRole('img', { name: '5 out of 5 stars' })).toBeInTheDocument()
    rerender(renderRatingStars('abc'))
    expect(screen.getByRole('img', { name: '0 out of 5 stars' })).toBeInTheDocument()
  })
})
