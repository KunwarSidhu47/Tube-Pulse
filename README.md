# Tube Pulse

[![Live Demo](https://img.shields.io/badge/Live_Demo-View_App-success?style=for-the-badge&logo=vercel)](https://tube-pulse.vercel.app/)

Tube Pulse is a high-performance YouTube channel analysis application engineered with a React frontend and an Express/Node.js backend. The platform interfaces directly with the YouTube Data API v3 to provide users with deep statistical insights, semantic content analysis, and performance metrics for any YouTube creator.

---

## Table of Contents
- [Features & Capabilities](#features--capabilities)
- [System Architecture](#system-architecture)
- [Engineering Highlights](#engineering-highlights)
- [Getting Started](#getting-started)
- [License](#license)

---

## Features & Capabilities

- **Deep Channel Analytics:** Programmatically calculates a normalized Creator Score, Engagement Rate, and Upload Consistency matrix based on recent video history.
- **Semantic Content Insights:** Extracts and aggregates trending keywords and specific visual markers from recent video titles using semantic data processing.
- **Automated Content Classification:** Dynamically differentiates between standard videos and YouTube Shorts by extracting and parsing ISO 8601 duration timestamps.
- **Optimized Search Experience:** Features a debounced autocomplete search interface backed by a dual-layer caching system to ensure low-latency responses.
- **Graceful Media Degradation:** Implements a cascading fallback system that actively queries undocumented YouTube CDN endpoints to guarantee maximum-resolution thumbnail rendering without letterboxing.
- **Modern User Interface:** Built upon a responsive, dark-mode aesthetic utilizing custom CSS, precise z-index stacking, and optimized micro-animations.

---

## System Architecture

**Frontend**
- React (UI Component Library)
- Vite (Build Tool & Development Server)
- Recharts (Data Visualization)

**Backend**
- Node.js (Runtime Environment)
- Express (Web Framework & Routing)
- YouTube Data API v3 (External Data Source)

---

## Engineering Highlights

This project addresses several complex integration challenges with the YouTube Data API:

- **API Quota Optimization:** Standard YouTube Search endpoints are extremely expensive (100 units per request). To prevent quota exhaustion, this application implements a robust request cancellation system (`AbortController`) combined with a 10-minute in-memory backend cache (`Map`) and a frontend state cache. This reduces duplicate search costs to 0 quota units.
- **Data Engineering:** Instead of exhausting paginated API limits to generate lifetime statistics, the application features a local "Recent Trends Engine" that performs mathematical consistency mapping and regex-based content analysis solely on the latest dataset.

---

## Getting Started

### Prerequisites
- Node.js installed on your local machine.
- A valid YouTube Data API v3 key provisioned from the [Google Cloud Console](https://console.cloud.google.com/).

### Installation & Setup

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
   Create a `.env` file in the root directory and securely add your API key:
   ```env
   YOUTUBE_API_KEY=your_api_key_here
   ```

4. **Initialize Development Servers**
   To run the application locally, you will need to start both the backend API and the frontend development server. Open two separate terminal instances:
   
   **Terminal 1 (Backend - Port 5000):**
   ```bash
   node server.js
   ```
   
   **Terminal 2 (Frontend):**
   ```bash
   npm run dev
   ```

---

## License
This project is open source and available under the [MIT License](LICENSE).
