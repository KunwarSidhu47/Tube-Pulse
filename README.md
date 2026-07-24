# Tube Pulse 🚀

Tube Pulse is a modern, high-performance YouTube channel analyzer built with a React frontend and an Express/Node.js backend. It leverages the YouTube Data API v3 to provide deep insights, recent trends, and performance metrics for any YouTube creator.

## ✨ Features

- **Deep Channel Analytics:** Calculates custom Creator Scores, Engagement Rates, and Upload Consistency.
- **Content Insights:** Extracts trending keywords and emoji usage from recent video titles using semantic processing.
- **Shorts vs Videos Detection:** Automatically categorizes content by parsing ISO 8601 duration timestamps.
- **Blazing Fast Search:** Features a debounced autocomplete search bar equipped with aggressive in-memory frontend and backend caching to save API quota.
- **High-Resolution Fallbacks:** Bypasses blurry API thumbnails by actively querying undocumented YouTube CDN endpoints (e.g., `maxresdefault.jpg`) with a cascading graceful degradation system.
- **Premium Glassmorphic UI:** Features a sleek, responsive dark mode interface built with custom CSS and smooth micro-animations.

## 🛠 Tech Stack

- **Frontend:** React, Vite, Recharts (for data visualization)
- **Backend:** Node.js, Express
- **API:** YouTube Data API v3

## 🚀 Getting Started

### Prerequisites
You will need Node.js installed and a YouTube Data API v3 key from the [Google Cloud Console](https://console.cloud.google.com/).

### Installation

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
   Create a `.env` file in the root directory and add your API key:
   ```env
   YOUTUBE_API_KEY=your_api_key_here
   ```

4. **Start the Development Servers**
   You will need two terminal windows.
   
   Start the backend server (runs on port 5000):
   ```bash
   node server.js
   ```
   
   Start the frontend React app:
   ```bash
   npm run dev
   ```

## 🧠 Engineering Highlights

- **Quota Optimization:** Implemented a multi-layered caching system (React `useRef` + Node.js `Map`) and `AbortController` request cancellation, dropping duplicate API search costs to 0 quota units.
- **Data Engineering:** Developed a local "Recent Trends Engine" to calculate upload gaps and parse semantics without exhausting pagination limits.

## 📄 License
This project is open source and available under the MIT License.
