import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { Activity, BarChart3, Clock, Inbox, MessageSquare, RefreshCw, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/apiClient";

const REFRESH_MS = 60000;

// Icon and tint per item type returned by GET /api/activity/recent.
const TYPE_STYLE = {
  poll: { icon: BarChart3, tint: "text-primary" },
  poll_result: { icon: Trophy, tint: "text-primary" },
  chat: { icon: MessageSquare, tint: "text-primary" },
  members: { icon: Users, tint: "text-positive" },
};

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (Date.now() - date.getTime() < 60000) return "just now";
  return `${formatDistanceToNowStrict(date)} ago`;
}

function renderItem(item) {
  const style = TYPE_STYLE[item.type] || { icon: Activity, tint: "text-primary" };
  const Icon = style.icon;
  const body = (
    <>
      <div className={`rounded-full bg-surface-2 p-2 ${style.tint}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
        {item.description && <p className="mt-1 line-clamp-2 text-xs text-subtle">{item.description}</p>}
        <div className="mt-2 flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">{relativeTime(item.occurred_at)}</span>
        </div>
      </div>
    </>
  );
  const rowClass = "flex items-start gap-3 rounded-lg p-3 hover:bg-surface-2";
  return (
    <li key={item.id}>
      {item.link ? (
        <Link to={item.link} className={`${rowClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
          {body}
        </Link>
      ) : (
        <div className={rowClass}>{body}</div>
      )}
    </li>
  );
}

// Real community activity from the API (see backend/src/routes/activity.routes.js).
export default function RecentActivity() {
  const [items, setItems] = useState(null); // null until the first response
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/activity/recent");
      setItems(Array.isArray(data?.items) ? data.items : []);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  let content;
  if (items === null && !error) {
    content = (
      <div role="status" aria-label="Loading recent activity" className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (items === null) {
    content = (
      <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <p className="text-sm text-subtle">Recent activity could not be loaded.</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  } else if (items.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Nothing new yet</p>
        <p className="text-xs text-subtle">Polls, chats and new members will show up here.</p>
      </div>
    );
  } else {
    content = <ul className="space-y-1">{items.map(renderItem)}</ul>;
  }

  return (
    <Card className="h-full border border-border bg-card shadow-lg">
      <CardHeader className="border-b border-divider bg-surface-2">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">{content}</CardContent>
    </Card>
  );
}
