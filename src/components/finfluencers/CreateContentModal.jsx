import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from '@/components/ui/badge';
import { Video, Upload, Link as LinkIcon, FileText, Sparkles, X } from 'lucide-react';
import { toast } from "sonner";
import apiClient from '@/lib/apiClient';

export default function CreateContentModal({ open, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    post_type: 'video',
    video_url: '',
    thumbnail_url: '',
    duration: '',
    stock_mentions: [],
    tags: [],
    is_premium: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [currentStockInput, setCurrentStockInput] = useState('');
  const [currentTagInput, setCurrentTagInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.post_type === 'video' && !formData.video_url) {
      toast.error('Please provide a video URL');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate(formData);
      // Reset form
      setFormData({
        title: '',
        content: '',
        post_type: 'video',
        video_url: '',
        thumbnail_url: '',
        duration: '',
        stock_mentions: [],
        tags: [],
        is_premium: false
      });
    } catch (error) {
      console.error('Error creating content:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThumbnailUpload = async (file) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingThumbnail(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, thumbnail_url: file_url }));
      toast.success('Thumbnail uploaded successfully!');
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const addStock = () => {
    if (currentStockInput.trim() && !formData.stock_mentions.includes(currentStockInput.trim().toUpperCase())) {
      setFormData(prev => ({
        ...prev,
        stock_mentions: [...prev.stock_mentions, currentStockInput.trim().toUpperCase()]
      }));
      setCurrentStockInput('');
    }
  };

  const removeStock = (stock) => {
    setFormData(prev => ({
      ...prev,
      stock_mentions: prev.stock_mentions.filter(s => s !== stock)
    }));
  };

  const addTag = () => {
    if (currentTagInput.trim() && !formData.tags.includes(currentTagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTagInput.trim()]
      }));
      setCurrentTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-600" />
            Create Content
          </DialogTitle>
          <DialogDescription>
            Share videos, live seminars, and educational content with your followers
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Content Type Selection */}
          <div>
            <Label>Content Type *</Label>
            <Select value={formData.post_type} onValueChange={(value) => setFormData(prev => ({...prev, post_type: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Video (YouTube, Vimeo)
                  </div>
                </SelectItem>
                <SelectItem value="article">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Article / Blog Post
                  </div>
                </SelectItem>
                <SelectItem value="quick_tip">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Quick Tip
                  </div>
                </SelectItem>
                <SelectItem value="market_update">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Market Update
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Content Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
              placeholder="Enter a catchy title for your content"
              required
            />
          </div>

          {/* Video URL - Only for video type */}
          {formData.post_type === 'video' && (
            <div>
              <Label htmlFor="video_url">Video URL *</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData(prev => ({...prev, video_url: e.target.value}))}
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Supported: YouTube, Vimeo, Dailymotion, or any video URL
              </p>
            </div>
          )}

          {/* Duration - Only for video type */}
          {formData.post_type === 'video' && (
            <div>
              <Label htmlFor="duration">Video Duration (optional)</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({...prev, duration: e.target.value}))}
                placeholder="e.g., 15:30 or 1h 25m"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="content">Description *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({...prev, content: e.target.value}))}
              placeholder="Describe your content, key takeaways, and what viewers will learn..."
              className="h-32"
              required
            />
          </div>

          {/* Thumbnail Upload */}
          <div>
            <Label>Thumbnail Image</Label>
            <div className="mt-2 space-y-3">
              {formData.thumbnail_url ? (
                <div className="relative inline-block">
                  <img 
                    src={formData.thumbnail_url} 
                    alt="Thumbnail preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-purple-200"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData(prev => ({...prev, thumbnail_url: ''}))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <Label htmlFor="thumbnail-upload" className="cursor-pointer">
                    <span className="text-purple-600 font-semibold hover:text-purple-700">
                      Click to upload thumbnail
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      PNG, JPG up to 5MB (Recommended: 1280x720px)
                    </p>
                  </Label>
                  <Input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleThumbnailUpload(file);
                    }}
                    disabled={isUploadingThumbnail}
                  />
                  {isUploadingThumbnail && (
                    <p className="text-sm text-purple-600 mt-2">Uploading...</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stock Mentions */}
          <div>
            <Label>Stock Mentions (optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={currentStockInput}
                onChange={(e) => setCurrentStockInput(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addStock();
                  }
                }}
                placeholder="e.g., RELIANCE, TCS"
              />
              <Button type="button" onClick={addStock} variant="outline">
                Add
              </Button>
            </div>
            {formData.stock_mentions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.stock_mentions.map((stock, idx) => (
                  <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                    {stock}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-blue-900" 
                      onClick={() => removeStock(stock)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={currentTagInput}
                onChange={(e) => setCurrentTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="e.g., Technical Analysis, Swing Trading"
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.tags.map((tag, idx) => (
                  <Badge key={idx} className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
                    {tag}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-purple-900" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Premium Content Toggle */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div>
                <Label htmlFor="is_premium" className="cursor-pointer">Premium Content</Label>
                <p className="text-xs text-slate-600">Only your subscribers can access this content</p>
              </div>
            </div>
            <Switch
              id="is_premium"
              checked={formData.is_premium}
              onCheckedChange={(checked) => setFormData(prev => ({...prev, is_premium: checked}))}
            />
          </div>

          {/* Content Guidelines */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Content Publishing Guidelines
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Videos: Use YouTube, Vimeo, or any embed-compatible link</li>
              <li>• Thumbnails: Upload eye-catching images (1280x720px recommended)</li>
              <li>• Stock mentions: Tag relevant stocks for better discoverability</li>
              <li>• Content will be pending admin approval before going live</li>
              <li>• Premium content is only visible to your paid subscribers</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isUploadingThumbnail}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Content'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}