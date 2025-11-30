import apiClient from '@/lib/apiClient';
import { Message, News } from '@/lib/apiClient';

export class NewsBot {
  static async postRelevantNews(chatRoomId, stockSymbol) {
    try {
      // Fetch news related to the stock
      const newsArticles = await News.filter({ 
        stock_impact: stockSymbol,
        is_breaking: true 
      }, '-created_date', 3).catch(() => []);

      if (newsArticles.length === 0) {
        // Try general market news
        const marketNews = await News.filter({ 
          category: 'market' 
        }, '-created_date', 1).catch(() => []);

        if (marketNews.length > 0) {
          const article = marketNews[0];
          const sentimentEmoji = article.sentiment === 'positive' ? '✅' : 
                                article.sentiment === 'negative' ? '⚠️' : 'ℹ️';

          const message = `📰 **Market News Update**

${sentimentEmoji} ${article.title}

${article.summary || article.content.substring(0, 200)}...

${article.external_url ? `🔗 [Read More](${article.external_url})` : ''}
📅 ${new Date(article.created_date).toLocaleString()}`;

          await Message.create({
            chat_room_id: chatRoomId,
            content: message,
            is_bot: true,
            message_type: 'bot_insight'
          });

          return { success: true, data: marketNews };
        }
      } else {
        // Post stock-specific news
        const article = newsArticles[0];
        const sentimentEmoji = article.sentiment === 'positive' ? '✅' : 
                              article.sentiment === 'negative' ? '⚠️' : 'ℹ️';
        const breakingBadge = article.is_breaking ? '🚨 BREAKING: ' : '';

        const message = `📰 **${breakingBadge}News Alert - ${stockSymbol}**

${sentimentEmoji} ${article.title}

${article.summary || article.content.substring(0, 200)}...

💼 Impact: ${article.stock_impact.join(', ')}
${article.external_url ? `🔗 [Read Full Article](${article.external_url})` : ''}
📅 ${new Date(article.created_date).toLocaleString()}`;

        await Message.create({
          chat_room_id: chatRoomId,
          content: message,
          is_bot: true,
          message_type: 'bot_insight',
          mentioned_stock: stockSymbol
        });

        return { success: true, data: newsArticles };
      }

      return { success: false, error: 'No news available' };
    } catch (error) {
      console.error('News Bot error:', error);
      return { success: false, error: error.message };
    }
  }

  static async fetchAndPostNews(chatRoomId, stockSymbol) {
    try {
      // Use LLM to fetch latest news from internet
      const newsData = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the latest news about ${stockSymbol} stock. Return recent news articles with title, summary, and sentiment.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            articles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                  source: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (newsData && newsData.articles && newsData.articles.length > 0) {
        const article = newsData.articles[0];
        const sentimentEmoji = article.sentiment === 'positive' ? '✅' : 
                              article.sentiment === 'negative' ? '⚠️' : 'ℹ️';

        const message = `📰 **Latest News - ${stockSymbol}**

${sentimentEmoji} ${article.title}

${article.summary}

📰 Source: ${article.source}
⏰ ${new Date().toLocaleString()}`;

        await Message.create({
          chat_room_id: chatRoomId,
          content: message,
          is_bot: true,
          message_type: 'bot_insight',
          mentioned_stock: stockSymbol
        });

        return { success: true, data: newsData.articles };
      }

      return { success: false, error: 'No news found' };
    } catch (error) {
      console.error('News fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  static async scheduleNewsUpdates(chatRoomId, stockSymbol, intervalMinutes = 60) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Post initial news
    await this.postRelevantNews(chatRoomId, stockSymbol);

    // Schedule recurring updates
    return setInterval(() => {
      this.postRelevantNews(chatRoomId, stockSymbol);
    }, intervalMs);
  }

  static stopScheduledUpdates(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}