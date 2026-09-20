# Tube Pulse

Tube Pulse is an enterprise-grade YouTube channel analytics and AI content intelligence platform engineered with a React frontend and an Express/Node.js backend. The application integrates directly with the YouTube Data API v3 alongside dual Large Language Model (LLM) engines—OpenAI ChatGPT and Google Gemini—to provide deep channel performance metrics, semantic content analysis, and AI-generated niche blueprints.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [AI & Data Engineering Highlights](#ai--data-engineering-highlights)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [License](#license)

---

## System Architecture

```text
User Search Input / Autocomplete
         │
         ├── Autocomplete (Debounced 700ms + AbortController)
         │       └─ GET /api/suggestions/:query
         │
         └── Submitted Channel Search
                 └─ GET /api/channel/:channelName
                         │
                         ├─ Express Backend (Port 5000)
                         ├─ In-Memory TTL Cache (10-Min Expiration)
                         ├─ YouTube Data API v3 (search, channels, playlistItems, videos)
                         ├─ MongoDB / Mongoose (Search History Persistence)
                         │
                         ├─ AI Channel Intro Summary
                         │     └─ OpenAI ChatGPT API (gpt-4o-mini)
                         │
                         └─ AI Niche Blueprint & Creator Insights
                               └─ Google Gemini API (gemini-3.5-flash-lite)
```

---

## Key Features

### 1. Dual-Engine AI Intelligence
- **Natural Channel Summaries:** Integrates OpenAI ChatGPT (`gpt-4o-mini`) with context enrichment (video titles and channel descriptions) to generate concise, accurate channel bios without template artifacts or niche hallucinations.
- **AI Niche Blueprint Generator:** Leverages Google Gemini (`gemini-3.5-flash-lite`) to generate 5 original high-CTR video concepts, 0-to-3-second hook scripts, niche hashtags, and viral growth rules tailored to any creator niche.

### 2. Comprehensive Performance Analytics
- **Normalized Creator Score:** Multi-factor heuristic rating based on engagement benchmarks, upload consistency, and subscriber-to-view ratios.
- **Engagement & Upload Pattern Matrix:** Interactive Recharts visualizations detailing upload cadence, video vs. Shorts split, weekday/hour posting heatmaps, and title length correlations.

### 3. High-Efficiency Data Pipeline
- **ISO 8601 Duration Parser:** Classifies content into YouTube Shorts (`<= 60s`) and standard long-form videos server-side without extra API quota overhead.
- **Cascading CDN Fallback:** Implements a client-side thumbnail fallback cascade (`maxresdefault` -> `sddefault` -> `hqdefault` -> provider default) to guarantee maximum-resolution visual rendering.
- **Debounced Autocomplete:** Client-side 700ms debouncing paired with `AbortController` cancellation to prevent unnecessary network requests during active typing.

---

## AI & Data Engineering Highlights

- **Dual-LLM Routing & Resilient Fallback Chain:** The backend employs dynamic routing between OpenAI and Google Gemini services. To ensure high availability against API rate limits or model deprecations, Gemini requests utilize a automatic fallback chain (`gemini-3.5-flash-lite` -> `gemini-3.5-flash` -> `gemini-3.6-flash`).
- **Robust JSON Extraction Engine:** To prevent runtime parsing errors from LLM responses containing markdown code blocks or reasoning artifacts, the backend uses regex-based payload extraction (`/\{[\s\S]*\}/`) prior to JSON deserialization.
- **Context Enrichment & Anti-Hallucination:** Eliminates LLM niche hallucinations for obscure channel names by supplying recent video titles and channel metadata as prompt boundaries.
- **API Quota Optimization:** Utilizes a process-memory Map cache (10-minute TTL) for YouTube API read operations, reducing redundant search unit costs and providing transparent telemetry via `/api/quota-metrics`.

---

## API Reference

### Backend Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/channel/:channelName` | Fetches channel profile, recent video uploads, and Shorts classification. |
| `POST` | `/api/channel-summary` | Generates a concise AI summary via OpenAI ChatGPT. |
| `POST` | `/api/generate-blueprint` | Generates AI content concepts and viral growth rules via Google Gemini. |
| `GET` | `/api/suggestions/:query` | Returns debounced channel autocomplete suggestions. |
| `GET` | `/api/recent-searches` | Retrieves recent unique search history from MongoDB. |
| `GET` | `/api/quota-metrics` | Exposes in-memory API cache telemetry and estimated quota savings. |

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB instance (Local or MongoDB Atlas)
- YouTube Data API v3 Key
- OpenAI API Key (for AI Channel Summaries)
- Google Gemini API Key (for AI Niche Blueprints)

### Installation & Configuration

1. **Clone the repository**
   ```bash
   git clone https://github.com/KunwarSidhu47/tube-pulse.git
   cd tube-pulse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   YOUTUBE_API_KEY=your_youtube_api_key
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Start Application**

   Run the Express backend server (Port 5000):
   ```bash
   node server.js
   ```

   In a separate terminal, run the Vite React frontend:
   ```bash
   npm run dev
   ```

---

## License

This project is open source and available under the [MIT License](LICENSE).
