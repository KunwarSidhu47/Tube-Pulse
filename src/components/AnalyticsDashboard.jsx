import { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import './AnalyticsDashboard.css';

const TIME_FILTERS = [
  { key: 'all', label: 'All Time' },
  { key: '1y', label: 'Last Year' },
  { key: '3m', label: 'Last 3 Months' },
  { key: '7d', label: 'Last Week' },
];

const formatNumber = (num) => {
  if (!num) return '0';
  const n = parseInt(num, 10);
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const totalSeconds = Math.round(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const COLORS = ['#60a5fa', '#c084fc', '#f472b6', '#fbbf24'];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
  }
};

// Props:
// allVideos / allShorts  — full unfiltered data  → used for stats cards
// chartVideos / chartShorts — time-filtered data → used for charts only
export default function AnalyticsDashboard({
  channelData,
  allVideos,
  allShorts,
  chartVideos,
  chartShorts,
  timeFilter,
  setTimeFilter,
  totalItems,
}) {
  const [historyData, setHistoryData] = useState([]);
  const [historyMetric, setHistoryMetric] = useState('views');
  const [videoChartMetric, setVideoChartMetric] = useState('engagement');

  useEffect(() => {
    if (!channelData?.id) return;
    fetch(`/api/channel-history/${channelData.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHistoryData(data);
      })
      .catch(err => console.error('[Analytics] History fetch error:', err));
  }, [channelData?.id]);

  const analytics = useMemo(() => {
    const allItems = [...(allVideos || []), ...(allShorts || [])];
    if (allItems.length === 0) return null;

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalVideoDuration = 0;
    let videoCountForDuration = 0;
    let totalShortDuration = 0;
    let shortCountForDuration = 0;
    let titleText = '';
    let titlesWithEmoji = 0;

    const sortedByDate = [...allItems].sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
    let totalGapDays = 0;
    let gapCount = 0;
    const weekdayCount = {};
    const hourCount = {};
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

    sortedByDate.forEach((item, index) => {
      totalViews += parseInt(item.viewCount || 0, 10);
      totalLikes += parseInt(item.likeCount || 0, 10);
      totalComments += parseInt(item.commentCount || 0, 10);

      if (item.durationSeconds && item.durationSeconds > 0) {
        if (item.type === 'video') {
          totalVideoDuration += item.durationSeconds;
          videoCountForDuration++;
        } else {
          totalShortDuration += item.durationSeconds;
          shortCountForDuration++;
        }
      }

      titleText += item.title + ' ';
      if (emojiRegex.test(item.title)) titlesWithEmoji++;

      const date = new Date(item.publishedDate);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      weekdayCount[weekday] = (weekdayCount[weekday] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;

      if (index > 0) {
        const gapMs = date - new Date(sortedByDate[index - 1].publishedDate);
        totalGapDays += gapMs / (1000 * 60 * 60 * 24);
        gapCount++;
      }
    });

    const count = allItems.length;
    const avgViews = Math.round(totalViews / count);
    const avgLikes = Math.round(totalLikes / count);
    const avgComments = Math.round(totalComments / count);
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
    const avgVideoDuration = videoCountForDuration > 0 ? totalVideoDuration / videoCountForDuration : 0;
    const avgShortDuration = shortCountForDuration > 0 ? totalShortDuration / shortCountForDuration : 0;

    const allTitleWords = titleText.trim().split(/\s+/).filter(w => w.length > 0);
    const avgTitleWords = count > 0 ? Math.round(allTitleWords.length / count) : 0;
    const emojiPercentage = (titlesWithEmoji / count) * 100;

    const avgGap = gapCount > 0 ? totalGapDays / gapCount : 0;
    const uploadsPerMonth = avgGap > 0 ? 30 / avgGap : 0;

    const mostActiveWeekday = Object.keys(weekdayCount).length > 0
      ? Object.keys(weekdayCount).reduce((a, b) => weekdayCount[a] > weekdayCount[b] ? a : b)
      : 'N/A';
    const mostCommonHour = Object.keys(hourCount).length > 0
      ? Object.keys(hourCount).reduce((a, b) => hourCount[a] > hourCount[b] ? a : b)
      : 'N/A';
    const formattedHour = mostCommonHour !== 'N/A'
      ? new Date(2000, 0, 1, parseInt(mostCommonHour, 10)).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
      : 'N/A';

    const words = titleText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const stopWords = ['the','a','to','and','in','of','is','it','you','i','on','for','with','my','this','that','we','are','was','at','be','do','how','what','can','its','but','not','from','by','or','your','our','an','as','so','up','out','if','he','she','they','their'];
    const wordFreq = {};
    words.forEach(w => {
      if (w.length > 2 && !stopWords.includes(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
    const topKeywords = Object.keys(wordFreq).sort((a, b) => wordFreq[b] - wordFreq[a]).slice(0, 5).join(', ');

    // Chart data uses FILTERED items only
    const chartItems = [...(chartVideos || []), ...(chartShorts || [])]
      .sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
    const chartData = chartItems.map((item, index) => {
      const views = parseInt(item.viewCount || 0, 10);
      const likes = parseInt(item.likeCount || 0, 10);
      const engagement = views > 0 ? parseFloat(((likes / views) * 100).toFixed(2)) : 0;
      
      const isShort = item.type === 'short';
      const rpmLow = isShort ? 0.03 : 1.20;
      const rpmHigh = isShort ? 0.08 : 3.50;
      const rpmMid = isShort ? 0.05 : 2.25;

      const estRevMid = Math.round((views / 1000) * rpmMid);
      const estRevLow = Math.round((views / 1000) * rpmLow);
      const estRevHigh = Math.round((views / 1000) * rpmHigh);

      const rawDate = new Date(item.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const uniqueDateKey = `${rawDate}__${index}`;

      return {
        title: item.title.substring(0, 15) + (item.title.length > 15 ? '…' : ''),
        fullTitle: item.title,
        views,
        likes,
        engagement,
        estRevMid,
        estRevLow,
        estRevHigh,
        date: rawDate,
        uniqueDateKey,
        type: item.type,
      };
    });

    // Pie uses full data
    const pieData = [
      { name: 'Videos', value: (allVideos || []).length },
      { name: 'Shorts', value: (allShorts || []).length },
    ].filter(d => d.value > 0);

    // Score
    const engScore = Math.min((engagementRate / 8) * 40, 40);
    const consistencyScore = Math.min((14 / Math.max(avgGap, 1)) * 30, 30);
    const subCount = parseInt(channelData.subscriberCount || 1, 10);
    const viewSubRatio = avgViews / subCount;
    const viewScore = Math.min((viewSubRatio / 0.2) * 30, 30);
    let totalScore = Math.round(engScore + consistencyScore + viewScore);
    if (isNaN(totalScore)) totalScore = 50;

    let engRateContext = 'Below Avg';
    if (engagementRate >= 6) engRateContext = 'Excellent';
    else if (engagementRate >= 3) engRateContext = 'Above Avg';
    else if (engagementRate >= 1) engRateContext = 'Industry Avg';

    const recommendations = [];
    if (engagementRate > 6) recommendations.push({ type: 'success', text: 'High audience engagement rate (above industry avg)' });
    else if (engagementRate < 1) recommendations.push({ type: 'warning', text: 'Engagement is below the 1–4% industry average' });
    else recommendations.push({ type: 'info', text: `Engagement is within the 1–4% industry average (${engagementRate.toFixed(1)}%)` });

    const nowTime = new Date().getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const uploadsLastWeek = allItems.filter(item => {
      const itemDate = new Date(item.publishedDate).getTime();
      return !isNaN(itemDate) && (nowTime - itemDate) <= sevenDaysMs;
    }).length;

    if (uploadsLastWeek >= 3) {
      recommendations.push({ type: 'success', text: `Excellent upload consistency (${uploadsLastWeek} upload${uploadsLastWeek > 1 ? 's' : ''} in the last week)` });
    } else {
      recommendations.push({ type: 'warning', text: `Need to be more consistent (${uploadsLastWeek} upload${uploadsLastWeek === 1 ? '' : 's'} in the last week)` });
    }

    if (avgTitleWords > 12) recommendations.push({ type: 'warning', text: 'Titles tend to be long (>12 words) — shorter titles often perform better' });

    if ((allShorts || []).length > (allVideos || []).length) {
      recommendations.push({ type: 'info', text: 'Strong Shorts focus in recent uploads' });
    } else {
      recommendations.push({ type: 'info', text: 'Long-form videos make up the bulk of recent uploads' });
    }

    return {
      avgViews, avgLikes, avgComments,
      avgVideoDuration, avgShortDuration, videoCountForDuration, shortCountForDuration,
      engagementRate, engRateContext,
      avgGap, uploadsPerMonth, mostActiveWeekday, formattedHour,
      avgTitleWords, topKeywords, emojiPercentage,
      chartData, pieData, totalScore, recommendations,
    };
  }, [channelData, allVideos, allShorts, chartVideos, chartShorts]);

  if (!analytics) return null;

  return (
    <div className="analytics-dashboard">
      <h2 className="dashboard-title">Analytics Dashboard</h2>

      {/* 1. Performance Overview Cards — always from full data */}
      <div className="analytics-grid performance-grid">
        <div className="analytics-card">
          <div className="card-icon icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <div className="card-content">
            <span className="card-value">{formatNumber(analytics.avgViews)}</span>
            <span className="card-label">Avg Views / Upload</span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon icon-pink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
          <div className="card-content">
            <span className="card-value">{formatNumber(analytics.avgLikes)}</span>
            <span className="card-label">Avg Likes / Upload</span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon icon-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="card-content">
            <span className="card-value">{formatNumber(analytics.avgComments)}</span>
            <span className="card-label">Avg Comments / Upload</span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon icon-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"></path>
            </svg>
          </div>
          <div className="card-content">
            <span className="card-value">
              {analytics.engagementRate.toFixed(2)}%
              <span className="card-value-badge">{analytics.engRateContext}</span>
            </span>
            <span className="card-label">Engagement Rate <span className="card-label-note">(Industry avg: 1–4%)</span></span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon icon-emerald">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="card-content">
            <span className="card-value">
              {analytics.videoCountForDuration > 0
                ? formatDuration(analytics.avgVideoDuration)
                : analytics.shortCountForDuration > 0
                  ? formatDuration(analytics.avgShortDuration)
                  : 'N/A'}
            </span>
            <span className="card-label">
              {analytics.videoCountForDuration > 0 ? 'Avg Video Duration' : 'Avg Short Duration'}
            </span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon icon-indigo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <div className="card-content">
            <span className="card-value">{formatNumber(channelData.videoCount)}</span>
            <span className="card-label">Total Channel Uploads</span>
          </div>
        </div>
      </div>

      <div className="analytics-split">
        {/* 2. Upload Analytics */}
        <div className="analytics-panel">
          <h3>Upload Analytics</h3>
          <ul className="stats-list">
            <li><span>Est. Uploads / Month</span> <strong>{analytics.uploadsPerMonth.toFixed(1)}</strong></li>
            <li><span>Avg Gap Between Uploads</span> <strong>{analytics.avgGap.toFixed(1)} days</strong></li>
            <li><span>Most Active Day</span> <strong>{analytics.mostActiveWeekday}</strong></li>
            <li><span>Peak Upload Hour</span> <strong>{analytics.formattedHour}</strong></li>
          </ul>
        </div>

        {/* 3. Content Analysis */}
        <div className="analytics-panel">
          <h3>Content Analysis</h3>
          <ul className="stats-list">
            <li><span>Avg Title Length</span> <strong>{analytics.avgTitleWords} words</strong></li>
            <li><span>Emoji in Titles</span> <strong>{analytics.emojiPercentage.toFixed(0)}%</strong></li>
            <li>
              <span>Top Keywords Used</span>
              <strong className="keywords-value">{analytics.topKeywords || 'N/A'}</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Time Filter Bar */}
      <div className="time-filter-bar">
        <span className="time-filter-label">Analysing:</span>
        <div className="time-filter-pills">
          {TIME_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`time-filter-pill ${timeFilter === key ? 'active' : ''}`}
              onClick={() => setTimeFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="time-filter-note">
          {totalItems} item{totalItems !== 1 ? 's' : ''} in range
          {totalItems === 0 && ' — try a wider range'}
        </span>
      </div>

      {/* 4. Charts — filtered by selected time range */}
      {analytics.chartData.length === 0 ? (
        <div className="analytics-empty">
          <p>📭 No uploads in this time range — charts will appear here. Stats above are based on all fetched data.</p>
        </div>
      ) : (
        <div className="charts-section">
          <div className="chart-container chart-full">
            <h3>Views per Recent Upload</h3>
            <div className="chart-wrapper chart-tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="title" stroke="#64748b" fontSize={11} tick={{ fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis stroke="#64748b" fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={formatNumber} width={55} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '13px', maxWidth: '260px' }}>
                          <p style={{ margin: '0 0 6px', fontWeight: 600, lineHeight: 1.4 }}>{d.fullTitle}</p>
                          <p style={{ margin: 0, color: '#60a5fa' }}>{formatNumber(d.views)} views</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="views" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-container chart-full">
            <div className="chart-header-row">
              <div>
                <h3>{videoChartMetric === 'engagement' ? 'Engagement Rate per Video' : 'Est. Revenue per Video'}</h3>
                <p className="chart-subtitle">
                  {videoChartMetric === 'engagement'
                    ? 'Likes-to-views ratio (%) per upload — highlights top-converting content'
                    : 'Est. AdSense earnings based on YouTube RPM benchmarks ($1.20–$3.50 / 1K views for videos, $0.03–$0.08 for Shorts)'}
                </p>
              </div>
              <div className="metric-toggle-group">
                <button
                  className={`metric-toggle-btn ${videoChartMetric === 'engagement' ? 'active' : ''}`}
                  onClick={() => setVideoChartMetric('engagement')}
                >
                  Engagement %
                </button>
                <button
                  className={`metric-toggle-btn ${videoChartMetric === 'revenue' ? 'active' : ''}`}
                  onClick={() => setVideoChartMetric('revenue')}
                >
                  Est. Revenue ($)
                </button>
              </div>
            </div>

            <div className="chart-wrapper chart-tall">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <XAxis
                    dataKey="uniqueDateKey"
                    stroke="#64748b"
                    fontSize={11}
                    tick={{ fill: '#64748b' }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    tickFormatter={(val) => (val ? val.split('__')[0] : '')}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(v) => (videoChartMetric === 'engagement' ? `${v}%` : `$${formatNumber(v)}`)}
                    width={55}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '13px', maxWidth: '270px' }}>
                          <p style={{ margin: '0 0 6px', fontWeight: 600, lineHeight: 1.4 }}>{d.fullTitle}</p>
                          {videoChartMetric === 'engagement' ? (
                            <>
                              <p style={{ margin: '0 0 4px', color: '#c084fc', fontWeight: 600 }}>Like Rate: {d.engagement}%</p>
                              <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>{formatNumber(d.likes)} likes / {formatNumber(d.views)} views</p>
                            </>
                          ) : (
                            <>
                              <p style={{ margin: '0 0 4px', color: '#34d399', fontWeight: 600 }}>
                                Est. Revenue: ${formatNumber(d.estRevLow)} – ${formatNumber(d.estRevHigh)}
                              </p>
                              <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>
                                Mid Est: ${formatNumber(d.estRevMid)} &bull; {formatNumber(d.views)} views ({d.type})
                              </p>
                            </>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={videoChartMetric === 'engagement' ? 'engagement' : 'estRevMid'}
                    stroke={videoChartMetric === 'engagement' ? '#c084fc' : '#34d399'}
                    strokeWidth={3}
                    dot={{ fill: videoChartMetric === 'engagement' ? '#c084fc' : '#34d399', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: videoChartMetric === 'engagement' ? '#a855f7' : '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Channel Views & Subscriber Growth Tracker */}
          <div className="chart-container chart-full">
            <div className="chart-header-row">
              <div>
                <h3>Channel Daily Growth Tracker</h3>
                <p className="chart-subtitle">Daily snapshots of total views &amp; subscriber growth over time</p>
              </div>
              <div className="metric-toggle-group">
                <button
                  className={`metric-toggle-btn ${historyMetric === 'views' ? 'active' : ''}`}
                  onClick={() => setHistoryMetric('views')}
                >
                  Views
                </button>
                <button
                  className={`metric-toggle-btn ${historyMetric === 'subscribers' ? 'active' : ''}`}
                  onClick={() => setHistoryMetric('subscribers')}
                >
                  Subscribers
                </button>
              </div>
            </div>

            {historyData.length >= 2 ? (
              <div className="chart-wrapper chart-tall">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tick={{ fill: '#64748b' }} />
                    <YAxis stroke="#64748b" fontSize={11} tick={{ fill: '#64748b' }} tickFormatter={formatNumber} width={55} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [formatNumber(v), historyMetric === 'views' ? 'Total Views' : 'Subscribers']} />
                    <Line
                      type="monotone"
                      dataKey={historyMetric === 'views' ? 'viewCount' : 'subscriberCount'}
                      stroke={historyMetric === 'views' ? '#3b82f6' : '#34d399'}
                      strokeWidth={3}
                      dot={{ fill: historyMetric === 'views' ? '#3b82f6' : '#34d399', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: historyMetric === 'views' ? '#2563eb' : '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="history-tracker-notice">
                <span className="notice-icon">⚡</span>
                <div>
                  <strong>Daily Tracking Activated!</strong>
                  <p>
                    Initial snapshot recorded on {historyData[0]?.date || new Date().toISOString().slice(0, 10)} (
                    {formatNumber(historyData[0]?.viewCount || channelData.viewCount)} views &bull; {formatNumber(historyData[0]?.subscriberCount || channelData.subscriberCount)} subscribers).
                    Automatic snapshots run daily at midnight (00:05). Check back tomorrow to see your 24h growth trend line!
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="charts-row-2">
            <div className="chart-container">
              <h3>Content Mix</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.pieData} innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {analytics.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {analytics.pieData.map((entry, index) => (
                    <div key={entry.name} className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: COLORS[index] }}></span>
                      {entry.name} ({entry.value})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="analytics-panel score-panel">
              <h3>Creator Score</h3>
              <div className="score-ring-container">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="circle" strokeDasharray={`${analytics.totalScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <text x="18" y="20.35" className="percentage">{analytics.totalScore}</text>
                </svg>
              </div>
              <p className="score-desc">Based on engagement, upload consistency &amp; view-to-sub ratio.</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Recommendations */}
      <div className="analytics-panel recommendations-panel">
        <h3>Recommendations</h3>
        <div className="recommendations-list">
          {analytics.recommendations.map((rec, i) => (
            <div key={i} className={`rec-card ${rec.type}`}>
              <div className="rec-icon">
                {rec.type === 'success' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
                {rec.type === 'warning' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                )}
                {rec.type === 'info' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#60a5fa">
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                  </svg>
                )}
              </div>
              <div className="rec-text">{rec.text}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
