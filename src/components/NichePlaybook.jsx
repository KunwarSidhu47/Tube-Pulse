import { useState, useMemo, useEffect } from 'react';
import './NichePlaybook.css';

export default function NichePlaybook({ channelData, topKeywords, analyticsStats, latestVideos = [], latestShorts = [] }) {
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState(null);
  const [error, setError] = useState(null);

  // Reset blueprint if channel changes
  useEffect(() => {
    setBlueprint(null);
  }, [channelData?.channelId || channelData?.title]);

  const keywordsList = useMemo(() => {
    if (topKeywords) {
      return typeof topKeywords === 'string' ? topKeywords.split(', ') : topKeywords;
    }
    const allItems = [...(latestVideos || []), ...(latestShorts || [])];
    const text = allItems.map(v => v.title || '').join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const stopWords = new Set(['the','a','to','and','in','of','is','it','you','i','on','for','with','my','this','that','we','are','was','at','be','do','how','what','can','its','but','not','from','by','or','your','our','an','as','so','up','out','if','he','she','they','their']);
    const wordFreq = {};
    text.split(/\s+/).forEach(w => {
      if (w.length > 2 && !stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
    return Object.keys(wordFreq).sort((a, b) => wordFreq[b] - wordFreq[a]).slice(0, 5);
  }, [topKeywords, latestVideos, latestShorts]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/generate-blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelData: { 
            title: channelData?.title || 'Target Channel',
            description: channelData?.description || ''
          },
          videos: (latestVideos || []).map(v => v.title),
          shorts: (latestShorts || []).map(s => s.title),
          keywords: keywordsList,
          stats: analyticsStats || {}
        })
      });
      if (!res.ok) throw new Error('Failed to generate blueprint');
      const data = await res.json();
      setBlueprint(data);
    } catch (err) {
      console.error('[NichePlaybook] Blueprint error:', err);
      setError('Unable to generate AI blueprint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial Collapsed State: Question Banner with Toggle Switch
  if (!isCreatorMode) {
    return (
      <div className="niche-playbook-container collapsed">
        <div className="creator-ask-card">
          <div className="ask-content">
            <span className="ask-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#c084fc" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              CREATOR INSIGHTS
            </span>
            <h3>Do you want to be a Creator in the {channelData?.title || 'this'} niche?</h3>
            <p>
              Toggle Creator Mode ON to unlock viral 0 to 3s hook strategies, title formulas, and instant AI generated video concepts for this channel's niche.
            </p>
          </div>
          <div className="toggle-switch-container">
            <span className="toggle-switch-label">Creator Mode</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={isCreatorMode}
                onChange={(e) => setIsCreatorMode(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Expanded State: Full Niche Playbook & AI Blueprint Generator
  return (
    <div className="niche-playbook-container expanded">
      <div className="playbook-header-row">
        <div className="playbook-header">
          <div className="playbook-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            AI CREATOR PLAYBOOK
          </div>
          <h2>Creator Growth Guide &amp; Niche Blueprint</h2>
          <p className="playbook-intro">
            Proven viral growth strategies, title formulas, and AI-generated content concepts tailored for the <strong>{channelData?.title || 'target'}</strong> niche.
          </p>
        </div>
        <div className="toggle-switch-container">
          <span className="toggle-switch-label">Creator Mode</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={isCreatorMode}
              onChange={(e) => setIsCreatorMode(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {/* Core Niche Growth Pillars */}
      <div className="playbook-grid">
        <div className="playbook-card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <h3>0 to 3 Sec Hook &amp; Swipe Ratio</h3>
          <p>
            The first 2 to 3 seconds determine retention. Aim for a <strong>&gt;70% View vs Swipe ratio</strong> on Shorts. Open immediately with a high-energy visual question or outcome, never a slow channel logo.
          </p>
        </div>

        <div className="playbook-card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
          <h3>CTR Titles &amp; Descriptions</h3>
          <p>
            Use the <strong>Curiosity Gap</strong> formula: Combine a high-search keyword with an emotional trigger (for example <em>The Untold Truth About...</em>). Keep titles under 10 words so they are not cut off on mobile devices.
          </p>
        </div>

        <div className="playbook-card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </div>
          <h3>Hashtags &amp; Search Indexing</h3>
          <p>
            Include <strong>3 to 5 specific niche hashtags</strong> in the description and Shorts caption. Place primary keywords naturally in the first 2 lines of the description for YouTube SEO indexing.
          </p>
        </div>

        <div className="playbook-card">
          <div className="card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
              <line x1="7" y1="2" x2="7" y2="22"></line>
              <line x1="17" y1="2" x2="17" y2="22"></line>
              <line x1="2" y1="12" x2="22" y2="12"></line>
            </svg>
          </div>
          <h3>Pacing &amp; Pattern Interrupts</h3>
          <p>
            Maintain audience focus by adding <strong>pattern interrupts</strong> (on-screen text, sound effects, B-roll clips, or zoom changes) every 4 to 6 seconds to boost total watch time.
          </p>
        </div>
      </div>

      {/* AI Blueprint Action Box */}
      <div className="ai-generator-box">
        <div className="generator-header">
          <div>
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#c084fc" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              AI Content Concept Generator
            </h3>
            <p>Here are 5 tailored viral video ideas, 3-second hook scripts &amp; niche hashtags for a <strong>{channelData?.title ? `${channelData.title} style` : 'this'} niche</strong>.</p>
          </div>
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Analyzing Niche & Generating...' : 'Generate AI Content Blueprint'}
          </button>
        </div>

        {error && <div className="generator-error">{error}</div>}

        {/* Loading Indicator */}
        {loading && !blueprint && (
          <div className="generator-loading-state" style={{
            padding: '1.5rem',
            textAlign: 'center',
            color: '#a855f7',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}>
            Analyzing channel title, description, recent videos &amp; Shorts to detect exact niche...
          </div>
        )}

        {/* Generated Blueprint Output */}
        {blueprint && (
          <div className="blueprint-results">
            <div className="blueprint-meta-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="niche-tag">
                Niche: {blueprint.primaryNiche || blueprint.nicheName}
                {blueprint.subNiches && blueprint.subNiches.length > 0 ? ` (${blueprint.subNiches.join(', ')})` : ''}
              </span>
              <button
                className="collapse-blueprint-btn"
                onClick={() => setBlueprint(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>✕</span> Collapse Blueprint
              </button>
            </div>

            {blueprint.audience && (
              <div className="audience-box" style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '0.7rem 1rem',
                fontSize: '0.85rem',
                color: '#cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div>
                  <strong style={{ color: '#c084fc' }}>Target Audience:</strong> {blueprint.audience}
                </div>
                {blueprint.contentStyle && blueprint.contentStyle.length > 0 && (
                  <div>
                    <strong style={{ color: '#60a5fa' }}>Content Style:</strong> {blueprint.contentStyle.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Video Concepts */}
            <div className="concepts-list">
              <h4>Recommended Video Concepts &amp; 3s Hooks</h4>
              <div className="concepts-grid">
                {blueprint.concepts?.map((c, i) => (
                  <div key={i} className="concept-card">
                    <div className="concept-format">{c.format}</div>
                    <h5 className="concept-title">"{c.title}"</h5>
                    <div className="concept-hook">
                      <span className="hook-label">0 to 3s Hook:</span> {c.hook}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hashtags & Strategy Tips */}
            <div className="blueprint-footer-row">
              <div className="hashtags-box">
                <h4>High-CTR Niche Hashtags</h4>
                <div className="hashtags-list">
                  {blueprint.hashtags?.map((tag, i) => (
                    <span key={i} className="hashtag-pill">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="tips-box">
                <h4>Viral Niche Rules</h4>
                <ul>
                  {blueprint.viralTips?.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
