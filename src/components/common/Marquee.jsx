/*
 * Endless horizontal row (the Dashboard and Home review carousels).
 *
 * The items are laid out `copies` times, and that run is rendered twice; the
 * track moves by exactly half its width (keyframes `marquee-x`). The trailing
 * `pr-5` equals the `gap-5` between items, so half the track ends exactly where
 * the second run starts and the loop has no seam. Use more copies when one run of items is
 * narrower than the row, or a gap shows before the loop restarts.
 *
 *   direction "left"  content travels right-to-left
 *   direction "right" content travels left-to-right
 *
 * Hovering the row, or focusing it (it is a tab stop), pauses it so a card can
 * be read (WCAG 2.2.2). With reduced motion the row stays still, shows one
 * copy only and scrolls by hand or with the arrow keys once focused.
 */
export function renderMarqueeRow({ items, renderItem, keyOf, direction = "left", label, copies = 1, durationSeconds }) {
  const run = Array.from({ length: copies }, () => items).flat();
  const track = [...run, ...run];
  return (
    <div
      className="group relative overflow-hidden rounded-2xl motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]
                 [mask-image:linear-gradient(to_right,transparent,#000_4%,#000_96%,transparent)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <div
        className={`flex w-max gap-5 py-2 pr-5 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none ${
          direction === "right" ? "animate-marquee-right" : "animate-marquee-left"
        }`}
        style={durationSeconds ? { animationDuration: `${durationSeconds}s` } : undefined}
      >
        {track.map((item, index) => {
          const duplicate = index >= items.length;
          return (
            <div
              key={`${keyOf(item)}-${index}`}
              aria-hidden={duplicate || undefined}
              // Duplicates exist only for the loop: keep them out of the tab
              // order and drop them when the row does not move. React 18 needs
              // inert as a string; on React 19 switch to inert={duplicate}.
              inert={duplicate ? "" : undefined}
              className={duplicate ? "motion-reduce:hidden" : undefined}
            >
              {renderItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
