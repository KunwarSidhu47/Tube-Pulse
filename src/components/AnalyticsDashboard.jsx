import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import './AnalyticsDashboard.css';

// Utility formatters
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
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const COLORS = ['#60a5fa', '#c084fc', '#f472b6', '#fbbf24'];

export default function AnalyticsDashboard({ channelData, latestVideos, latestShorts }) {
  
  const analytics = useMemo(() => {
    const allItems = [...(latestVideos || []), ...(latestShorts || [])];
    if (allItems.length === 0) return null;

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalDurationVideos = 0;
    let videoCountForDuration = 0;

    let titleText = "";
    let descText = "";
    let titlesWithEmoji = 0;
    
    // Sort items by date for timeline and gaps
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

      if (item.type === 'video' && item.durationSeconds) {
        totalDurationVideos += item.durationSeconds;
        videoCountForDuration++;
      }

      titleText += item.title + " ";
      descText += (item.description || "") + " ";

      if (emojiRegex.test(item.title)) {
        titlesWithEmoji++;
      }

      const date = new Date(item.publishedDate);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      
      weekdayCount[weekday] = (weekdayCount[weekday] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;

      if (index > 0) {
        const prevDate = new Date(sortedByDate[index - 1].publishedDate);
        const gapMs = date - prevDate;
        totalGapDays += gapMs / (1000 * 60 * 60 * 24);
        gapCount++;
      }
    });

    const count = allItems.length;
    const avgViews = Math.round(totalViews / count);
    const avgLikes = Math.round(totalLikes / count);
    const avgComments = Math.round(totalComments / count);
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
    
    const avgDuration = videoCountForDuration > 0 ? totalDurationVideos / videoCountForDuration : 0;
    const avgTitleLength = titleText.length / count;
    const avgDescLength = descText.length / count;
    
    const avgGap = gapCount > 0 ? totalGapDays / gapCount : 0;
    const uploadsPerMonth = avgGap > 0 ? 30 / avgGap : 0;
    
    const mostActiveWeekday = Object.keys(weekdayCount).reduce((a, b) => weekdayCount[a] > weekdayCount[b] ? a : b, 'N/A');
    const mostCommonHour = Object.keys(hourCount).reduce((a, b) => hourCount[a] > hourCount[b] ? a : b, 'N/A');
    const formattedHour = mostCommonHour !== 'N/A' 
      ? new Date(2000, 0, 1, parseInt(mostCommonHour, 10)).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
      : 'N/A';

    const emojiPercentage = (titlesWithEmoji / count) * 100;

    // Common words extraction
    const words = titleText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const stopWords = ['the','a','to','and','in','of','is','it','you','i','on','for','with','my','this','that','we','are','was','at','be','do','how','what','can'];
    const wordFreq = {};
    words.forEach(w => {
      if (w.length > 2 && !stopWords.includes(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    const commonWords = Object.keys(wordFreq).sort((a, b) => wordFreq[b] - wordFreq[a]).slice(0, 3).join(', ');

    // Chart Data
    const chartData = sortedByDate.map(item => ({
      title: item.title.substring(0, 15) + '...',
      views: parseInt(item.viewCount || 0, 10),
      likes: parseInt(item.likeCount || 0, 10),
      date: new Date(item.publishedDate).toLocaleDateString()
    }));

    const pieData = [
      { name: 'Videos', value: latestVideos.length },
      { name: 'Shorts', value: latestShorts.length }
    ].filter(d => d.value > 0);

    // Score Calculation
    // Base 100. Engagement (40), Consistency/Gap (30), Views to Subs (30)
    let engScore = Math.min((engagementRate / 8) * 40, 40); // 8% engagement is excellent
    let consistencyScore = Math.min((14 / (Math.max(avgGap, 1))) * 30, 30); // 14 days or less is great
    
    const subCount = parseInt(channelData.subscriberCount || 1, 10);
    const viewSubRatio = avgViews / subCount;
    let viewScore = Math.min((viewSubRatio / 0.2) * 30, 30); // 20% of subs watching is great
    
    let totalScore = Math.round(engScore + consistencyScore + viewScore);
    if (isNaN(totalScore)) totalScore = 50;

    // Recommendations
    const recommendations = [];
    if (engagementRate > 6) recommendations.push({ type: 'success', text: 'High audience engagement rate' });
    else if (engagementRate < 2) recommendations.push({ type: 'warning', text: 'Engagement is below average' });
    else recommendations.push({ type: 'info', text: 'Average audience engagement' });

    if (avgGap > 14) recommendations.push({ type: 'warning', text: 'Upload consistency could be improved' });
    else recommendations.push({ type: 'success', text: 'Excellent upload consistency' });

    if (avgTitleLength > 70) recommendations.push({ type: 'warning', text: 'Titles tend to be long (>70 chars)' });
    
    if (latestShorts.length > latestVideos.length) recommendations.push({ type: 'info', text: 'Strong Shorts performance & focus' });
    else recommendations.push({ type: 'info', text: 'Long-form videos outperform Shorts' });

    return {
      avgViews, avgLikes, avgComments, avgDuration, engagementRate,
      avgGap, uploadsPerMonth, mostActiveWeekday, formattedHour,
      avgTitleLength, avgDescLength, commonWords, emojiPercentage,
      chartData, pieData, totalScore, recommendations
    };

  }, [channelData, latestVideos, latestShorts]);

  if (!analytics) return null;

  return (
    <div className="analytics-dashboard">
      <h2 className="dashboard-title">Analytics Dashboard</h2>
      
      {/* 1. Performance Overview Cards */}
      <div className="analytics-grid performance-grid">
        <div className="analytics-card">
          <div className="card-icon">👁️</div>
          <div className="card-content">
            <span className="card-value">{formatNumber(analytics.avgViews)}</span>
            <span className="card-label">Avg Views / Upload</span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon">❤️</div>
          <div className="card-content">
            <span className="card-value">{formatNumber(analytics.avgLikes)}</span>
            <span className="card-label">Avg Likes / Upload</span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon">💬</div>
          <div className="card-content">
            <span className="card-value">{formatNumber(analytics.avgComments)}</span>
            <span className="card-label">Avg Comments</span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon">🔥</div>
          <div className="card-content">
            <span className="card-value">{analytics.engagementRate.toFixed(2)}%</span>
            <span className="card-label">Engagement Rate</span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon">⏱️</div>
          <div className="card-content">
            <span className="card-value">{formatDuration(analytics.avgDuration)}</span>
            <span className="card-label">Avg Video Duration</span>
          </div>
        </div>
        <div className="analytics-card">
          <div className="card-icon">📊</div>
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
            <li><span>Est. Uploads/Month:</span> <strong>{analytics.uploadsPerMonth.toFixed(1)}</strong></li>
            <li><span>Avg Upload Gap:</span> <strong>{analytics.avgGap.toFixed(1)} days</strong></li>
            <li><span>Most Active Day:</span> <strong>{analytics.mostActiveWeekday}</strong></li>
            <li><span>Most Active Hour:</span> <strong>{analytics.formattedHour}</strong></li>
            <li><span>Videos / Shorts (Sample):</span> <strong>{latestVideos.length} / {latestShorts.length}</strong></li>
          </ul>
        </div>

        {/* 3. Content Analysis */}
        <div className="analytics-panel">
          <h3>Content Analysis</h3>
          <ul className="stats-list">
            <li><span>Avg Title Length:</span> <strong>{Math.round(analytics.avgTitleLength)} chars</strong></li>
            <li><span>Avg Desc Length:</span> <strong>{Math.round(analytics.avgDescLength)} chars</strong></li>
            <li><span>Titles with Emoji:</span> <strong>{analytics.emojiPercentage.toFixed(0)}%</strong></li>
            <li><span>Common Words:</span> <strong>{analytics.commonWords || 'None'}</strong></li>
          </ul>
        </div>
      </div>

      {/* 4. Charts */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Views per Recent Upload</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="title" stroke="#64748b" fontSize={10} tick={{fill: '#64748b'}} />
                <YAxis stroke="#64748b" fontSize={10} tick={{fill: '#64748b'}} tickFormatter={(value) => formatNumber(value)} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff'}} />
                <Bar dataKey="views" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container">
          <h3>Upload Timeline (Views)</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tick={{fill: '#64748b'}} />
                <YAxis stroke="#64748b" fontSize={10} tick={{fill: '#64748b'}} tickFormatter={(value) => formatNumber(value)} />
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff'}} />
                <Line type="monotone" dataKey="views" stroke="#c084fc" strokeWidth={3} dot={{fill: '#c084fc', r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-container">
          <h3>Content Mix</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                  {analytics.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {analytics.pieData.map((entry, index) => (
                <div key={entry.name} className="legend-item">
                  <span className="legend-dot" style={{backgroundColor: COLORS[index]}}></span>
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-split bottom-split">
        {/* 5. Creator Score */}
        <div className="analytics-panel score-panel">
          <h3>Creator Score</h3>
          <div className="score-ring-container">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle"
                strokeDasharray={`${analytics.totalScore}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" className="percentage">{analytics.totalScore}</text>
            </svg>
          </div>
          <p className="score-desc">Based on engagement, upload consistency, and view-to-sub ratio.</p>
        </div>

        {/* 6. Recommendations */}
        <div className="analytics-panel recommendations-panel">
          <h3>Recommendations</h3>
          <div className="recommendations-list">
            {analytics.recommendations.map((rec, i) => (
              <div key={i} className={`rec-card ${rec.type}`}>
                <div className="rec-icon">
                  {rec.type === 'success' && '✅'}
                  {rec.type === 'warning' && '⚠️'}
                  {rec.type === 'info' && '💡'}
                </div>
                <div className="rec-text">{rec.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
