# AI News Assistant

Phase 3: three RSS sources, local keyword filtering, one-article Deep Read, and Web Explorer.

## Run locally

Requires Node.js 24. Run `npm ci`, then `npm run dev` and open
http://127.0.0.1:3000. The server reads `FIRECRAWL_API_KEY` from the existing
ignored `.env.local`; never place that file in the public output or Git.

`npm test` checks API behavior with controlled responses, without consuming
Firecrawl credits. `npm run build` validates JavaScript and copies only
`index.html`, `style.css`, and `app.js` into `dist`.

## Vercel

Keep the existing GitHub/Vercel project. `vercel.json` sets the static output to
`dist`; the root `api/news.js` and `api/scrape.js` remain Vercel Node functions.
Set `FIRECRAWL_API_KEY` in Vercel Environment Variables before deploying.
The local key is never included in the build. No push or deployment is performed
by the local scripts.

Deep Read sends one selected URL to Firecrawl Scrape and displays at most 1,500
characters as text. It does not crawl or automatically scrape loaded articles.
Unavailable feeds produce a warning while available stories remain usable.

Web Explorer accepts one public http:// or https:// URL per submission and reuses
`/api/scrape`. Its result appears below its form, separate from RSS and Deep Read.
It displays the title, domain, URL, optional description, limited excerpt, and
an original-page link. Invalid URLs and failures leave the news feed intact.

Phase 3 adds mobile layouts, keyboard focus support, request timeouts, and clearer
loading, empty, and retry states. Later extensions are not implemented.
