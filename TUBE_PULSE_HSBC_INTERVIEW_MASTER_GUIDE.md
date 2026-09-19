# Tube Pulse — HSBC TSE Interview Master Guide

**Purpose:** a repeatable, code-accurate reference for explaining Tube Pulse. Revise a section, then ask Codex to interview you one question at a time. Do not memorize claims that this guide labels unsupported.

## 1. Two-minute quick revision

### The honest project summary

Tube Pulse is a React frontend and Express/Node backend that lets a user search for a YouTube channel. The backend keeps the YouTube API key private, searches the YouTube Data API for a channel, retrieves channel statistics, gets its uploads playlist, retrieves details/statistics for up to 20 recent uploads, and returns a UI-shaped JSON response. React shows the channel, recent videos/Shorts, and a Recharts dashboard calculated from that recent sample. MongoDB stores the ten most recently searched **unique channels** for quick reuse.

### Architecture in one diagram

```text
User types a name
  │
  ├─ autocomplete only: HomePage useEffect
  │     └─ 700 ms timer → fetch /api/suggestions/:query
  │          (cleanup clears timer and aborts the browser fetch)
  │
  └─ presses Search / selects suggestion: executeSearch
        └─ fetch /api/channel/:channelName
              └─ Express route in server.js
                    ├─ Map cache / fetchYouTube
                    ├─ YouTube search.list → channel id
                    ├─ channels.list → channel + uploads-playlist id
                    ├─ playlistItems.list → up to 20 upload ids
                    ├─ videos.list → duration + statistics
                    ├─ fire-and-forget saveSearch → MongoDB
                    └─ JSON { channel, videos, shorts }
                          └─ React state updates
                                └─ AnalyticsDashboard useMemo → Recharts/UI
```

### 30–60 second answer: “Tell me about Tube Pulse.”

“Tube Pulse is a full-stack YouTube channel analytics project. I built a React interface with an Express backend so the YouTube API key stays on the server. A channel search goes through the backend, which uses YouTube’s search, channels, playlist-items, and videos endpoints to fetch channel statistics and a recent sample of up to 20 uploads. I normalize that response into videos and duration-based Shorts, then React calculates engagement, upload-gap, title, and content-mix metrics and visualizes them using Recharts. I also added MongoDB/Mongoose persistence for recent unique channel searches. The project includes autocomplete with a 700-millisecond debounce, browser-side abort handling, frontend suggestion caching, and a ten-minute backend Map cache. I am careful to describe the dashboard as a recent-sample analysis, and cache savings as measured telemetry rather than claim an unproven universal percentage.”

### Resume truth table — memorize this

| Resume claim | Accurate answer |
|---|---|
| MERN web application | Yes: React frontend; Node/Express backend; MongoDB/Mongoose persistence. It is a small monorepo, not a production-ready microservice system. |
| Analyze stats, engagement, upload history | Mostly yes, but “history” means a recent sample of **up to 20 uploads**, not lifetime channel history. |
| 90% quota reduction | **Not proven by code.** The app has reduction mechanisms and process-local cache telemetry, but no baseline experiment or production measurement proving 90%. |
| Recharts across 15+ recent uploads | The backend requests up to 20 uploads and the dashboard consumes all returned classified items. Say “up to 20”; a channel can return fewer. |
| Persistent search history | Yes, but it is the latest ten **unique channels**, not an immutable event log of every search. |

## 2. Code map: what actually exists

| Area | Actual file/function | Reality |
|---|---|---|
| Frontend entry | `src/main.jsx` | `createRoot(...).render(<StrictMode><App /></StrictMode>)`. |
| App shell | `src/App.jsx` | Renders only `HomePage`. |
| Main UI | `src/components/HomePage.jsx` | Search, suggestions, loading/error UI, channel card, recent search cards, video cards. |
| Dashboard | `src/components/AnalyticsDashboard.jsx` | Calculates metrics with `useMemo`; renders Recharts bar, line, and pie charts. |
| Backend entry | `server.js` | Express app, routes, YouTube integration, cache, startup. There is no controller folder; route handlers contain controller logic. |
| DB connection | `config/db.js` | `mongoose.connect(process.env.MONGODB_URI)`; exits the Node process on failure. |
| Data model | `models/SearchHistory.js` | One Mongoose model/collection for unique channels. |
| DB service | `services/searchHistoryService.js` | `saveSearch` upsert and `getRecentSearches` query. |
| Styling | `src/index.css`, `src/App.css`, component CSS | CSS3 custom properties, responsive grids, animations; no UI framework. |
| Build/deploy | `vite.config.js`, `vercel.json` | Vite React build. Vercel configuration rewrites all paths to `index.html`; it does **not** deploy `server.js` as a serverless API. |

Environment variables are `YOUTUBE_API_KEY` and `MONGODB_URI`. `.env` is ignored by Git. `package.json` has `dev`, `build`, `lint`, and `preview`; it has no backend `start` script, so local backend startup is `node server.js`.

There is no authentication, authorization, user account, password handling, Axios, Redux, TypeScript, test suite, controller layer, Redis, rate limiter, Docker file, or database migration layer.

## 3. Detailed request flow: “What happens on search?”

### A. Autocomplete while typing — not the same as a submitted search

1. The input `onChange` calls `setChannelName` in `HomePage.jsx`.
2. The `useEffect` dependent on `channelName` runs. For a nonblank query, it first checks `suggestionsCache.current[trimmedQuery]`.
3. On a cache miss, it creates `new AbortController()` and schedules a `setTimeout` for 700 ms.
4. If typing continues before 700 ms, React runs effect cleanup: `clearTimeout(timerId)` means the old request was never started, and `abortController.abort()` aborts an already-started browser request.
5. If the user pauses, browser `fetch` calls `GET /api/suggestions/:query` with `signal: abortController.signal`.
6. Express calls YouTube `search.list` with `type=channel` and `maxResults=5`, maps only channel id/title/default thumbnail, and returns an array.
7. React stores the suggestion array in the in-component ref cache and state, which renders the dropdown.

### B. Submitted channel search

1. Form submission calls `handleSearchSubmit`, which prevents the browser reload and calls `executeSearch(channelName)`. Selecting a dropdown item also calls `executeSearch(suggestion.title)`.
2. `executeSearch` trims the name. It returns immediately for blank input or exactly the same string as `lastSearchedRef.current`; this avoids duplicates but has a limitation: after a failed search, retrying the same exact text is also blocked until the input changes.
3. It resets result state, error state, dropdown state, and description expansion; `loading=true` displays skeleton cards and disables the Search button.
4. It calls browser `fetch('http://localhost:5000/api/channel/:name')`. **This submitted request has no AbortController.**
5. Express `GET /api/channel/:channelName` reads `YOUTUBE_API_KEY`, then calls YouTube endpoints below through `fetchYouTube`.
6. `fetchYouTube` checks a global, process-memory `Map`. A cache hit returns data immediately. A miss calls upstream `fetch`, records telemetry, parses JSON, and caches successful data.
7. The route formats a smaller `channel` object and mapped upload objects, classifies each upload with duration `<=60` seconds, invokes `saveSearch(channelInfo)` without awaiting it, and responds with JSON.
8. React parses response JSON, sets `channelData`, `latestVideos`, and `latestShorts`, then refreshes recent searches. State updates trigger rendering; the dashboard receives three props and recalculates through `useMemo`.

### Simple versus technical explanation

**Simple:** “The frontend asks my backend for a channel. The backend asks YouTube and MongoDB, shapes a small response, and the frontend turns it into cards and charts.”

**Technical:** “The browser issues REST GET requests to Express. The channel handler orchestrates four YouTube read calls with a process-local TTL cache, transforms provider resources into a frontend DTO, starts an asynchronous Mongo upsert, and serializes JSON. React commits the new state, and a memoized derived-data calculation feeds controlled Recharts components.”

## 4. YouTube Data API: exact calls

All are HTTP GET calls made inside `server.js`; the API key is appended server-side. The canonical current quota reference is Google’s [quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost). Do not quote an old fixed “100 units per search” figure from the README; quota policy has changed and must be checked at interview time.

| Call | Parameters actually used | Fields consumed | Why/result |
|---|---|---|---|
| `search.list` for submitted search | `part=snippet`, `type=channel`, `q=<name>`, `maxResults=1` | `items[0].snippet.channelId` | Converts a human query to one selected channel id. It chooses the first result; it is not exact-handle verification. |
| `channels.list` | `part=snippet,statistics,contentDetails`, `id=<channelId>` | title, description, thumbnails, customUrl, subscriber/view/video counts, uploads playlist id | Produces channel card data and finds the uploads playlist. |
| `playlistItems.list` | `part=snippet,contentDetails`, `playlistId=<uploadsId>`, `maxResults=20` | `contentDetails.videoId` | Collects recent upload ids. It fetches a recent page, not all history. |
| `videos.list` | `part=snippet,contentDetails,statistics`, `id=<comma separated ids>` | title, description, thumbnail options, publishedAt, ISO duration, view/like/comment counts | Builds video DTOs used by cards/dashboard. |
| `search.list` for suggestions | `part=snippet`, `type=channel`, `q=<query>`, `maxResults=5` | channel id/title/default thumbnail | Autocomplete list only. |

### Duration/Shorts answer

`parseISODuration` uses a regex for `PT#H#M#S`, converts to seconds, and marks `durationSeconds <= 60` as `short`. That is a pragmatic heuristic, **not** an authoritative YouTube Shorts field. Invalid/missing duration becomes zero and is therefore incorrectly classed as short; modern Shorts can exceed 60 seconds. Say this limitation proactively.

### Thumbnail fallback

The server supplies CDN URLs from `maxresdefault` to lower-res provider URLs. `VideoCard` starts with index zero and increments the index on image `onError`. This is UI resilience, not a server probe; frequent missing `maxresdefault` images can add browser requests.

## 5. Debounce and AbortController: deep answer

### Debounce

Debounce means “wait until activity has been quiet for a chosen period before acting.” Here it is specifically autocomplete, not the Search button. The timer is at `HomePage.jsx` lines 175–214.

If a person types `Y`, `Yo`, `You`, `Yout`, `Youtu`, `Youtube` with less than 700 ms between keys, every state change schedules a timer but cleanup cancels the previous one. After the last keystroke and a 700 ms pause, one suggestion request should be sent. Without debounce, six state changes could produce up to six requests. If the person pauses for 700 ms at intermediate text, that intermediate request is intentionally sent.

**Why 700 ms?** It is a UX/quota trade-off chosen in this implementation: long enough to avoid calling an external API on normal fast typing, short enough that suggestions feel responsive after a pause. It is not scientifically tuned in the code. 100 ms would feel faster but send more requests; 2000 ms would reduce requests more but feel sluggish.

The effect cleanup runs both before the next effect and on unmount. It clears the pending timer. A limitation is that when a suggestion result has already returned, a later stale result could still race in under some timing patterns; abort improves this but does not prove server work was stopped.

### AbortController

`new AbortController()` creates a controller with an `AbortSignal`; the signal is passed only to the **browser** suggestion `fetch`. Calling `abort()` makes that fetch reject with an `AbortError`, which the code deliberately does not log.

It cancels the client-side request lifecycle or prevents future handling. If the Express request has already reached the server, this code does not listen for client disconnects or pass cancellation to `fetchYouTube`, so the server may still call YouTube. Therefore **AbortController alone does not reliably save YouTube quota**. The biggest reliable quota benefit comes from clearing a timer before the browser sends the request, frontend suggestion cache hits, and backend cache hits.

Strong answer: “I used AbortController to prevent obsolete autocomplete responses from updating the UI and to stop in-flight browser requests. I would not claim it cancels an upstream YouTube request after Express has started it; propagating cancellation requires server request-signal handling.”

Likely follow-ups:

- Debounce vs throttle? Debounce waits for silence; throttle limits execution to a rate while activity continues.
- Why not cancel submitted channel search? Current code does not; I would add a controller/ref for it.
- What prevents a stale response? Cleanup/abort helps on client; robust code should also associate responses with the current query/request id.

## 6. Ten-minute cache and quota claim

### What the cache actually does

`cache` is a module-level `Map` in `server.js`. Each cached value is `{ data, timestamp }`. `fetchYouTube` receives a cache key:

- `search:<channelName>` for submitted lookup
- `channel:<channelId>` for channel details
- `playlist:<uploadsPlaylistId>` for upload ids
- `videos:<comma-separated-videoIds>` for video details
- `suggestions:<query>` for autocomplete

On a hit younger than 600,000 ms, it returns the saved JSON. On expiration it deletes that key and fetches again. On a successful miss it inserts the data. It is global to all users of one Node process, not per user, and disappears on restart/deploy. It has no max size/LRU eviction, distributed sharing, persistent storage, or in-flight request coalescing. Two simultaneous first requests can both miss and both call YouTube.

### Quota telemetry

`quotaMetrics` counts upstream calls, cache hits, estimated used units and estimated avoided units. `GET /api/quota-metrics` returns a process-local `cacheSavingsPercent`. The implementation uses the default `quotaCost=1` in every call; it is a cache-only estimator, resets on restart, has no user/endpoint breakdown, and does not measure debounce/abort prevention.

### Can you defend “90%?”

**No—not yet as a proven number.** The repository does not contain a before/after benchmark, production logs, a defined comparison period, or a measurement of requests prevented by the client debounce. The endpoint can show observed cache savings for the current process, but not historical total savings.

If challenged, say: “The 90% was an estimate and I would revise the resume wording unless I have recorded measurements. The code demonstrably reduces redundant calls: 700 ms debounce avoids sending most fast-typing intermediate queries; a frontend ref cache reuses exact suggestions; and a 10-minute backend cache avoids repeat provider calls. I added `/api/quota-metrics` to measure server-cache savings. To substantiate 90%, I would log baseline requests/quota before enabling the optimizations, log sent requests and cache hits after, use the same traffic window, and calculate `(baseline - optimized) / baseline × 100`.”

Safer resume wording: **“Reduced redundant autocomplete and repeated API calls using 700 ms debouncing, browser request cancellation, and a 10-minute server-side cache.”**

### Redis/multi-instance follow-up

Redis would hold TTL values outside a Node process. Each backend instance would use the same keys; restarts would not immediately erase the cache. Add a TTL when setting a key, use a bounded key design, and consider a lock/single-flight pattern to stop a cache stampede. Redis does not replace provider rate limiting.

## 7. MongoDB/Mongoose

### Actual persistence design

`config/db.js` calls `mongoose.connect(MONGODB_URI)` before Express listens. If connection fails or the variable is missing, it logs and executes `process.exit(1)`: recent-search history is not optional in current startup design.

`SearchHistory` schema has `channelId` (required, `unique: true`), `channelName` (required), `thumbnail`, `subscribers`, `searchedAt`, plus Mongoose `createdAt`/`updatedAt` timestamps. In MongoDB terminology, each channel history record is a document; the model maps to a collection, normally `searchhistories`.

After a successful channel lookup, the route calls `saveSearch(channelInfo)` without `await`. `findOneAndUpdate({ channelId }, values, { upsert:true, new:true })` updates the same channel’s metadata/timestamp or creates it. `getRecentSearches` sorts descending by `searchedAt`, limits to ten, and selects only the fields the UI needs. A duplicate channel is deliberately updated—not added as a separate search event.

### Why MongoDB here? Why not MySQL?

Strong answer: “For this small feature, the data is a simple channel-shaped record and I only need upsert by channel id plus recent sorting. MongoDB’s document model and Mongoose schema made this straightforward in the same JavaScript ecosystem. MySQL would also be fully valid: a `search_history` table with a unique `channel_id` and an index on `searched_at` would serve this access pattern well. I did not choose MongoDB because SQL cannot do it; I chose it for flexible document-shaped development and a small schema.”

| Topic | Project-specific answer |
|---|---|
| Indexing | `unique: true` normally creates a unique index on `channelId`, which supports the upsert lookup. For a large collection, add an index on `searchedAt` for the sort; it is not explicitly defined in code. |
| ACID | MongoDB supports atomic single-document operations; this upsert is one-document. The project does not use multi-document transactions. |
| Transactions | Not needed for the current independent history update. Use one if a future operation must atomically modify several documents/collections. |
| Replication | Replica sets provide redundancy/read scaling. Not configured here. |
| Sharding | Partition data across shards by a shard key when one database cannot handle scale. Not relevant to ten recent entries per simple lookup yet; a poor shard key can cause hotspots. |
| SQL vs NoSQL | SQL has relational tables and joins with enforced schemas; MongoDB stores BSON documents and can embed related data. Choose based on relationship/query/transaction needs, not fashion. |

## 8. API contract and error handling

| Method/route | Input/output | Actual outcomes |
|---|---|---|
| `GET /api/channel/:channelName` | Path name → `{channel, videos, shorts}` | 404 for no channel/details/playlist; forwards known upstream status such as 429; otherwise 500. No length/character validation. |
| `GET /api/suggestions/:query` | Query path → max 5 suggestion objects | Missing API key 500; known upstream status; otherwise 500. No minimum query length. |
| `GET /api/recent-searches` | No input → up to 10 stored unique channels | 500 if DB query throws. |
| `GET /api/quota-metrics` | No input → process-local counters | Always JSON/200 in current code. |
| `POST /api/channel` | `{ channelName }` → echo response | Demonstration endpoint only; no validation and unused by UI. |
| `GET /api/youtube-test` | No input → message only | Reveals whether key is configured, not key value. Useful locally, unnecessary publicly. |

`express.json()` parses JSON request bodies; `cors()` enables CORS with its permissive default. `async/await` makes the sequential provider flow readable: each `await` waits for data before the next dependent call. The project uses native browser/Node `fetch`, not Axios.

### Edge cases: implemented vs missing

| Situation | Actual behavior |
|---|---|
| Blank submitted query | Client returns before calling API. |
| Channel not found | Backend returns 404; frontend displays error text. |
| Missing YouTube key | Backend returns 500. |
| Provider quota message/429 | Backend returns 429 with friendly quota message. |
| Other provider/non-JSON failure | Often 500; `response.json()` on a non-JSON error can itself throw. |
| Network failure in channel fetch | Client catch shows error. |
| Mongo save failure | Service logs it and response still succeeds because save is not awaited. |
| Mongo read/startup failure | Recent-search endpoint 500; startup DB failure exits server. |
| Cache miss/expiry | Calls provider; success caches. |
| Concurrent identical requests | No single-flight protection; duplicates can call provider. |
| Malformed YouTube fields | Optional chaining/default string prevents some crashes, but no formal schema validation. |
| Repeating failed exact search | `lastSearchedRef` can block it; this is a bug/limitation. |

## 9. React and Recharts deep dive

`HomePage` owns local component state; there is no global state library. State includes input, loading/error, recent searches, channel response, suggestions/dropdown focus, and expanded description. Props pass `channelData`, `latestVideos`, and `latestShorts` into `AnalyticsDashboard`.

`AnalyticsDashboard` combines arrays, sorts them by `publishedDate`, and memoizes derived analytics. It calculates:

- average views/likes/comments over the returned sample;
- engagement rate = `(total likes + total comments) / total views × 100`;
- average duration for entries classified as normal `video` only;
- average date gap and estimated uploads/month = `30 / average gap`;
- weekday/hour based on the browser’s local time zone;
- title/description length, emoji percentage, simple common words;
- a heuristic creator score: engagement max 40, upload consistency max 30, average-view/subscriber ratio max 30.

It renders `BarChart` for recent upload views, `LineChart` for views over date, `PieChart` for video/Short count, plus a custom SVG score ring. These are derived **descriptive heuristics**, not a predictive model or YouTube-authoritative creator score. The “Long-form videos outperform Shorts” recommendation compares counts, not performance; call that out if asked.

Recharts was a reasonable choice because it provides declarative React components and responsive containers. Alternatives: Chart.js (more imperative/plugin ecosystem), D3 (maximum control but more work), or a custom SVG/canvas chart.

## 10. Security and production readiness

### Implemented

- `dotenv` reads secrets on server; `YOUTUBE_API_KEY` is not bundled into React source.
- `.env` is ignored by Git.
- `encodeURIComponent` is used while building provider URLs.
- External YouTube links use `target="_blank"` with `rel="noopener noreferrer"`.

### Missing / risks — say them confidently

- CORS is open to all origins with `app.use(cors())`.
- No authentication, authorization, user isolation, rate limiting, CAPTCHA, request-size policy, or API gateway.
- Inputs are not length-normalized/validated, and raw case/spacing produce separate cache keys.
- The backend becomes a publicly abusable proxy to the project’s YouTube quota.
- No `helmet` security headers, structured logging, request IDs, provider timeout, retry/backoff, or schema validation.
- Error messages can surface operational detail; `/api/youtube-test` should not be public in production.
- The live Vercel configuration is not a complete full-stack deployment: the frontend calls `localhost:5000`, which means a deployed visitor’s browser targets its own machine. `vercel.json` only serves the SPA. Deploy Express separately or create Vercel API/serverless handlers, and use an environment-based API base URL.

## 11. Scaling answer: “What breaks at 100,000 users?”

1. **YouTube quota and third-party latency** fail first: every unique cold search can orchestrate four provider calls, and autocomplete can drive search calls. Add server rate limits, minimum query length, quota monitoring, shared cache, and perhaps background jobs.
2. **Process-local cache** is lost/shared incorrectly across multiple replicas. Replace with Redis and add request coalescing.
3. **Express instance** needs horizontal scaling behind a load balancer; make services stateless and propagate observability/correlation IDs.
4. **MongoDB** needs indexes (`channelId`, `searchedAt`), connection-pool monitoring, replica set, then sharding only after evidence of need.
5. **Frontend** can use a CDN for static Vite assets, code-split the currently >500 kB bundle, and virtualize long lists if sample size grows.
6. Add a job/queue model for expensive analytics, circuit breakers/timeouts, monitoring/alerts, and a deployment-safe configuration strategy.

## 12. Resume defence: questions, traps, answers

### Full-stack analytics platform

**Question:** “Why is this full stack?”  
**Answer:** “React renders the UX and charts; Express protects provider credentials and orchestrates data acquisition; MongoDB persists recent search data. The frontend does not call YouTube with the key directly.”  
**Trap:** Do not say the dashboard analyses lifetime data or the app has authentication.

### Debounce/cache/90%

**Question:** “How did you calculate 90%?”  
**Answer:** “I cannot defend 90% as a measured production result from this code alone. I can defend the mechanisms and show the cache metrics endpoint. I would calculate it from a defined before/after request or quota baseline.”  
**Follow-ups:** Why 700? Why exact-query cache? Does abort cancel server? What happens on two cache misses? Why Map not Redis?  
**Trap:** Do not imply browser abort reverses an already charged upstream YouTube request.

### Recharts / 15+ uploads

**Question:** “How many uploads does the dashboard analyze?”  
**Answer:** “The current route requests up to 20 uploads. After duration-based classification, the dashboard combines both arrays and analyzes all returned items. It can be fewer if the channel has fewer or items are unavailable.”  
**Trap:** Do not say exactly 20 for every channel, or that classification is authoritative.

### Mongo history

**Question:** “What exactly do you persist?”  
**Answer:** “Channel id, channel name, default thumbnail URL, parsed subscriber count, and last searched time, plus Mongoose timestamps. `channelId` is unique; repeat search updates rather than adds a duplicate.”  
**Trap:** Do not call it a complete audit/search-event history.

## 13. Twenty interviewer follow-up chains

Use these as prompts; answer each aloud before opening the answer sections above.

1. Why React? Why local state rather than Redux? What triggers a re-render? Why `useMemo`?
2. Why Node/Express? Why not direct YouTube calls from React? What middleware runs first?
3. Explain `GET /api/channel/:channelName` line by line. Why four provider calls?
4. Why `search.list` first? How could you avoid ambiguous first-result selection?
5. Explain debounce. Debounce vs throttle. Why 700 ms? What happens at 100 ms?
6. Explain AbortController. What does it truly cancel? Does it cancel Node/YouTube work?
7. Explain your Map cache. Cache key? TTL? Cache stampede? Memory growth?
8. How would Redis change cache behavior across three instances?
9. How did you measure 90%? If not measured, why is it on resume? What wording is defensible?
10. Why MongoDB? Why not MySQL? Define document/collection/index.
11. Explain your upsert. Why unique `channelId`? What happens to repeat searches?
12. What index supports `getRecentSearches`? What index is missing?
13. What happens if MongoDB is unavailable while app starts? During a save? During a read?
14. Explain engagement rate. What bias does aggregate ratio have? Is it a benchmark?
15. Explain creator score constants. Who chose 8%, 14 days, 20%? How would you validate them?
16. How do you identify Shorts? What edge cases make the method wrong?
17. How do Vite, React build, Express, and Vercel fit together? What is broken in current deployment config?
18. How is API key protected? What security gaps remain?
19. If 1,000 users submit the same channel simultaneously, what happens? How would you prevent duplicate provider work?
20. Name one bug: failed exact query retry is blocked by `lastSearchedRef`; how would you fix it? Update the ref only after success, or reset it on failure.

## 14. “Why?” and alternatives

| Decision | Why in this project | Alternative/trade-off |
|---|---|---|
| React | Component state maps naturally to search/result/dashboard UI. | Vanilla JS less tooling; Vue/Svelte similar result with different ergonomics. |
| Express | Small routing/middleware layer to keep key server-side. | Fastify/NestJS; more structure/features at added complexity. |
| Native fetch | Built into modern browser/Node runtime; no Axios dependency. | Axios interceptors/convenience; extra dependency. |
| Mongo/Mongoose | Small document-shaped history, JavaScript schema/model API. | MySQL/Postgres stronger relational/transactional workflows. |
| Map TTL cache | Tiny, zero-infrastructure optimization. | Redis is shared/persistent-ish/evictable, but operationally more complex. |
| 700 ms debounce | Balance perceived responsiveness versus suggestion requests. | Dynamic debounce/min chars could be better. |
| Recharts | Declarative React chart composition. | D3 gives fine control; Chart.js can have a smaller learning curve. |

## 15. Red / yellow / green knowledge gaps

### Red — know before interview

- The exact request flow and separation between autocomplete versus submitted search.
- AbortController limitation; unproven 90% claim; cache scope and limitations.
- Up to 20 recent-upload sample versus lifetime history; heuristic Shorts classification.
- Mongo upsert/unique record behavior and MongoDB vs MySQL answer.
- Current deployment mismatch: `localhost:5000` and Vercel SPA rewrite do not deploy Express.
- Security gaps: public CORS/proxy/no rate limit/no auth.

### Yellow — should know

- React render/state/effect/cleanup and `useMemo`.
- HTTP status codes, REST, middleware, CORS, TTL, cache stampede.
- Indexes, replica sets, transactions, load balancing, Redis.
- Analytics formulas and why creator score is heuristic.

### Green — nice to know

- D3 vs Recharts internals, Mongo shard-key design, CDN caching strategy, tracing systems, advanced queue/circuit-breaker patterns.

## 16. Questions you must never get wrong

1. **Does AbortController save YouTube quota?** Not reliably after the server has started work; it aborts the browser fetch. Timer cancellation before dispatch and cache hits are the clear savings.
2. **How was 90% measured?** It was not proven in code. Use telemetry/baseline to substantiate or change wording.
3. **What is cache key and lifetime?** Provider-resource-specific strings in a process-global `Map`, 10 minutes, gone on restart.
4. **What does “15+ uploads” mean?** Current code requests up to 20 and analyzes returned recent items; not guaranteed count or lifetime history.
5. **Is Shorts detection exact?** No; duration `<=60` is a heuristic.
6. **Is current Vercel deployment fully configured?** No; source hardcodes local backend URL and Vercel config only rewrites SPA paths.

## 17. Generic answers

**Hardest part:** “The difficult part was turning several dependent YouTube resources into one responsive UI flow while controlling redundant requests. I had to use a channel search to get an id, fetch channel content details to discover the uploads playlist, then fetch the video data needed for analytics. I added layered caching and made the cache impact visible, but learned to separate actual measurements from estimates.”

**Bug/debugging story:** “The frontend had two `timeAgo` declarations, causing the Vite production build to fail with a duplicate identifier parse error. I reproduced it with `npm run build`, removed the duplicate and unused code, then ran lint and build again. I also found the retry limitation caused by setting `lastSearchedRef` before the request succeeds.”

**What would you improve?** “First I would fix deployment configuration with an environment-specific API base URL and deploy the backend properly. Then add validation/rate limiting, Redis, request coalescing, provider timeouts, tests, and a correct Shorts source. I would replace score thresholds with validated assumptions and make quota measurements persistent.”

**If YouTube is down?** “The current wrapper returns an error; the UI displays it. Production code should add timeout, limited exponential retry for transient failures, circuit breaking, and possibly serve clearly marked stale cache data.”

**If MongoDB is down?** “At startup the app exits. After startup, save errors are logged and search response continues, while reading recent searches returns 500. I would make history degraded/optional if channel analysis must remain available.”

## 18. Mock interviewer mode

When you ask for “interviewer mode,” I will ask one question, wait for your answer, challenge vague or unsupported claims, then drill deeper based on your response. I will not reveal the answer first.

**First question:** “Tell me about your Tube Pulse project.”

