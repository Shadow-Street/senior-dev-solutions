
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
      case 'education': return 'bg-blue-100 text-blue-800';
      case 'strategy': return 'bg-purple-100 text-purple-800';
      case 'technical': return 'bg-orange-100 text-orange-800';
      case 'tax': return 'bg-green-100 text-green-800';
      case 'wealth': return 'bg-yellow-100 text-yellow-800';
      case 'comparison': return 'bg-pink-100 text-pink-800';
      default: return 'bg-slate-100 text-slate-800';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Investment Insights & Articles
            </h1>
          </div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Expert analysis, investment strategies, and educational content to help you make smarter financial decisions
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center max-w-2xl mx-auto">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
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
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white"
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
                <Badge className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  Featured Article
                </Badge>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <Badge className={`${getCategoryColor(filteredBlogs[0].category)} w-fit mb-4`}>
                  {filteredBlogs[0].category.replace('_', ' ')}
                </Badge>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  {filteredBlogs[0].title}
                </h2>
                <p className="text-slate-600 mb-6 text-lg leading-relaxed">
                  {filteredBlogs[0].excerpt}
                </p>
                <div className="flex items-center gap-4 mb-6 text-sm text-slate-500">
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
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-fit">
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
                <h3 className="font-bold text-xl text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {blog.title}
                </h3>

                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
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
                    <p className="text-sm font-semibold text-slate-900">{blog.author}</p>
                    <p className="text-xs text-slate-500">{blog.author_role}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{blog.read_time}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
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
            <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No articles found</h3>
            <p className="text-slate-500">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Newsletter CTA */}
        <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white border-0 shadow-2xl mt-12">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Get Weekly Investment Insights</h3>
            <p className="text-blue-100 mb-6">
              Subscribe to our newsletter and receive expert analysis directly in your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                placeholder="Enter your email"
                className="bg-white text-slate-900"
              />
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
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
