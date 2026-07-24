// Import the dotenv module to load environment variables from a .env file
import dotenv from 'dotenv';
// Import the express module
import express from 'express';
// Import the cors module
import cors from 'cors';

// Load environment variables from the .env file into process.env
dotenv.config();

// Initialize the express application
const app = express();

// Enable CORS
app.use(cors());

// Middleware to parse incoming JSON requests
// express.json() reads the request body and parses it into a JavaScript object (req.body)
app.use(express.json());

// Define the port to run the server on
const PORT = 5000;

// Helper to parse YouTube ISO 8601 duration (e.g., PT1H2M10S) to seconds
const parseISODuration = (durationStr) => {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h * 3600 + m * 60 + s;
};

// --- In-Memory Cache System ---
const cache = new Map();
const CACHE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

// Helper to fetch from YouTube with caching and unified logging
const fetchYouTube = async (url, endpointName, cacheKey) => {
  if (cache.has(cacheKey)) {
    const cachedItem = cache.get(cacheKey);
    if (Date.now() - cachedItem.timestamp < CACHE_EXPIRATION_MS) {
      console.log(`[Cache Hit] ${endpointName}`);
      return cachedItem.data;
    } else {
      cache.delete(cacheKey);
    }
  }

  console.log(`[YouTube API] ${endpointName}`);
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`YouTube ${endpointName} API Error:`, errorData);
    
    if (response.status === 429 || (errorData.error && errorData.error.message.includes('Quota'))) {
      const error = new Error('YouTube API daily quota exceeded. Please try again tomorrow or use a new API key.');
      error.status = 429;
      throw error;
    }
    
    const error = new Error(`Failed at ${endpointName}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
};

// Create a GET route with a dynamic parameter 'channelName' to fetch channel details
app.get('/api/channel/:channelName', async (req, res) => {
  try {
    // Read the channelName from the route parameters
    const { channelName } = req.params;
    
    // Retrieve the YouTube API key from environment variables
    const apiKey = process.env.YOUTUBE_API_KEY;

    // Check if the API key is configured
    if (!apiKey) {
      return res.status(500).json({ error: 'YouTube API key is missing. Please check your .env file.' });
    }

    // Step 1: Search for the channel by name
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelName)}&maxResults=1&key=${apiKey}`;
    const searchData = await fetchYouTube(searchUrl, 'search.list', `search:${channelName}`);

    if (!searchData.items || searchData.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channelId = searchData.items[0].snippet.channelId;

    // Step 2: Fetch channel details
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`;
    const channelData = await fetchYouTube(channelUrl, 'channels.list', `channel:${channelId}`);

    if (!channelData.items || channelData.items.length === 0) {
      return res.status(404).json({ error: 'Channel details not found' });
    }

    const channelInfo = channelData.items[0];
    const snippet = channelInfo.snippet;
    const statistics = channelInfo.statistics;

    // Step 3: Format the channel data
    const channelDataFormatted = {
      title: snippet.title,
      description: snippet.description,
      subscriberCount: statistics.subscriberCount,
      viewCount: statistics.viewCount,
      videoCount: statistics.videoCount,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      customUrl: snippet.customUrl || null,
      channelId: channelId
    };

    // Step 4: Fetch the latest uploads from the channel's uploads playlist
    const uploadsPlaylistId = channelInfo.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      return res.status(404).json({ error: 'Uploads playlist not found for this channel' });
    }

    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=15&key=${apiKey}`;
    const playlistData = await fetchYouTube(playlistUrl, 'playlistItems.list', `playlist:${uploadsPlaylistId}`);
    
    const videoIds = (playlistData.items || []).map(item => item.contentDetails?.videoId).filter(Boolean);

    let finalVideos = [];
    let finalShorts = [];
    
    if (videoIds.length > 0) {
      const videoStatsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`;
      const videoStatsData = await fetchYouTube(videoStatsUrl, 'videos.list', `videos:${videoIds.join(',')}`);
        
      const allFetchedVideos = (videoStatsData.items || []).map(item => {
          const durationSeconds = parseISODuration(item.contentDetails?.duration);
          // YouTube generally considers videos <= 60 seconds as Shorts
          const isShort = durationSeconds <= 60;
          
          const thumbs = item.snippet?.thumbnails;
          const thumbnailList = [
            `https://i.ytimg.com/vi/${item.id}/maxresdefault.jpg`,
            `https://i.ytimg.com/vi/${item.id}/sddefault.jpg`,
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            thumbs?.maxres?.url,
            thumbs?.standard?.url,
            thumbs?.high?.url,
            thumbs?.medium?.url,
            thumbs?.default?.url
          ].filter(Boolean);
          
          return {
            videoId: item.id,
            title: item.snippet?.title,
            description: item.snippet?.description,
            thumbnail: thumbnailList[0], // Keep for backwards compatibility
            thumbnails: thumbnailList, // Array of fallbacks
            publishedDate: item.snippet?.publishedAt,
            channelTitle: item.snippet?.channelTitle,
            duration: item.contentDetails?.duration, 
            durationSeconds: durationSeconds,
            viewCount: item.statistics?.viewCount || "0",
            likeCount: item.statistics?.likeCount || "0",
            commentCount: item.statistics?.commentCount || "0",
            type: isShort ? 'short' : 'video'
          };
        });

        // Split into videos and shorts, limiting to 5 each
      finalVideos = allFetchedVideos.filter(v => v.type === 'video').slice(0, 5);
      finalShorts = allFetchedVideos.filter(v => v.type === 'short').slice(0, 5);
    }

    // Step 5: Format the final response with channel, videos, and shorts separately
    const finalResponse = {
      channel: channelDataFormatted,
      videos: finalVideos,
      shorts: finalShorts
    };

    // Return the combined response
    res.json(finalResponse);

  } catch (error) {
    // Handle any unexpected errors (e.g., network issues)
    console.error('Error fetching channel data:', error.message || error);
    
    // If the error was thrown by our fetch wrapper (e.g. Quota Exceeded), forward it
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error while fetching channel details' });
  }
});

// Create a GET route to fetch autocomplete suggestions
app.get('/api/suggestions/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'YouTube API key is missing.' });
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=5&key=${apiKey}`;
    const searchData = await fetchYouTube(searchUrl, 'search.list', `suggestions:${query}`);

    const suggestions = (searchData.items || []).map(item => ({
      channelId: item.snippet.channelId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.default?.url
    }));

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error.message || error);
    
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a POST route to receive data
app.post('/api/channel', (req, res) => {
  // Read channelName from the parsed JSON request body
  // req.body contains the data sent by the client (requires express.json() middleware)
  const { channelName } = req.body;

  // Return a JSON response with the received channel name
  res.json({
    message: "Channel received via POST",
    channel: channelName
  });
});

// Create a GET route to test loading the YouTube API key
app.get('/api/youtube-test', (req, res) => {
  // Read the YOUTUBE_API_KEY from process.env
  // process.env is an object containing the user environment variables
  // We use dotenv to load values from a .env file into process.env
  // API keys should not be hardcoded in the source code because if the code is shared or pushed to a public repository (like GitHub),
  // anyone could steal the key and use it, potentially causing security risks or unexpected charges.
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    res.json({
      message: "API key loaded successfully"
    });
  } else {
    res.json({
      message: "API key missing"
    });
  }
});

// Start the server and listen on the defined port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
