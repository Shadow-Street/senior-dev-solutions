
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Clock, 
  User as UserIcon,
  Search,
  Calendar,
  ArrowRight,
  TrendingUp,
  BookOpen
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PageFooter from "../components/footer/PageFooter";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Sample blog data - in the future, this will come from a Blog entity
const sampleBlogs = [
  {
    id: '1',
    title: 'Understanding Stock Market Volatility: A Beginner\'s Guide',
    excerpt: 'Learn how to navigate market volatility and make informed investment decisions during uncertain times.',
    author: 'Rahul Sharma',
    author_role: 'Market Analyst',
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
    author: 'Priya Patel',
    author_role: 'Investment Advisor',
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
    author: 'Amit Desai',
    author_role: 'Technical Analyst',
    category: 'technical',
    read_time: '12 min read',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop',
    published_date: '2025-01-05',
    tags: ['technical analysis', 'charts', 'patterns']
  },
  {
    id: '4',
    title: 'Tax-Saving Investment Options for 2025',
    excerpt: 'Maximize your tax savings with these smart investment options under Section 80C and other provisions.',
    author: 'Sneha Kumar',
    author_role: 'Tax Consultant',
    category: 'tax',
    read_time: '7 min read',
    image_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop',
    published_date: '2025-01-03',
    tags: ['tax saving', '80c', 'investments']
  },
  {
    id: '5',
    title: 'How to Build a Long-Term Wealth Creation Strategy',
    excerpt: 'A comprehensive guide to building sustainable wealth through disciplined investing and smart financial planning.',
    author: 'Vikram Singh',
    author_role: 'Financial Planner',
    category: 'wealth',
    read_time: '15 min read',
    image_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=500&fit=crop',
    published_date: '2025-01-01',
    tags: ['wealth creation', 'long-term', 'financial planning']
  },
  {
    id: '6',
    title: 'Mutual Funds vs ETFs: Which is Right for You?',
    excerpt: 'Compare the pros and cons of mutual funds and ETFs to make an informed decision for your investment goals.',
    author: 'Neha Gupta',
    author_role: 'Fund Manager',
    category: 'comparison',
    read_time: '9 min read',
    image_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=500&fit=crop',
    published_date: '2024-12-28',
    tags: ['mutual funds', 'etf', 'comparison']
  }
];

export default function BlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();

    const loadData = async () => {
      try {
        const currentUser = await User.me().catch(() => null);
        
        if (!isMounted || abortController.signal.aborted) return;
        
        setUser(currentUser);

        // In the future, load from Blog entity
        // For now, use sample data
        setBlogs(sampleBlogs);

      } catch (error) {
        if (!isMounted || abortController.signal.aborted) return;
        console.log("Loading blogs in guest mode with sample data");
        setBlogs(sampleBlogs);
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
  }, []);

  const getCategoryColor = (category) => {
    switch(category) {
      case 'education': return 'bg-premium-muted text-primary';
      case 'strategy': return 'bg-premium-muted text-protocall-premium-text';
      case 'technical': return 'bg-hold-muted text-hold-muted-foreground';
      case 'tax': return 'bg-buy-muted text-buy-muted-foreground';
      case 'wealth': return 'bg-hold-muted text-hold-muted-foreground';
      case 'comparison': return 'bg-premium-muted text-protocall-premium-text';
      default: return 'bg-surface-2 text-foreground';
    }
  };

  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || blog.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleArticleClick = (articleId) => {
    navigate(`${createPageUrl('BlogArticle')}?id=${articleId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-2 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-protocall-deep to-protocall-blue bg-clip-text text-transparent">
              Investment Insights & Articles
            </h1>
          </div>
          <p className="text-xl text-subtle max-w-3xl mx-auto">
            Expert analysis, investment strategies, and educational content to help you make smarter financial decisions
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center max-w-2xl mx-auto">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border bg-white"
          >
            <option value="all">All Categories</option>
            <option value="education">Education</option>
            <option value="strategy">Strategy</option>
            <option value="technical">Technical Analysis</option>
            <option value="tax">Tax Planning</option>
            <option value="wealth">Wealth Creation</option>
            <option value="comparison">Comparisons</option>
          </select>
        </div>

        {/* Featured Blog */}
        {filteredBlogs.length > 0 && (
          <Card 
            className="overflow-hidden shadow-2xl border-0 bg-white cursor-pointer hover:shadow-3xl transition-shadow"
            onClick={() => handleArticleClick(filteredBlogs[0].id)}
          >
            <div className="grid md:grid-cols-2">
              <div className="relative h-64 md:h-auto">
                <img
                  src={filteredBlogs[0].image_url}
                  alt={filteredBlogs[0].title}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 bg-gradient-to-r from-protocall-deep to-protocall-blue text-white">
                  Featured Article
                </Badge>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <Badge className={`${getCategoryColor(filteredBlogs[0].category)} w-fit mb-4`}>
                  {filteredBlogs[0].category.replace('_', ' ')}
                </Badge>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  {filteredBlogs[0].title}
                </h2>
                <p className="text-subtle mb-6 text-lg leading-relaxed">
                  {filteredBlogs[0].excerpt}
                </p>
                <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span>{filteredBlogs[0].author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{filteredBlogs[0].read_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(filteredBlogs[0].published_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button className="bg-gradient-to-r from-protocall-deep to-protocall-blue hover:from-protocall-deep hover:to-protocall-blue w-fit">
                  Read Full Article
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.slice(1).map(blog => (
            <Card 
              key={blog.id} 
              className="group overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-0 bg-white cursor-pointer"
              onClick={() => handleArticleClick(blog.id)}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={blog.image_url}
                  alt={blog.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <Badge className={`absolute top-3 right-3 ${getCategoryColor(blog.category)}`}>
                  {blog.category.replace('_', ' ')}
                </Badge>
              </div>

              <CardContent className="p-6">
                <h3 className="font-bold text-xl text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {blog.title}
                </h3>

                <p className="text-sm text-subtle mb-4 line-clamp-3">
                  {blog.excerpt}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {blog.tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{blog.author}</p>
                    <p className="text-xs text-muted-foreground">{blog.author_role}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{blog.read_time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(blog.published_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBlogs.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-subtle mb-2">No articles found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Newsletter CTA */}
        <Card className="bg-gradient-to-r from-protocall-deep via-protocall-grape to-protocall-blue text-white border-0 shadow-2xl mt-12">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Get Weekly Investment Insights</h3>
            <p className="text-white/80 mb-6">
              Subscribe to our newsletter and receive expert analysis directly in your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                placeholder="Enter your email"
                className="bg-white text-foreground"
              />
              <Button className="bg-white text-primary hover:bg-premium-muted">
                Subscribe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <PageFooter />
    </div>
  );
}
