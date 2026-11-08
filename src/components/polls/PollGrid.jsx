import AdDisplay from '../dashboard/AdDisplay';
import { pollShowsAd } from './pollAd';

/** Class list of the poll grid; shared so the page and tests agree. */
export const POLL_GRID_CLASS = 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3';

/**
 * Grid cells for a list of polls, with the occasional sponsored card.
 *
 * The sponsored card is its own grid cell, so when the global advertisement
 * switch is off the cell is not emitted at all: the polls close up with no
 * empty slot. `renderPoll(poll)` returns the card element for one poll.
 * `adsEnabled` is the global switch (useAdsEnabled). Render the result inside
 * an element with POLL_GRID_CLASS.
 */
export function buildPollGridCells(polls, renderPoll, adsEnabled) {
  return polls.flatMap((poll) => {
    const card = (
      <div key={poll.id} className="min-w-0">
        {renderPoll(poll)}
      </div>
    );
    return pollShowsAd(poll.id, adsEnabled)
      ? [
        <div key={`ad-${poll.id}`} className="min-w-0" data-testid="poll-ad-cell">
          <AdDisplay placement="polls" userContext={{ stock_symbol: poll.stock_symbol }} className="h-full rounded-2xl" />
        </div>,
        card,
      ]
      : [card];
  });
}
