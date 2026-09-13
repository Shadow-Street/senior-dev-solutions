import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, TrendingUp, TrendingDown, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { News } from "@/lib/apiClient";

export default function LatestNews() {
  const [news, setNews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const data = await News.getLatest(4, 'business');
        setNews(data);
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-3 h-3 text-positive" />;
      case 'negative': return <TrendingDown className="w-3 h-3 text-sell" />;
      default: return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-buy text-buy-foreground border-transparent';
      case 'negative': return 'bg-sell-muted text-sell-muted-foreground border-sell/30';
      default: return 'bg-surface-2 text-subtle border-divider';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'earnings': return 'bg-premium-muted text-premium-muted-foreground';
      case 'regulation': return 'bg-surface-2 text-subtle';
      case 'sector': return 'bg-premium-light/40 text-premium-muted-foreground';
      case 'market': return 'bg-premium-muted text-primary';
      default: return 'bg-surface-2 text-subtle';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg border border-border bg-card h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border border-border bg-card">
      <CardHeader className="border-b border-divider bg-surface-2">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Newspaper className="w-5 h-5 text-protocall-blue" />
          Latest Market News
        </CardTitle>
        <p className="text-sm text-subtle">Stay updated with breaking market news and analysis</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {news.map((item, index) => (
            <div key={index} className="flex gap-4 p-3 rounded-xl border border-divider bg-surface-2 hover:shadow-lg transition-all duration-200 cursor-pointer">
              {/* Image */}
              <div className="flex-shrink-0">
                <img
                  src={item.image_url || `https://source.unsplash.com/random/300x200?finance,sig=${index}`}
                  alt={item.title}
                  className="w-20 h-16 rounded-lg object-cover"
                  onError={(e) => e.target.src = 'https://source.unsplash.com/random/300x200?stock-market'}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-foreground line-clamp-2">{item.title}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Sentiment logic is loose here as API might not return it, default to neutral */}
                    {getSentimentIcon('neutral')}
                  </div>
                </div>

                <p className="text-xs text-subtle mb-2 line-clamp-2">{item.summary}</p>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category || 'market')}`}>
                    {item.category || 'Market'}
                  </Badge>
                  <div className="flex items-center justify-between text-xs text-subtle ml-auto">
                    <span className="font-medium mr-2">{item.source || 'Unknown'}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {news.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No news available at the moment.
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to={createPageUrl("News")}>
            <Button>
              <ExternalLink className="w-4 h-4 mr-2" />
              View All News
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
