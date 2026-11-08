import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommunityPollPanel from '../CommunityPollPanel';

const renderPanel = (polls) => render(<MemoryRouter><CommunityPollPanel polls={polls} /></MemoryRouter>);

describe('CommunityPollPanel', () => {
  it('shows the one-vote JPL poll as 100% with full details, not 0% bars', () => {
    renderPanel([{
      id: 'jpl', is_active: true, title: "What's your trading view on JPL?", stock_symbol: 'JPL',
      options: ['Buy', 'Sell', 'Hold'], votes: { 0: 1 }, total_votes: 1, buy_votes: 0, sell_votes: 0, hold_votes: 0,
    }]);
    expect(screen.getByRole('progressbar', { name: 'Buy 100 percent' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Sell 0 percent' })).toBeInTheDocument();
    expect(screen.getByText('Total Votes').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('Consensus').previousSibling).toHaveTextContent('Buy 100%');
    expect(screen.getByText('Participated').previousSibling).toHaveTextContent('1');
  });

  it('renders sentiment options by their own labels', () => {
    renderPanel([{ id: 's', is_active: true, title: 'Mood?', options: ['Bullish', 'Bearish', 'Neutral'], vote_counts: [1, 1, 2], unique_voters: 4 }]);
    expect(screen.getByRole('progressbar', { name: 'Neutral 50 percent' })).toBeInTheDocument();
    expect(screen.getByText('Consensus').previousSibling).toHaveTextContent('Neutral 50%');
  });

  it('shows an empty state with no polls and a loading state while null', () => {
    const { unmount } = renderPanel([]);
    expect(screen.getByText('No active polls yet')).toBeInTheDocument();
    unmount();
    renderPanel(null);
    expect(screen.getByRole('status', { name: 'Loading community poll' })).toBeInTheDocument();
  });
});
