import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TitleScoreAnalyzer({ channelData }) {
  const [draftTitle, setDraftTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const sampleTitles = [
    'I played minecraft for 24 hours',
    'How to make money online with AI',
    'My honest review of this new smartphone'
  ];

  const handleEvaluate = async (titleToTest) => {
    const targetTitle = titleToTest || draftTitle;
    if (!targetTitle || !targetTitle.trim()) {
      setError('Please enter a video title to evaluate.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/evaluate-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftTitle: targetTitle.trim(),
          channelData: {
            title: channelData?.title || 'YouTube Channel',
            description: channelData?.description || ''
          }
        })
      });

      if (!res.ok) throw new Error('Failed to evaluate title score');
      const data = await res.json();
      setEvaluation(data);
    } catch (err) {
      console.error('[TitleScoreAnalyzer] Error:', err);
      setError('Unable to evaluate title score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Build Recharts comparison dataset
  const chartData = evaluation ? [
    {
      metric: 'CTR Hook',
      'Your Draft Title': evaluation.originalMetrics?.ctrScore || 0,
      'AI Recommended Title': evaluation.recommendedTitles?.[0]?.metrics?.ctrScore || 0,
    },
    {
      metric: 'Curiosity Gap',
      'Your Draft Title': evaluation.originalMetrics?.curiosityScore || 0,
      'AI Recommended Title': evaluation.recommendedTitles?.[0]?.metrics?.curiosityScore || 0,
    },
    {
      metric: 'Mobile Clarity',
      'Your Draft Title': evaluation.originalMetrics?.clarityScore || 0,
      'AI Recommended Title': evaluation.recommendedTitles?.[0]?.metrics?.clarityScore || 0,
    },
    {
      metric: 'Sentiment Power',
      'Your Draft Title': evaluation.originalMetrics?.sentimentScore || 0,
      'AI Recommended Title': evaluation.recommendedTitles?.[0]?.metrics?.sentimentScore || 0,
    },
    {
      metric: 'Overall Score',
      'Your Draft Title': evaluation.originalMetrics?.overallScore || 0,
      'AI Recommended Title': evaluation.recommendedTitles?.[0]?.metrics?.overallScore || 0,
    }
  ] : [];

  return (
    <div className="title-score-analyzer" style={{
      marginTop: '2rem',
      background: 'rgba(15, 23, 42, 0.65)',
      border: '1px solid rgba(192, 132, 252, 0.25)',
      borderRadius: '16px',
      padding: '1.75rem',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <span style={{
          background: 'linear-gradient(135deg, #c084fc, #a855f7)',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.5px'
        }}>
          AI WORKFLOW TOOL
        </span>
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>
          AI Video Title Judge &amp; Metric Comparator
        </h3>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        Type a draft video title to get instant AI viral scoring (0-100) and compare your title metrics against AI-optimized title alternatives.
      </p>

      {/* Input Box & Action */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleEvaluate()}
          placeholder="e.g. I spent 24 hours in a room with 100 people"
          style={{
            flex: '1',
            minWidth: '280px',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            color: '#f8fafc',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'border 0.2s ease'
          }}
        />
        <button
          onClick={() => handleEvaluate()}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            border: 'none',
            borderRadius: '10px',
            padding: '0.75rem 1.5rem',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? 'Evaluating Title...' : 'Judge & Compare Title'}
        </button>
      </div>

      {/* Sample presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Try sample:</span>
        {sampleTitles.map((t, idx) => (
          <button
            key={idx}
            onClick={() => {
              setDraftTitle(t);
              handleEvaluate(t);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '0.78rem',
              color: '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            "{t}"
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Evaluation Results Output */}
      {evaluation && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
          
          {/* Top Score Comparison Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Draft Score</span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: evaluation.originalMetrics?.overallScore >= 75 ? '#4ade80' : '#facc15', marginTop: '0.2rem' }}>
                {evaluation.originalMetrics?.overallScore || 0}<span style={{ fontSize: '1rem', color: '#64748b' }}>/100</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>"{evaluation.draftTitle}"</span>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Recommended Score</span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
                {evaluation.recommendedTitles?.[0]?.metrics?.overallScore || 0}<span style={{ fontSize: '1rem', color: '#64748b' }}>/100</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                +{ (evaluation.recommendedTitles?.[0]?.metrics?.overallScore || 0) - (evaluation.originalMetrics?.overallScore || 0) } Points Lift
              </span>
            </div>
          </div>

          {/* Recharts Comparison Chart */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#f1f5f9', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📊 Metric Comparison: Your Title vs. AI Recommended Title
            </h4>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="Your Draft Title" fill="#facc15" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="AI Recommended Title" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Actionable Feedback */}
          {evaluation.feedback && evaluation.feedback.length > 0 && (
            <div style={{
              background: 'rgba(51, 65, 85, 0.4)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.5rem',
              borderLeft: '4px solid #a855f7'
            }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0', fontSize: '0.9rem' }}>💡 AI Diagnostic Feedback:</h5>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                {evaluation.feedback.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '0.3rem' }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Recommended Titles List */}
          <div>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#f1f5f9', fontSize: '1rem' }}>
              🚀 High-CTR AI Recommended Title Alternatives:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {evaluation.recommendedTitles?.map((item, idx) => (
                <div key={idx} style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ flex: '1', minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                        {item.title}
                      </span>
                      <span style={{
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        Score: {item.metrics?.overallScore}
                      </span>
                    </div>
                    {item.whyBetter && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                        {item.whyBetter}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.title, idx)}
                    style={{
                      background: copiedIndex === idx ? '#22c55e' : 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {copiedIndex === idx ? '✓ Copied!' : 'Copy Title'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
