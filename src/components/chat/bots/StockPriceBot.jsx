import { dhanGetStockPrice } from '@/api/functions';
import { Message } from '@/api/entities';

export class StockPriceBot {
  static async postPriceUpdate(chatRoomId, stockSymbol, interval = 300000) {
    try {
      const response = await dhanGetStockPrice({ symbol: stockSymbol });
      
      if (response.data?.success && response.data.data) {
        const priceData = response.data.data;
        const changeEmoji = priceData.change_percent >= 0 ? '📈' : '📉';
        const trendEmoji = priceData.change_percent >= 2 ? '🚀' : 
                          priceData.change_percent <= -2 ? '⚠️' : '📊';

        const message = `${trendEmoji} **${stockSymbol} Price Update**

💰 Current: ₹${priceData.current_price.toFixed(2)}
${changeEmoji} Change: ${priceData.change_percent >= 0 ? '+' : ''}${priceData.change_percent.toFixed(2)}% (₹${priceData.change_amount >= 0 ? '+' : ''}${priceData.change_amount.toFixed(2)})

📊 High: ₹${priceData.day_high.toFixed(2)} | Low: ₹${priceData.day_low.toFixed(2)}
📦 Volume: ${(priceData.volume / 1000000).toFixed(2)}M shares
⏰ Updated: ${new Date().toLocaleTimeString()}`;

        await Message.create({
          chat_room_id: chatRoomId,
          content: message,
          is_bot: true,
          message_type: 'bot_insight',
          mentioned_stock: stockSymbol
        });

        return { success: true, data: priceData };
      }
      
      return { success: false, error: 'No price data available' };
    } catch (error) {
      console.error('Stock Price Bot error:', error);
      return { success: false, error: error.message };
    }
  }

  static async scheduleUpdates(chatRoomId, stockSymbol, intervalMinutes = 30) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Post initial update
    await this.postPriceUpdate(chatRoomId, stockSymbol);

    // Schedule recurring updates
    return setInterval(() => {
      this.postPriceUpdate(chatRoomId, stockSymbol);
    }, intervalMs);
  }

  static stopScheduledUpdates(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}