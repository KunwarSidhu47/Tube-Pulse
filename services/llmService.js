/**
 * AI Niche Blueprint Service
 * 
 * Pipeline:
 * 1. detectChannelNiche: Takes channel metadata (title, description, video/shorts titles)
 *    and asks AI / LLM: "What is the primary content niche of this YouTube channel?"
 *    Returns structured JSON: { primaryNiche, subNiches, confidence }
 * 
 * 2. generateNicheBlueprint: Passes the detected niche as context into the concept generator
 *    to produce 5 original video ideas, 3s hooks, niche hashtags, and viral rules.
 */

/**
 * Step 1: Detect the primary content niche of a YouTube channel using AI/LLM
 */
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];

async function callChatGPTAPI(prompt, openaiKey) {
  if (!openaiKey) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } else {
      const errText = await res.text();
      console.warn(`[LLM Service] ChatGPT API error ${res.status}:`, errText);
    }
  } catch (err) {
    console.warn('[LLM Service] ChatGPT API fetch failed:', err.message);
  }
  return null;
}

async function callGeminiAPI(prompt, geminiKey) {
  if (!geminiKey) return null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errText = await res.text();
        console.warn(`[LLM Service] Gemini model ${model} error ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn(`[LLM Service] Gemini model ${model} fetch failed:`, err.message);
    }
  }
  return null;
}

async function callLLM(prompt) {
  const openaiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''
    ? process.env.OPENAI_API_KEY.trim()
    : null;

  if (openaiKey) {
    console.log('[LLM Service] Calling ChatGPT (OpenAI API)...');
    const text = await callChatGPTAPI(prompt, openaiKey);
    if (text) return text;
  }

  const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''
    ? process.env.GEMINI_API_KEY.trim()
    : null;

  if (geminiKey) {
    console.log('[LLM Service] Calling Gemini API...');
    const text = await callGeminiAPI(prompt, geminiKey);
    if (text) return text;
  }

  return null;
}

function extractJSON(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      console.warn('[LLM Service] JSON parse error:', e.message);
    }
  }
  return null;
}

export const detectChannelNiche = async (channelData, videos = [], shorts = [], keywords = []) => {
  const channelTitle = channelData?.title || 'Content Creator';
  const channelDescription = channelData?.description || '';

  const videoTitles = (videos || []).map(v => (typeof v === 'string' ? v : v?.title)).filter(Boolean);
  const shortsTitles = (shorts || []).map(s => (typeof s === 'string' ? s : s?.title)).filter(Boolean);

  const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''
    ? process.env.GEMINI_API_KEY.trim()
    : null;

  if (geminiKey) {
    try {
      const prompt = `You are a YouTube channel classifier. Analyze this channel metadata and determine its exact content niche. Do NOT use broad YouTube category IDs.

CHANNEL INFORMATION:
- Channel Title: "${channelTitle}"
- Description: "${channelDescription}"
- Recent Video Titles: ${JSON.stringify(videoTitles.slice(0, 10))}
- Recent Shorts Titles: ${JSON.stringify(shortsTitles.slice(0, 10))}

TASK:
Determine: "What is the primary content niche of this YouTube channel?"

Return ONLY valid JSON (no markdown block formatting) matching this exact schema:
{
  "primaryNiche": "Broad Category (e.g., Entertainment, Gaming, Technology, Fitness, Education, Film & Animation, Sports, Lifestyle)",
  "subNiches": ["Sub-niche 1", "Sub-niche 2", "Sub-niche 3", "Sub-niche 4"],
  "confidence": 0.95
}`;

      const textResponse = await callGeminiAPI(prompt, geminiKey);
      if (textResponse) {
        const parsed = extractJSON(textResponse);
        if (parsed && parsed.primaryNiche && Array.isArray(parsed.subNiches)) {
          return {
            source: 'gemini-llm',
            primaryNiche: parsed.primaryNiche,
            subNiches: parsed.subNiches,
            confidence: parsed.confidence || 0.95
          };
        }
      }
    } catch (err) {
      console.warn('[LLM Service] Niche detection LLM call fallback triggered:', err.message);
    }
  }

  // --- Robust Semantic Fallback Engine (Strict Word Boundaries) ---
  const fullText = `${channelTitle} ${channelDescription} ${videoTitles.join(' ')} ${shortsTitles.join(' ')}`.toLowerCase();

  // Test for specific domain niches using exact word boundaries (\b)
  if (/\b(challenge|challenges|stunt|stunts|beast|giveaway|giveaways|survive|survived|philanthropy|viral|millionaire|billionaire|island|abandoned|contest)\b/i.test(fullText)) {
    return {
      source: 'semantic-classifier',
      primaryNiche: 'Entertainment',
      subNiches: ['Challenges', 'Competitions', 'Viral Content', 'Philanthropy'],
      confidence: 0.95
    };
  }

  if (/\b(gameplay|gamer|gaming|minecraft|roblox|fortnite|gta|playstation|xbox|nintendo|esports|steam|walkthrough)\b/i.test(fullText)) {
    return {
      source: 'semantic-classifier',
      primaryNiche: 'Gaming',
      subNiches: ['Gameplay', 'Gaming Commentary', 'Live Streaming', 'Game Reviews'],
      confidence: 0.92
    };
  }

  if (/\b(tech|technology|smartphone|smartphones|iphone|android|gadget|gadgets|unboxing|pc build|laptop|macbook)\b/i.test(fullText)) {
    return {
      source: 'semantic-classifier',
      primaryNiche: 'Technology',
      subNiches: ['Gadget Reviews', 'Smartphones', 'Tech Unboxing', 'Consumer Tech'],
      confidence: 0.92
    };
  }

  if (/\b(movie|movies|film|films|cinema|spiderman|marvel|ironman|avengers|anime|naruto|superhero|actor|hollywood)\b/i.test(fullText)) {
    return {
      source: 'semantic-classifier',
      primaryNiche: 'Film & Entertainment',
      subNiches: ['Movie Analysis', 'Character Breakdown', 'Cinema Edits', 'Pop Culture'],
      confidence: 0.90
    };
  }

  if (/\b(wwe|wrestling|wrestler|smackdown|raw|ufc|mma|boxing|football|basketball|soccer|match|highlights)\b/i.test(fullText)) {
    return {
      source: 'semantic-classifier',
      primaryNiche: 'Sports & Combat Sports',
      subNiches: ['Sports Highlights', 'Rivalries', 'Athletes', 'Match Analysis'],
      confidence: 0.90
    };
  }

  if (/\b(fitness|workout|gym|exercise|bodybuilding|health|nutrition|calisthenics)\b/i.test(fullText)) {
    return {
      source: 'semantic-classifier',
      primaryNiche: 'Fitness & Health',
      subNiches: ['Workouts', 'Gym Guides', 'Nutrition', 'Transformation'],
      confidence: 0.90
    };
  }

  // General default fallback for unclassified channels
  const words = fullText.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !['video', 'channel', 'youtube', 'official', 'watch', 'this', 'with', 'from', 'they'].includes(w));
  const uniqueWords = [...new Set(words)].slice(0, 3).map(capitalize);

  return {
    source: 'semantic-classifier',
    primaryNiche: 'Entertainment & Media',
    subNiches: uniqueWords.length > 0 ? uniqueWords : ['Content Creation', 'Trending Topics', 'Social Media'],
    confidence: 0.85
  };
};

/**
 * Step 2: Generate Content Blueprint based on the detected niche
 */
export const generateNicheBlueprint = async (channelData, videos = [], shorts = [], keywords = [], stats = {}) => {
  // Step 1: Detect the channel's actual niche
  const detectedNiche = await detectChannelNiche(channelData, videos, shorts, keywords);

  const channelTitle = channelData?.title || 'Content Creator';
  const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''
    ? process.env.GEMINI_API_KEY.trim()
    : null;

  if (geminiKey) {
    try {
      const prompt = `You are a YouTube viral growth expert. 
A user wants to start a NEW YouTube channel in the following detected niche:

DETECTED NICHE:
- Primary Niche: "${detectedNiche.primaryNiche}"
- Sub-niches: ${detectedNiche.subNiches.join(', ')}
- Reference Channel: "${channelTitle}"

Generate ORIGINAL high-CTR video concepts, 3-second hooks, niche hashtags, and viral growth rules for someone starting a channel in this detected niche. Do NOT copy the reference channel's exact videos; generate original concepts for this audience.

Return ONLY valid JSON (no markdown formatting) using this exact schema:
{
  "primaryNiche": "${detectedNiche.primaryNiche}",
  "subNiches": ${JSON.stringify(detectedNiche.subNiches)},
  "confidence": ${detectedNiche.confidence},
  "audience": "Description of target audience for this niche",
  "contentStyle": ["Style 1", "Style 2"],
  "nicheName": "${detectedNiche.primaryNiche} (${detectedNiche.subNiches.join(', ')})",
  "concepts": [
    {
      "title": "High-CTR Original Concept Title for this Niche",
      "hook": "0 to 3s visual & spoken hook script",
      "format": "Shorts (<60s) or Long-form (8 to 12 min)"
    }
  ],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
  "viralTips": ["Rule 1", "Rule 2", "Rule 3", "Rule 4"]
}`;

      const textResponse = await callGeminiAPI(prompt, geminiKey);
      if (textResponse) {
        const parsed = extractJSON(textResponse);
        if (parsed) {
          if (Array.isArray(parsed.hashtags)) {
            parsed.hashtags = parsed.hashtags
              .map(t => (t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`))
              .filter(t => t.length > 2)
              .slice(0, 10);
          }

          return { source: 'gemini-llm', ...parsed };
        }
      }
    } catch (err) {
      console.warn('[LLM Service] Concept generator LLM call fallback triggered:', err.message);
    }
  }

  // --- Concept Blueprint Generator based on Detected Niche ---
  const { primaryNiche, subNiches, confidence } = detectedNiche;
  const nicheName = `${primaryNiche} (${subNiches.join(', ')})`;

  let concepts = [];
  let hashtags = [];
  let viralTips = [];
  let audience = '';
  let contentStyle = [];

  if (primaryNiche === 'Entertainment' || subNiches.includes('Challenges')) {
    audience = 'Gen-Z and mainstream audience looking for high-stakes challenges, competitions, and viral entertainment.';
    contentStyle = ['Fast-Paced', 'High Stakes', 'Spectacle'];
    concepts = [
      {
        title: 'I Survived 24 Hours in a Custom Underground Bunker',
        hook: 'Water started leaking through the ceiling at 3 AM...',
        format: 'Shorts (<60s)'
      },
      {
        title: '100 Strangers Compete for a Brand New Car',
        hook: 'The last person to remove their hand from this luxury car wins it.',
        format: 'Shorts (<60s)'
      },
      {
        title: 'Giving $10,000 to Random People Who Help a Stranger',
        hook: 'We tested 50 people to see who would stop and help a person in need.',
        format: 'Long-form (8 to 12 min)'
      },
      {
        title: 'I Spent 48 Hours in the World\'s Most Isolated House',
        hook: 'No electricity, no wifi, and no cell service for 50 miles.',
        format: 'Shorts (<60s)'
      },
      {
        title: 'Extreme Hide and Seek in a 100,000 Sq Ft Warehouse',
        hook: 'If the seeker finds me in under 10 minutes, he takes home $5,000.',
        format: 'Long-form (10 to 15 min)'
      }
    ];
    hashtags = ['#entertainment', '#challenges', '#competition', '#viral', '#stunts', '#giveaway', '#shorts', '#fyp', '#trending', '#youtube'];
    viralTips = [
      'Hook Rule: Open within 1.5 seconds with an extreme visual stake or high-value prize declaration.',
      'Retention Pacing: Keep cuts under 3 seconds and maintain high energy visual progression.',
      'Click-Through Rate: Use high-contrast thumbnail images with clear emotional expressions.',
      'Community Framing: Highlight real participant emotions and genuine reactions to build audience loyalty.'
    ];
  } else if (primaryNiche === 'Gaming') {
    audience = 'Gamers and esports fans looking for gameplay highlights, commentary, and pro strategies.';
    contentStyle = ['Engaging Commentary', 'High Skill Gameplay', 'Humorous Edits'];
    concepts = [
      {
        title: `I Attempted the Impossible Challenge in ${subNiches[0] || 'Gaming'}`,
        hook: 'Only 0.01% of players have ever completed this without dying.',
        format: 'Shorts (<60s)'
      },
      {
        title: 'Top 5 Secret Tricks 99% of Players Don\'t Know',
        hook: 'Number 1 will completely change how you play this game.',
        format: 'Shorts (<60s)'
      },
      {
        title: 'I Played Against World Champions and This Happened',
        hook: 'I thought I was good until I matched with the rank #1 player...',
        format: 'Long-form (8 to 12 min)'
      },
      {
        title: 'From Noob to Pro: 100 Hours Challenge Breakdown',
        hook: 'Here is what happened after grinding for 100 straight hours.',
        format: 'Long-form (10 to 15 min)'
      },
      {
        title: '3 Game Mechanics That Feel Like Cheating',
        hook: 'If you use this setting, you win 90% of your matches instantly.',
        format: 'Shorts (<60s)'
      }
    ];
    hashtags = ['#gaming', '#gameplay', '#gamer', '#shorts', '#viral', '#trending', '#fyp', '#esports', '#youtube', '#content'];
    viralTips = [
      'Hook Rule: Open with the funniest or highest intensity gaming moment in the first 2 seconds.',
      'Audio Balance: Ensure game sound effects never drown out your commentary voice.',
      'On-Screen Text: Add bold animated subtitles for key punchlines and epic plays.',
      'CTR Title Strategy: Frame titles around curiosity gaps rather than match numbers.'
    ];
  } else if (primaryNiche === 'Technology') {
    audience = 'Tech enthusiasts, consumers, and buyers looking for gadget reviews and buying advice.';
    contentStyle = ['Clean Aesthetics', 'In-Depth Analysis', 'High Quality B-Roll'];
    concepts = [
      {
        title: 'The Truth About This New Tech Device After 30 Days',
        hook: 'Everyone praised this device, but here is the major flaw nobody mentioned.',
        format: 'Long-form (8 to 12 min)'
      },
      {
        title: 'Top 5 Tech Gadgets Under $50 You Actually Need',
        hook: 'Number 3 is something I use on my desk every single day.',
        format: 'Shorts (<60s)'
      },
      {
        title: 'Why Everyone is Buying This Smartphone',
        hook: 'This feature alone makes it better than flagship phones twice the price.',
        format: 'Shorts (<60s)'
      },
      {
        title: 'I Built the Ultimate Productivity Setup',
        hook: 'Here is how I organized my workspace to double my daily output.',
        format: 'Long-form (10 to 15 min)'
      },
      {
        title: '3 Hidden Settings You Should Turn On Immediately',
        hook: 'Turn off this default setting right now to save 30% battery life.',
        format: 'Shorts (<60s)'
      }
    ];
    hashtags = ['#tech', '#gadgets', '#smartphones', '#technology', '#review', '#unboxing', '#shorts', '#fyp', '#trending', '#youtube'];
    viralTips = [
      'Hook Rule: Open directly with the physical device product shot and the main thesis statement.',
      'Visual B-Roll: Use crisp macro shots and smooth camera pans during audio explanations.',
      'Thumbnail CTR: Display the gadget prominently alongside high contrast typography.',
      'SEO Indexing: Place target model names in the title and description naturally.'
    ];
  } else {
    audience = `Viewers interested in ${primaryNiche.toLowerCase()} and high quality content.`;
    contentStyle = ['Fast-Paced', 'High Retention', 'Storytelling'];
    concepts = [
      {
        title: `The Unknown Story of ${subNiches[0] || primaryNiche} That Viewers Missed`,
        hook: 'Did you spot this subtle detail? Look closely at frame 2.',
        format: 'Shorts (<60s)'
      },
      {
        title: `Top 5 Iconic Moments in ${subNiches[0] || primaryNiche} History`,
        hook: 'Number 1 gave millions of fans chills. Here are the top 5 moments.',
        format: 'Shorts (<60s)'
      },
      {
        title: `Why ${subNiches[0] || primaryNiche} is Taking Over the Internet`,
        hook: 'This 1 event changed everything in the community. Watch this.',
        format: 'Long-form (8 to 12 min)'
      },
      {
        title: `3 Mind-Blowing Secrets Behind ${subNiches[0] || primaryNiche}`,
        hook: 'You won\'t believe how this was created. Here are 3 unknown facts.',
        format: 'Long-form (10 to 15 min)'
      },
      {
        title: `The Ultimate ${subNiches[0] || primaryNiche} Guide for 2026`,
        hook: 'Here is everything you need to know in under 60 seconds.',
        format: 'Shorts (<60s)'
      }
    ];
    hashtags = [
      `#${primaryNiche.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      ...subNiches.map(s => `#${s.toLowerCase().replace(/[^a-z0-9]/g, '')}`),
      '#shorts', '#viral', '#trending', '#fyp', '#youtube', '#content'
    ].slice(0, 10);
    viralTips = [
      'Hook Rule: The first 2 to 3 seconds dictate retention. Open with an energetic visual question.',
      'Swipe Ratio Target: Aim for >70% View vs Swipe ratio on Shorts by adding bold text on screen.',
      'Pacing: Add pattern interrupts (B-roll, sound effects, text pop-ups) every 4 to 6 seconds.',
      'CTR Optimization: Combine a 3 word title hook with a high contrast thumbnail image.'
    ];
  }

  return {
    source: 'ai-engine',
    primaryNiche,
    subNiches,
    audience,
    contentStyle,
    confidence,
    nicheName,
    concepts,
    hashtags,
    viralTips
  };
};

/**
 * Clean & sanitize channel descriptions to strip redundant intro prefixes like
 * "The main focus of this YouTube channel is to", "Welcome to the channel of", etc.
 */
function cleanDescriptionPrefix(desc) {
  if (!desc || typeof desc !== 'string') return '';
  let cleaned = desc.trim();

  // Strip links, emails, social handles
  cleaned = cleaned.replace(/(https?:\/\/\S+|www\.\S+|@\w+|subscribe|instagram|twitter|tiktok|facebook|discord|business inquir\S*|contact\S*)/gi, '').trim();

  // Remove newline noise
  cleaned = cleaned.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';

  // Strip leading "Intro:" or "About:" prefix
  cleaned = cleaned.replace(/^(intro|about|bio|description)\s*:\s*/i, '');

  // Remove redundant meta prefixes
  cleaned = cleaned.replace(/^(the\s+)?(main\s+)?(focus|goal|purpose)\s+of\s+this\s+(youtube\s+)?channel\s+is\s+(to\s+)?/i, '');
  cleaned = cleaned.replace(/^(this\s+)?(youtube\s+)?channel\s+is\s+(all\s+)?(about|dedicated\s+to|focused\s+on)\s+/i, '');
  cleaned = cleaned.replace(/^welcome\s+to\s+(the\s+official\s+channel\s+of\s+)?/i, '');
  cleaned = cleaned.replace(/^in\s+this\s+channel\s+(we|i)\s+/i, '');
  cleaned = cleaned.replace(/^my\s+name\s+is\s+[^,.]+[,. ]\s*/i, '');
  cleaned = cleaned.replace(/^i\s+(make|create|produce|upload)\s+/i, 'creating ');

  cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  return cleaned;
}

/**
 * Helper to split raw text into sentences and extract the first N sentences.
 */
function extractFirstSentences(text, maxSentences = 5) {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text.trim();

  // Match sentences ending in '.', '!', or '?'
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    return sentences.slice(0, maxSentences).join(' ').trim();
  }

  // Fallback to line splits or returning full text
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    return lines.slice(0, maxSentences).join(' ').trim();
  }

  return cleaned;
}

/**
 * Generate AI channel summary using channel title and optional metadata, returning natural text.
 */
export const generateChannelSummary = async (channelData, videos = [], shorts = []) => {
  const channelTitle = typeof channelData === 'string'
    ? channelData
    : (channelData?.title || 'Content Creator');

  const channelDescription = typeof channelData === 'object' ? (channelData?.description || '') : '';
  const videoTitles = (videos || []).map(v => (typeof v === 'string' ? v : v?.title)).filter(Boolean);

  try {
    let prompt = `What is "${channelTitle.trim()}" on YouTube? Explain what this channel is about, its main niche, and the type of content it creates. Give a concise, natural explanation based on your knowledge of this channel.`;

    if (channelDescription || videoTitles.length > 0) {
      prompt = `Analyze this YouTube channel and explain what it is about, its main niche, and the type of content it creates in a concise, natural explanation (4-5 sentences).

CHANNEL INFORMATION:
- Channel Title: "${channelTitle.trim()}"
${channelDescription ? `- Description: "${channelDescription.slice(0, 300)}"` : ''}
${videoTitles.length > 0 ? `- Sample Recent Titles: ${JSON.stringify(videoTitles.slice(0, 5))}` : ''}`;
    }

    console.log('CHANNEL SENT TO LLM:');
    console.log(channelTitle.trim());

    const textResponse = await callLLM(prompt);
    if (textResponse && textResponse.trim()) {
      console.log('RAW LLM RESPONSE:');
      console.log(textResponse);

      const finalResponse = extractFirstSentences(textResponse, 5);
      console.log('FINAL RESPONSE SENT TO FRONTEND:');
      console.log(finalResponse);
      return finalResponse;
    }
  } catch (err) {
    console.warn('[LLM Service] Channel summary LLM call failed:', err.message);
  }

  // Simple, generic failure message — NO fake AI templates
  const fallbackMsg = 'Channel summary could not be generated.';
  console.log('FINAL RESPONSE SENT TO FRONTEND:');
  console.log(fallbackMsg);
  return fallbackMsg;
};

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Evaluates a draft video title against key viral metrics and generates
 * 3 optimized title recommendations with metric score comparison data.
 */
export const evaluateTitleScore = async (draftTitle, channelContext = {}) => {
  const title = (draftTitle || '').trim();
  if (!title) {
    return {
      error: 'Please enter a valid video title.'
    };
  }

  const channelTitle = channelContext?.title || 'YouTube Channel';
  const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''
    ? process.env.GEMINI_API_KEY.trim()
    : null;

  if (geminiKey) {
    try {
      const prompt = `You are a YouTube Click-Through-Rate (CTR) & Title Optimization Specialist.
Analyze the following draft YouTube video title for a video in the "${channelTitle}" niche.

DRAFT TITLE TO EVALUATE: "${title}"

TASK:
1. Rate the draft title (0 to 100) across 4 viral metrics:
   - ctrScore: Estimated clickability & hook strength
   - curiosityScore: Strength of the curiosity gap / intrigue
   - clarityScore: Mobile readability & length optimization (6-10 words ideal)
   - sentimentScore: Emotional power words & trigger strength
   - overallScore: Weighted average overall score
2. Generate 3 AI-Optimized Title Variations for this video with improved scores.
3. Provide 2-3 quick bullet points of actionable feedback.

Return ONLY valid JSON (no markdown formatting) using this exact schema:
{
  "draftTitle": "${title.replace(/"/g, '\\"')}",
  "originalMetrics": {
    "ctrScore": 65,
    "curiosityScore": 55,
    "clarityScore": 80,
    "sentimentScore": 60,
    "overallScore": 65
  },
  "recommendedTitles": [
    {
      "title": "Optimized Title Variation 1",
      "metrics": {
        "ctrScore": 90,
        "curiosityScore": 92,
        "clarityScore": 85,
        "sentimentScore": 88,
        "overallScore": 89
      },
      "whyBetter": "Explains why this title performs better"
    },
    {
      "title": "Optimized Title Variation 2",
      "metrics": {
        "ctrScore": 88,
        "curiosityScore": 89,
        "clarityScore": 90,
        "sentimentScore": 85,
        "overallScore": 88
      },
      "whyBetter": "Explains why this title performs better"
    },
    {
      "title": "Optimized Title Variation 3",
      "metrics": {
        "ctrScore": 85,
        "curiosityScore": 87,
        "clarityScore": 92,
        "sentimentScore": 84,
        "overallScore": 87
      },
      "whyBetter": "Explains why this title performs better"
    }
  ],
  "feedback": [
    "Feedback point 1",
    "Feedback point 2"
  ]
}`;

      const textResponse = await callGeminiAPI(prompt, geminiKey);
      if (textResponse) {
        const parsed = extractJSON(textResponse);
        if (parsed && parsed.originalMetrics && Array.isArray(parsed.recommendedTitles)) {
          return { source: 'gemini-llm', ...parsed };
        }
      }
    } catch (err) {
      console.warn('[LLM Service] Title evaluator LLM call fallback triggered:', err.message);
    }
  }

  // --- Rule-Based NLP Fallback Engine for Title Evaluation ---
  const words = title.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Metric Calculation Logic
  let ctrScore = 60;
  let curiosityScore = 50;
  let clarityScore = 75;
  let sentimentScore = 55;

  // Power Words & Emotional Triggers
  const powerWordRegex = /\b(survived|secret|truth|hours|free|ultimate|never|worst|best|million|billion|stop|tested|vs|impossible|why|hidden|banned|extreme|every|day|days)\b/i;
  if (powerWordRegex.test(title)) {
    curiosityScore += 20;
    sentimentScore += 20;
    ctrScore += 15;
  }

  // Digits / High Stakes Numbers
  if (/\d+/.test(title)) {
    ctrScore += 15;
    curiosityScore += 10;
  }

  // Length Optimization (6 to 10 words is optimal)
  if (wordCount >= 6 && wordCount <= 10) {
    clarityScore = 90;
    ctrScore += 5;
  } else if (wordCount < 4 || wordCount > 12) {
    clarityScore = 55;
  }

  // Caps / Questions
  if (title.includes('?')) curiosityScore += 10;

  // Bound scores between 40 and 95
  const clamp = (val) => Math.min(95, Math.max(40, Math.round(val)));
  ctrScore = clamp(ctrScore);
  curiosityScore = clamp(curiosityScore);
  clarityScore = clamp(clarityScore);
  sentimentScore = clamp(sentimentScore);
  const overallScore = Math.round((ctrScore * 0.35) + (curiosityScore * 0.3) + (clarityScore * 0.2) + (sentimentScore * 0.15));

  // Fallback Recommendations based on rules
  const cleanTitle = title.replace(/[.!?]+$/, '');
  const rec1Title = `I Tested "${cleanTitle}" for 24 Hours (Extreme Results)`;
  const rec2Title = `The Untold Truth About ${cleanTitle}`;
  const rec3Title = `3 Massive Mistakes Everyone Makes With ${cleanTitle}`;

  return {
    source: 'semantic-nlp-evaluator',
    draftTitle: title,
    originalMetrics: {
      ctrScore,
      curiosityScore,
      clarityScore,
      sentimentScore,
      overallScore
    },
    recommendedTitles: [
      {
        title: rec1Title,
        metrics: {
          ctrScore: clamp(ctrScore + 22),
          curiosityScore: clamp(curiosityScore + 25),
          clarityScore: 88,
          sentimentScore: clamp(sentimentScore + 20),
          overallScore: clamp(overallScore + 22)
        },
        whyBetter: 'Adds high stakes, personal outcome, and a 24-hour time constraint.'
      },
      {
        title: rec2Title,
        metrics: {
          ctrScore: clamp(ctrScore + 18),
          curiosityScore: clamp(curiosityScore + 28),
          clarityScore: 92,
          sentimentScore: clamp(sentimentScore + 15),
          overallScore: clamp(overallScore + 19)
        },
        whyBetter: 'Leverages the Curiosity Gap trigger ("The Untold Truth").'
      },
      {
        title: rec3Title,
        metrics: {
          ctrScore: clamp(ctrScore + 16),
          curiosityScore: clamp(curiosityScore + 20),
          clarityScore: 85,
          sentimentScore: clamp(sentimentScore + 22),
          overallScore: clamp(overallScore + 18)
        },
        whyBetter: 'Uses negative framing ("Massive Mistakes") which drives higher CTR.'
      }
    ],
    feedback: [
      wordCount < 5 ? 'Title is slightly too short; adding stakes or context will boost clickability.' : 'Good word count balance.',
      !powerWordRegex.test(title) ? 'Consider adding a power word (e.g., Secret, Extreme, Ultimate, Tested) to trigger emotional curiosity.' : 'Great emotional trigger word used.',
      !/\d+/.test(title) ? 'Titles containing specific numbers or timeframes achieve up to 30% higher CTR.' : 'Numbers/data points detected.'
    ]
  };
};


