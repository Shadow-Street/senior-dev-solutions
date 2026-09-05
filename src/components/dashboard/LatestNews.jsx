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
      case 'positive': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'negative': return <TrendingDown className="w-3 h-3 text-red-500" />;
      default: return <Clock className="w-3 h-3 text-slate-500" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'negative': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'earnings': return 'bg-blue-100 text-blue-800';
      case 'regulation': return 'bg-purple-100 text-purple-800';
      case 'sector': return 'bg-orange-100 text-orange-800';
      case 'market': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg border-0 bg-white h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Newspaper className="w-5 h-5 text-blue-600" />
          Latest Market News
        </CardTitle>
        <p className="text-sm text-slate-600">Stay updated with breaking market news and analysis</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {news.map((item, index) => (
            <div key={index} className="flex gap-4 p-3 rounded-xl border bg-gradient-to-br from-white to-slate-50 hover:shadow-lg transition-all duration-200 cursor-pointer">
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
                    <h4 className="font-semibold text-sm text-slate-900 line-clamp-2">{item.title}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Sentiment logic is loose here as API might not return it, default to neutral */}
                    {getSentimentIcon('neutral')}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-2 line-clamp-2">{item.summary}</p>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category || 'market')}`}>
                    {item.category || 'Market'}
                  </Badge>
                  <div className="flex items-center justify-between text-xs text-slate-500 ml-auto">
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
            <div className="text-center text-slate-500 py-8">
              No news available at the moment.
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to={createPageUrl("News")}>
            <Button className="btn-primary">
              <ExternalLink className="w-4 h-4 mr-2" />
              View All News
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
