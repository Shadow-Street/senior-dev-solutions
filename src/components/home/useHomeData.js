import { useEffect, useState } from "react";
import apiClient, { ChatRoom } from "@/lib/apiClient";
import { useAuth } from "@/components/context/AuthContext";

const asArray = (value) => (Array.isArray(value) ? value : []);
const take = (promise) => promise.then((r) => r?.data).catch(() => null);

/** Top `limit` keys of a count map, highest first. */
const topCounts = (counts, limit) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));

const pollStock = (poll) => poll.stock_symbol || poll.stock_name || null;

/**
 * Live data for the public Home page.
 *
 * Signed-out visitors only hit endpoints that are public (`/chatrooms/public`,
 * `/polls/active`, `/stocks/market-data`). The full room list needs a session,
 * and the API client treats an anonymous 401 as an expired session and
 * redirects to /login — so it is requested only when someone is signed in.
 */
export function useHomeData() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState({
    loading: true,
    rooms: [],
    polls: [],
    market: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [publicRooms, polls, market, memberRooms] = await Promise.all([
        take(apiClient.get("/chatrooms/public")),
        take(apiClient.get("/polls/active")),
        take(apiClient.get("/stocks/market-data")),
        isAuthenticated ? ChatRoom.list(null, 100, 0).catch(() => null) : null,
      ]);
      if (cancelled) return;
      const pub = asArray(publicRooms);
      setData({
        loading: false,
        rooms: pub.length ? pub : asArray(memberRooms),
        polls: asArray(polls),
        market: market && typeof market === "object" ? market : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const { rooms, polls, market } = data;

  const popularRooms = [...rooms]
    .sort((a, b) => (b.participant_count || 0) - (a.participant_count || 0))
    .slice(0, 4);

  // Premium poll questions are member content: count them, but don't preview them.
  const recentPolls = polls
    .filter((p) => !p.is_premium)
    .sort((a, b) => new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0))
    .slice(0, 4);

  const pollsPerStock = {};
  polls.forEach((p) => {
    const stock = pollStock(p);
    if (stock) pollsPerStock[stock] = (pollsPerStock[stock] || 0) + 1;
  });

  // A "thread" is a poll or a stock room about that stock.
  const threadsPerStock = { ...pollsPerStock };
  rooms.forEach((r) => {
    if (r.stock_symbol) threadsPerStock[r.stock_symbol] = (threadsPerStock[r.stock_symbol] || 0) + 1;
  });

  const votesCast = polls.reduce((sum, p) => sum + (Number(p.total_votes) || 0), 0);

  return {
    loading: data.loading,
    roomCount: rooms.length,
    pollCount: polls.length,
    trendingCount: asArray(market?.stocks).length,
    popularRooms,
    recentPolls,
    mostDiscussed: topCounts(pollsPerStock, 6),
    trendingTopics: topCounts(threadsPerStock, 5),
    votesCast,
    gainers: asArray(market?.gainers),
    losers: asArray(market?.losers),
    trending: asArray(market?.stocks),
    pollStock,
  };
}
