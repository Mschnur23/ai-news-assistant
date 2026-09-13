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

## Junior Job Scout

Additive extension below Web Explorer: 1–5 public source pages, up to eight jobs
per source, and up to five recommendations via `POST /api/jobs/scan`. It uses
Firecrawl Scrape JSON extraction and the same server-side key and request helper.
No pagination, linked-page fetching, applications or storage.

Ranking caps: accessibility 40, transferable skills 30 (10 per evidenced skill),
future-relevant exposure 20 (10 per signal), learning 10. Explicit junior/graduate
or low-experience signals earn 40; broader assistant/analyst signals earn 24.
Senior warnings subtract 80 and exclude the role from junior recommendations.
Roles without an early-career signal are omitted. Evidence quotes must occur in
the scraped page; unavailable facts are left blank, not inferred. Missing skill
or exposure evidence is stated in the three bullets. Extraction can miss details;
review the original posting. DNS and address checks reject internal sources.

No new dependencies are required. Set the existing Firecrawl key on Vercel before
deployment; structured extraction may consume additional Firecrawl credits.

Live source check (2026-09-13): the workshop UK Find a Job URL redirects to
the Work Hub homepage, and USAJOBS `/Search` returns no listing cards in
Firecrawl. Use `https://www.usajobs.gov/Search/Results?wt=15328` for public
internship results. Verified internship employment types count as early-career
evidence even when the role title is simply “MATHEMATICIAN”. Sources are never
silently substituted. Recheck availability before each workshop.
