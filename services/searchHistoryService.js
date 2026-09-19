import SearchHistory from '../models/SearchHistory.js';

export const saveSearch = async (channelData) => {
  try {
    const { id: channelId, snippet, statistics } = channelData;
    const channelName = snippet?.title;
    const thumbnail = snippet?.thumbnails?.default?.url;
    const subscribers = statistics?.subscriberCount ? parseInt(statistics.subscriberCount, 10) : 0;

    if (!channelId || !channelName) {
      return;
    }

    await SearchHistory.findOneAndUpdate(
      { channelId },
      {
        channelName,
        thumbnail,
        subscribers,
        searchedAt: Date.now(),
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error saving search history:', error.message);
  }
};

export const getRecentSearches = async () => {
  try {
    const searches = await SearchHistory.find()
      .sort({ searchedAt: -1 })
      .limit(10)
      .select('channelId channelName thumbnail subscribers searchedAt -_id'); // Exclude _id to return clean objects
    
    return searches;
  } catch (error) {
    console.error('Error fetching recent searches:', error.message);
    throw new Error('Failed to fetch recent searches', { cause: error });
  }
};
