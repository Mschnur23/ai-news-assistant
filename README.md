# AI News Assistant

Phase 1: three RSS sources, local keyword filtering, and one-article Deep Read.

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
Set `FIRECRAWL_API_KEY` in Vercel Environment Variables before deploying Phase 1.
The local key is never included in the build. No push or deployment is performed
by the local scripts.

Deep Read sends one selected URL to Firecrawl Scrape and displays at most 6,000
characters as text. It does not crawl or automatically scrape loaded articles.
Unavailable feeds produce a warning while available stories remain usable.

Phase 2 and later features are not implemented.
