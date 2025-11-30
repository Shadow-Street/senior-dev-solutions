import { Message } from '@/lib/apiClient';

export class ReminderBot {
  static TRADING_HOURS = {
    preMarket: { start: 9, end: 9.25, label: 'Pre-Market' },
    regular: { start: 9.25, end: 15.30, label: 'Regular Trading' },
    postMarket: { start: 15.30, end: 16, label: 'Post-Market' }
  };

  static isMarketHours() {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const day = now.getDay();

    // Weekend check
    if (day === 0 || day === 6) {
      return { isOpen: false, session: 'closed', reason: 'Weekend' };
    }

    // Pre-market
    if (hours >= this.TRADING_HOURS.preMarket.start && hours < this.TRADING_HOURS.preMarket.end) {
      return { isOpen: true, session: 'preMarket', label: 'Pre-Market Session' };
    }

    // Regular hours
    if (hours >= this.TRADING_HOURS.regular.start && hours < this.TRADING_HOURS.regular.end) {
      return { isOpen: true, session: 'regular', label: 'Regular Trading Hours' };
    }

    // Post-market
    if (hours >= this.TRADING_HOURS.postMarket.start && hours < this.TRADING_HOURS.postMarket.end) {
      return { isOpen: true, session: 'postMarket', label: 'Post-Market Session' };
    }

    return { isOpen: false, session: 'closed', reason: 'After Hours' };
  }

  static async postMarketOpenReminder(chatRoomId) {
    const message = `🔔 **Market Opening Soon!**

🕘 Pre-Market opens at 9:00 AM
📈 Regular trading starts at 9:15 AM

Get ready to trade! Good luck traders! 🚀`;

    try {
      await Message.create({
        chat_room_id: chatRoomId,
        content: message,
        is_bot: true,
        message_type: 'bot_insight'
      });
      return { success: true };
    } catch (error) {
      console.error('Market open reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  static async postMarketCloseReminder(chatRoomId) {
    const message = `🔔 **Market Closing Soon!**

⏰ Regular trading closes at 3:30 PM
📊 Post-Market session until 4:00 PM

Time to review your positions! 📈`;

    try {
      await Message.create({
        chat_room_id: chatRoomId,
        content: message,
        is_bot: true,
        message_type: 'bot_insight'
      });
      return { success: true };
    } catch (error) {
      console.error('Market close reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  static async postMarketStatusReminder(chatRoomId) {
    const status = this.isMarketHours();
    
    let message;
    if (status.isOpen) {
      message = `📊 **Market Status**

✅ ${status.label}
🟢 Markets are OPEN

Happy trading! 💹`;
    } else {
      const reason = status.reason === 'Weekend' ? 'Weekend - Markets Closed' : 'After Trading Hours';
      message = `📊 **Market Status**

⭕ ${reason}
🔴 Markets are CLOSED

Next session starts Monday 9:00 AM ⏰`;
    }

    try {
      await Message.create({
        chat_room_id: chatRoomId,
        content: message,
        is_bot: true,
        message_type: 'bot_insight'
      });
      return { success: true, status };
    } catch (error) {
      console.error('Market status reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  static async postCustomReminder(chatRoomId, reminderText, scheduledTime) {
    const message = `⏰ **Reminder**

${reminderText}

📅 Scheduled: ${new Date(scheduledTime).toLocaleString()}`;

    try {
      await Message.create({
        chat_room_id: chatRoomId,
        content: message,
        is_bot: true,
        message_type: 'bot_insight'
      });
      return { success: true };
    } catch (error) {
      console.error('Custom reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  static scheduleMarketReminders(chatRoomId) {
    const intervals = [];

    // Schedule market open reminder (8:50 AM daily)
    const openReminderInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 8 && now.getMinutes() === 50 && now.getDay() !== 0 && now.getDay() !== 6) {
        this.postMarketOpenReminder(chatRoomId);
      }
    }, 60000); // Check every minute

    // Schedule market close reminder (3:20 PM daily)
    const closeReminderInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 15 && now.getMinutes() === 20 && now.getDay() !== 0 && now.getDay() !== 6) {
        this.postMarketCloseReminder(chatRoomId);
      }
    }, 60000); // Check every minute

    intervals.push(openReminderInterval, closeReminderInterval);

    return intervals;
  }

  static stopScheduledReminders(intervalIds) {
    intervalIds.forEach(id => clearInterval(id));
  }
}