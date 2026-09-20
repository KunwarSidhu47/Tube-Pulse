import ChannelHistory from '../models/ChannelHistory.js';

// Today's date in YYYY-MM-DD format (IST-safe)
const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Save today's snapshot for a channel.
 * Uses upsert so calling it multiple times in a day is safe.
 */
export const snapshotChannel = async (channelInfo) => {
  try {
    const stats = channelInfo.statistics || {};
    await ChannelHistory.findOneAndUpdate(
      { channelId: channelInfo.id, date: todayStr() },
      {
        channelId: channelInfo.id,
        channelTitle: channelInfo.snippet?.title || '',
        date: todayStr(),
        viewCount: parseInt(stats.viewCount || 0, 10),
        subscriberCount: parseInt(stats.subscriberCount || 0, 10),
        videoCount: parseInt(stats.videoCount || 0, 10),
      },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    // Non-blocking — never crash the main request
    console.error('[ChannelHistory] Failed to snapshot:', err.message);
  }
};

/**
 * Get the last N days of snapshots for a channel.
 * Returns an array sorted oldest → newest.
 */
export const getChannelHistory = async (channelId, days = 30) => {
  try {
    const snapshots = await ChannelHistory.find({ channelId })
      .sort({ date: -1 })
      .limit(days)
      .lean();
    return snapshots.reverse(); // oldest first for charts
  } catch (err) {
    console.error('[ChannelHistory] Failed to fetch history:', err.message);
    return [];
  }
};

/**
 * Get all unique tracked channel IDs (for the daily cron refresh).
 */
export const getTrackedChannelIds = async () => {
  try {
    return await ChannelHistory.distinct('channelId');
  } catch (err) {
    console.error('[ChannelHistory] Failed to get tracked channels:', err.message);
    return [];
  }
};
