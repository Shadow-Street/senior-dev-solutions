import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Clock, 
  User as UserIcon,
  Calendar,
  Share2,
  BookOpen
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageFooter from "../components/footer/PageFooter";
import { createPageUrl } from "@/utils";

// Sample blog data - matches the data from Blogs page
const sampleBlogs = [
  {
    id: '1',
    title: 'Understanding Stock Market Volatility: A Beginner\'s Guide',
    excerpt: 'Learn how to navigate market volatility and make informed investment decisions during uncertain times.',
    content: `
# Understanding Stock Market Volatility

Stock market volatility is a natural part of investing that every trader must understand and learn to navigate. In this comprehensive guide, we'll explore what causes volatility and how you can use it to your advantage.

## What is Market Volatility?

Market volatility refers to the rate at which stock prices increase or decrease for a given set of returns. High volatility means that a stock's price moves dramatically over a short time period in either direction. Low volatility means that a stock's price changes at a steady pace over time.

## Key Factors That Cause Volatility

### 1. Economic Data and News
Economic indicators such as GDP growth, unemployment rates, and inflation figures can significantly impact market sentiment and cause price swings.

### 2. Corporate Earnings Reports
When companies report quarterly earnings, their stock prices can move dramatically based on whether they meet, exceed, or fall short of analyst expectations.

### 3. Geopolitical Events
Political instability, trade wars, and international conflicts can create uncertainty in the markets, leading to increased volatility.

## How to Navigate Volatile Markets

1. **Stay Calm and Stick to Your Plan** - Emotional decisions during volatile periods often lead to poor outcomes.

2. **Diversify Your Portfolio** - Don't put all your eggs in one basket. Spread your investments across different sectors and asset classes.

3. **Focus on Long-Term Goals** - Short-term volatility is normal. Keep your eyes on your long-term investment objectives.

4. **Use Stop-Loss Orders** - Protect yourself from significant losses by setting automatic sell orders at predetermined price levels.

5. **Consider Dollar-Cost Averaging** - Instead of investing a lump sum, invest fixed amounts regularly to smooth out market fluctuations.

## Measuring Volatility

The VIX (Volatility Index), often called the "fear gauge," measures expected volatility in the S&P 500. A high VIX indicates high expected volatility, while a low VIX suggests calm markets.

## Conclusion

Market volatility is inevitable, but it doesn't have to derail your investment strategy. By understanding what causes volatility and implementing sound risk management practices, you can navigate turbulent markets with confidence.

Remember: Volatility creates both risks and opportunities. The key is being prepared and maintaining a disciplined approach to investing.
    `,
    author: 'Rahul Sharma',
    author_role: 'Market Analyst',
    author_bio: 'Senior Market Analyst with 15+ years of experience in equity research and portfolio management.',
    category: 'education',
    read_time: '8 min read',
    image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop',
    published_date: '2025-01-10',
    tags: ['volatility', 'risk management', 'beginner']
  },
  {
    id: '2',
    title: '5 Essential Portfolio Diversification Strategies',
    excerpt: 'Discover proven strategies to diversify your investment portfolio and minimize risk while maximizing returns.',
    content: `
# 5 Essential Portfolio Diversification Strategies

Diversification is one of the most important principles in investing. Here are five proven strategies to help you build a well-diversified portfolio.

## 1. Spread Across Asset Classes

Don't limit yourself to just stocks. Consider bonds, real estate, commodities, and alternative investments.

## 2. Invest in Different Sectors

Technology, healthcare, finance, consumer goods - each sector performs differently under various economic conditions.

## 3. Geographic Diversification

Don't limit yourself to domestic markets. International investments can provide additional diversification benefits.

## 4. Mix of Market Capitalizations

Include a mix of large-cap, mid-cap, and small-cap stocks in your portfolio for balanced growth potential.

## 5. Regular Rebalancing

Review and adjust your portfolio regularly to maintain your desired asset allocation.
    `,
    author: 'Priya Patel',
    author_role: 'Investment Advisor',
    author_bio: 'SEBI registered investment advisor specializing in portfolio construction and wealth management.',
    category: 'strategy',
    read_time: '10 min read',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop',
    published_date: '2025-01-08',
    tags: ['diversification', 'portfolio', 'strategy']
  },
  {
    id: '3',
    title: 'Technical Analysis 101: Chart Patterns Every Trader Should Know',
    excerpt: 'Master the fundamentals of technical analysis with these essential chart patterns and trading indicators.',
    content: `
# Technical Analysis 101: Essential Chart Patterns

Technical analysis is a powerful tool for traders. Learn the most important chart patterns that can help you identify trading opportunities.

## Head and Shoulders Pattern

This reversal pattern signals a potential change from bullish to bearish trend.

## Double Top and Double Bottom

These patterns indicate strong support and resistance levels and potential trend reversals.

## Cup and Handle

A bullish continuation pattern that suggests the uptrend will continue after a brief consolidation.

## Triangle Patterns

Ascending, descending, and symmetrical triangles each have unique implications for future price movement.
    `,
    author: 'Amit Desai',
    author_role: 'Technical Analyst',
    author_bio: 'CMT charterholder with expertise in technical analysis and trading systems.',
    category: 'technical',
    read_time: '12 min read',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop',
    published_date: '2025-01-05',
    tags: ['technical analysis', 'charts', 'patterns']
  }
];

export default function BlogArticlePage() {
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();

    const loadData = async () => {
      try {
        // Get article ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');

        const currentUser = await User.me().catch(() => null);
        
        if (!isMounted || abortController.signal.aborted) return;
        
        setUser(currentUser);

        // Find article by ID
        const foundArticle = sampleBlogs.find(blog => blog.id === articleId);
        
        if (foundArticle) {
          setArticle(foundArticle);
        } else {
          // If article not found, redirect to blogs page
          navigate(createPageUrl('Blogs'));
        }

      } catch (error) {
        if (!isMounted || abortController.signal.aborted) return;
        console.log("Loading article in guest mode");
        setUser(null);
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [navigate]);

  const getCategoryColor = (category) => {
    switch(category) {
      case 'education': return 'bg-premium-muted text-protocall-blue';
      case 'strategy': return 'bg-premium-muted text-protocall-premium-text';
      case 'technical': return 'bg-hold-muted text-hold-muted-foreground';
      case 'tax': return 'bg-buy-muted text-buy-muted-foreground';
      case 'wealth': return 'bg-hold-muted text-hold-muted-foreground';
      case 'comparison': return 'bg-premium-muted text-protocall-premium-text';
      default: return 'bg-surface-2 text-foreground';
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-2 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Back Button */}
        <Button
          onClick={() => navigate(createPageUrl('Blogs'))}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Articles
        </Button>

        {/* Hero Image */}
        <Card className="overflow-hidden shadow-2xl border-0 bg-white">
          <div className="relative h-96">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <Badge className={`${getCategoryColor(article.category)} mb-4`}>
                {article.category.replace('_', ' ')}
              </Badge>
              <h1 className="text-4xl font-bold mb-4 leading-tight">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{article.read_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(article.published_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Article Content */}
        <Card className="bg-white shadow-xl border-0">
          <CardContent className="p-8 md:p-12">
            {/* Share Button */}
            <div className="flex justify-end mb-8">
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share Article
              </Button>
            </div>

            {/* Article Body */}
            <div className="prose prose-lg max-w-none">
              {article.content.split('\n').map((paragraph, index) => {
                if (paragraph.startsWith('# ')) {
                  return (
                    <h1 key={index} className="text-3xl font-bold text-foreground mb-6 mt-8">
                      {paragraph.replace('# ', '')}
                    </h1>
                  );
                } else if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-2xl font-bold text-foreground mb-4 mt-6">
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                } else if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-xl font-bold text-foreground mb-3 mt-4">
                      {paragraph.replace('### ', '')}
                    </h3>
                  );
                } else if (paragraph.trim() === '') {
                  return <div key={index} className="h-4"></div>;
                } else {
                  return (
                    <p key={index} className="text-subtle leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  );
                }
              })}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
              {article.tags?.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Author Bio */}
        <Card className="bg-white shadow-xl border-0">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-foreground mb-4">About the Author</h3>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-protocall-deep to-protocall-blue flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {article.author.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground">{article.author}</p>
                <p className="text-sm text-muted-foreground mb-2">{article.author_role}</p>
                <p className="text-subtle text-sm leading-relaxed">
                  {article.author_bio}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* More Articles CTA */}
        <Card className="bg-gradient-to-r from-protocall-deep via-protocall-grape to-protocall-blue text-white border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Explore More Articles</h3>
            <p className="text-white/80 mb-6">
              Discover more investment insights and trading strategies
            </p>
            <Button
              onClick={() => navigate(createPageUrl('Blogs'))}
              className="bg-white text-protocall-blue hover:bg-premium-muted"
            >
              View All Articles
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <PageFooter />
    </div>
  );
}