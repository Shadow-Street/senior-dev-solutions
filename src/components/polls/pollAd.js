/**
 * Whether a poll is followed by a sponsored card.
 *
 * Derived from the poll id so the same poll always gets the same answer
 * (roughly one in five). It was once Math.random() in render, which made the
 * ad appear and vanish on every re-render and reflowed the grid.
 *
 * `adsEnabled` is the global advertisement switch (useAdsEnabled). It is a
 * required argument on purpose: callers that forget it get no ads, not ads
 * that ignore the admin's setting.
 */
export function pollShowsAd(pollId, adsEnabled) {
  if (adsEnabled !== true) return false;
  const id = String(pollId ?? '');
  if (!id) return false;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 5 === 0;
}
