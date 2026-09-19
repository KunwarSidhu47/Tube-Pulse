import { useState, useEffect, useRef } from 'react';
import './HomePage.css';
import AnalyticsDashboard from './AnalyticsDashboard';

// --- Helper Functions ---
const formatNumber = (num) => {
  if (!num) return '0';
  const n = parseInt(num, 10);
  if (isNaN(n)) return '0';
  const formatter = Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 2
  });
  return formatter.format(n);
};

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return '';
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 0) return 'Just now';

  const intervals = [
    { label: 'year', secs: 31536000 },
    { label: 'month', secs: 2592000 },
    { label: 'day', secs: 86400 },
    { label: 'hour', secs: 3600 },
    { label: 'min', secs: 60 },
  ];

  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
};

const formatDuration = (seconds) => {
  if (seconds === undefined || seconds === null) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- Subcomponents ---
const VideoCard = ({ video, isShort }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [thumbIndex, setThumbIndex] = useState(0);

  const thumbnails = Array.isArray(video.thumbnails) && video.thumbnails.length > 0
    ? video.thumbnails
    : [video.thumbnail];

  return (
    <div className={`video-card ${isShort ? 'short-card' : ''}`}>
      <div className="video-thumbnail-container">
        {!imageLoaded && <div className="skeleton skeleton-thumbnail"></div>}
        <img
          src={thumbnails[thumbIndex]}
          alt={video.title}
          className={`video-thumbnail ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            if (thumbIndex < thumbnails.length - 1) {
              setThumbIndex(thumbIndex + 1);
            }
          }}
        />
        <span className="duration-badge">{formatDuration(video.durationSeconds)}</span>
      </div>
      <div className="video-info">
        <h4 className="video-title" title={video.title}>{video.title}</h4>

        <div className="video-stats-row">
          <span className="stat-item" title={`${video.viewCount} views`}>
            <svg viewBox="0 0 24 24" className="icon"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
            {formatNumber(video.viewCount)}
          </span>
          {video.likeCount && video.likeCount !== "0" && (
            <span className="stat-item" title={`${video.likeCount} likes`}>
              <svg viewBox="0 0 24 24" className="icon"><path fill="currentColor" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" /></svg>
              {formatNumber(video.likeCount)}
            </span>
          )}
        </div>

        <div className="video-date-row">
          <span className="video-relative-date">{timeAgo(video.publishedDate)}</span>
        </div>

        <a
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="watch-button"
        >
          <svg viewBox="0 0 24 24" className="play-icon" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          Watch on YouTube
        </a>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function HomePage() {
  const [channelName, setChannelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Recent searches state
  const [recentSearches, setRecentSearches] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Function to fetch recent searches
  const fetchRecentSearches = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/recent-searches`);
      if (response.ok) {
        const data = await response.json();
        setRecentSearches(data);
      }
    } catch (err) {
      console.error('Failed to fetch recent searches:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadRecentSearches = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/recent-searches`);
        if (response.ok && isActive) {
          setRecentSearches(await response.json());
        }
      } catch (err) {
        console.error('Failed to fetch recent searches:', err);
      } finally {
        if (isActive) setLoadingRecent(false);
      }
    };

    loadRecentSearches();
    return () => {
      isActive = false;
    };
  }, []);

  // State for the new nested backend response
  const [channelData, setChannelData] = useState(null);
  const [latestVideos, setLatestVideos] = useState([]);
  const [latestShorts, setLatestShorts] = useState([]);

  // New state variables for autocomplete and expandable description
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const searchContainerRef = useRef(null);

  // Cache to store previous suggestion results
  const suggestionsCache = useRef({});
  // Ref to track the last searched query to prevent duplicates
  const lastSearchedRef = useRef('');

  // Debounced fetch for suggestions
  useEffect(() => {
    const trimmedQuery = channelName.trim();
    if (!trimmedQuery) {
      return;
    }

    // Check frontend cache first
    if (suggestionsCache.current[trimmedQuery]) {
      setSuggestions(suggestionsCache.current[trimmedQuery]);
      setShowDropdown(true);
      return;
    }

    const abortController = new AbortController();

    const timerId = setTimeout(async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/suggestions/${encodeURIComponent(trimmedQuery)}`, {
          signal: abortController.signal
        });
        if (response.ok) {
          const data = await response.json();
          // Save to cache
          suggestionsCache.current[trimmedQuery] = data;
          setSuggestions(data);
          setShowDropdown(true);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch suggestions:', err);
        }
      }
    }, 700);

    return () => {
      clearTimeout(timerId);
      abortController.abort();
    };
  }, [channelName]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeSearch = async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // Prevent duplicate searches for the same query
    if (trimmedQuery === lastSearchedRef.current) {
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setError(null);
    setChannelData(null);
    setLatestVideos([]);
    setLatestShorts([]);
    setShowDropdown(false); // Close dropdown on search
    setSuggestions([]); // Clear suggestions explicitly
    setFocusedSuggestionIndex(-1);
    setIsDescriptionExpanded(false); // Reset description state

    try {
      lastSearchedRef.current = trimmedQuery; // Update last searched query
      const response = await fetch(`http://localhost:5000/api/channel/${encodeURIComponent(trimmedQuery)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch channel data');
      }

      setChannelData(data.channel);

      setLatestVideos(data.videos || []);
      setLatestShorts(data.shorts || []);

      setChannelName(query); // Update input to match the searched query
      fetchRecentSearches(); // Refresh recent searches after a successful search
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeSearch(channelName);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestionIndex((prevIndex) =>
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestionIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < suggestions.length) {
        e.preventDefault(); // Prevent form submission
        const selected = suggestions[focusedSuggestionIndex].title;
        executeSearch(selected);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setFocusedSuggestionIndex(-1);
    }
  };

  return (
    <div className="home-container">
      <div className="search-section">
        <h1 className="title">Tube Pulse</h1>
        <p className="subtitle">Discover channel insights instantly</p>

        <div className="search-container" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              className="search-input"
              placeholder="Enter channel name (e.g., mrbeast)"
              value={channelName}
              onChange={(e) => {
                const nextValue = e.target.value;
                setChannelName(nextValue);
                if (nextValue.trim()) {
                  setShowDropdown(true);
                } else {
                  setSuggestions([]);
                  setShowDropdown(false);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
            />
            <button type="submit" className="search-button" disabled={loading || !channelName.trim()}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.channelId || index}
                  className={`suggestion-item ${index === focusedSuggestionIndex ? 'active' : ''}`}
                  onClick={() => executeSearch(suggestion.title)}
                  onMouseEnter={() => setFocusedSuggestionIndex(index)}
                >
                  <img src={suggestion.thumbnail} alt="" className="suggestion-thumbnail" />
                  <span className="suggestion-text">{suggestion.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Searches Section */}
      {!loadingRecent && recentSearches.length > 0 && (
        <div className="recent-searches-section">
          <h2 className="recent-searches-title">Recent Searches</h2>
          <div className="recent-searches-grid">
            {recentSearches.map((search, index) => (
              <div
                key={search.channelId || index}
                className="recent-search-card"
                onClick={() => executeSearch(search.channelName)}
              >
                <img src={search.thumbnail || '/favicon.svg'} alt={search.channelName} className="recent-search-thumb" />
                <div className="recent-search-info">
                  <h3>{search.channelName}</h3>
                  <p>{search.subscribers ? Number(search.subscribers).toLocaleString() : 0} subscribers</p>
                  <small>{timeAgo(search.searchedAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="results-section">
        {loading && (
          <div className="loader-container">
            <div className="skeleton-card"></div>
            <div className="skeleton-card"></div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {channelData && !loading && (
          <div className="channel-content-wrapper">
            <div className="channel-card">
              <div className="card-header">
                <div className="header-gradient"></div>
                <img src={channelData.thumbnail} alt={channelData.title} className="channel-avatar" />
              </div>

              <div className="card-body">
                <h2 className="channel-title">{channelData.title}</h2>
                {channelData.customUrl && (
                  <span className="channel-handle">{channelData.customUrl}</span>
                )}

                <div className="stats-container">
                  <div className="stat-box">
                    <span className="stat-value">{formatNumber(channelData.subscriberCount)}</span>
                    <span className="stat-label">Subscribers</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">{formatNumber(channelData.viewCount)}</span>
                    <span className="stat-label">Total Views</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">{formatNumber(channelData.videoCount)}</span>
                    <span className="stat-label">Videos</span>
                  </div>
                </div>

                <div className="description-container">
                  <p className={`channel-description ${isDescriptionExpanded ? 'expanded' : ''}`}>
                    {channelData.description || 'No description available for this channel.'}
                  </p>
                  {channelData.description && channelData.description.length > 150 && (
                    <button
                      className="read-more-btn"
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    >
                      {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <AnalyticsDashboard
              channelData={channelData}
              latestVideos={latestVideos}
              latestShorts={latestShorts}
            />

            {/* Latest Videos Section */}
            <div className="videos-section">
              <h3 className="section-title">📹 Latest Videos</h3>
              {latestVideos.length > 0 ? (
                <div className="videos-grid">
                  {latestVideos.map((video, index) => (
                    <VideoCard key={video.videoId || index} video={video} />
                  ))}
                </div>
              ) : (
                <div className="no-videos-message">
                  <p>No recent videos found for this channel.</p>
                </div>
              )}
            </div>

            {/* Latest Shorts Section */}
            <div className="videos-section">
              <h3 className="section-title">🎬 Latest Shorts</h3>
              {latestShorts.length > 0 ? (
                <div className="videos-grid">
                  {latestShorts.map((short, index) => (
                    <VideoCard key={short.videoId || index} video={short} isShort={true} />
                  ))}
                </div>
              ) : (
                <div className="no-videos-message">
                  <p>No recent shorts found for this channel.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
