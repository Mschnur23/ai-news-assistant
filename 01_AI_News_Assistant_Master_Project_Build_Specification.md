AI News Assistant — Master Project Build Specification

**Audience:** University students with little or no coding background  
**Build mode:** Lock-step classroom build using Codex  
**Precondition:** Codex, Git/GitHub and Vercel accounts are already set up  
**Deployment:** GitHub + Vercel  
**Day 1 target:** A live, shareable site that combines three AI-news RSS feeds, filters stories, opens originals in new tabs, uses Firecrawl for Deep Read, and lets the user scrape one additional webpage of their choice.

---

## 1. Project Goal

Build a simple **AI News Assistant** that demonstrates two different ways software can obtain current web information:

1. **RSS = discovery:** receive fresh updates from sites that publish feeds.
2. **Firecrawl = retrieval/extraction:** retrieve clean content from a normal webpage when RSS is unavailable or insufficient.

The completed Day 1 product should let a user:

- load current stories from three prepared RSS sources;
- combine them into one readable feed;
- filter loaded stories by keyword/topic;
- open the original story in a new tab;
- use **Deep Read** to retrieve cleaner content from one selected RSS article;
- enter another public webpage URL and use Firecrawl to retrieve that page directly;
- understand which results came from RSS and which came from Firecrawl;
- use the site at normal laptop and phone widths;
- share a public Vercel URL.

This is a **guided product build**, not a programming theory exercise. Students direct Codex with written specifications, inspect results, test observable behavior and publish working checkpoints.

---

## 2. Core Learning Message

> **RSS tells our app what changed. Firecrawl lets our app go read a webpage.**

Students should finish Day 1 able to explain:

- frontend vs backend;
- API request/response;
- RSS and XML parsing;
- local filtering;
- scraping/retrieval with Firecrawl;
- why API keys remain server-side;
- Git/GitHub checkpoints;
- Vercel deployment;
- chatbot vs fixed workflow vs agent.

The students do **not** need to memorize framework syntax or routine terminal commands.

---

## 3. Product User Story

> As a student following AI developments, I want one page that collects recent stories from several news sources, lets me narrow them quickly, gives me a deeper read when needed, and lets me inspect another webpage even when it has no RSS feed.

---

# 4. Prepared RSS Sources

Use these three prepared sources for the class build.

| Source | Purpose | RSS feed |
|---|---|---|
| WIRED — Artificial Intelligence | Dedicated AI coverage | `https://www.wired.com/feed/tag/ai/latest/rss` |
| TechCrunch — Artificial Intelligence | Startup / technology AI coverage | `https://techcrunch.com/category/artificial-intelligence/feed/` |
| VentureBeat — AI | Enterprise / technology AI coverage | `https://venturebeat.com/category/ai/feed/` |

### Source rules

- Keep feed URLs in one simple backend configuration area.
- Do not hard-code source-specific rendering in the frontend.
- Normalize every source into the same article shape.
- If a publisher changes a feed URL, replace the configuration value rather than redesigning the app.
- Facilitator should recheck the three feeds shortly before the workshop and keep one fallback feed available.

---

# 5. Required Product Layout

Keep the page conceptually simple.

## A. Header

- **AI News Briefing**
- one short subtitle

## B. News Radar section

Controls:

- **Load Latest News** button
- keyword/topic filter

Results:

- combined article cards from the three RSS sources
- source label
- title
- date where available
- RSS description/summary where available
- **Read Original Article** link opening a new tab
- **Deep Read** button

## C. Deep Read result panel

Use **one shared Deep Read panel** immediately below the News Radar controls and above the article list.

When the user chooses Deep Read:

- show which article is being retrieved;
- show loading state;
- replace the panel with the retrieved result;
- show one result at a time.

This is simpler than keeping separate Firecrawl state inside every article card.

## D. Web Explorer section

Place this **below the RSS news results** so students can clearly see that it is a second information-acquisition method.

Controls:

- label: **Explore Any Web Page**
- URL input
- **Scrape Page** button

Result appears **directly below the URL form**, not mixed into the RSS feed.

Defined result:

- page title if available;
- domain/source;
- original URL;
- page description/metadata if available;
- limited clean-text/markdown excerpt;
- **Open Original Page** link.

The Web Explorer is intentionally a **single-page scrape**, not a whole-site crawl.

---

# 6. Technical Architecture — Written Version

Codex should implement five simple responsibilities.

## A. Frontend

Responsible for:

- layout;
- buttons and inputs;
- combined RSS cards;
- keyword filter;
- original-source links;
- Deep Read panel;
- Web Explorer form/result;
- loading, empty and error states;
- responsive presentation.

The frontend must never contain the Firecrawl API key.

## B. RSS backend route

Recommended route: `/api/news`

Responsible for:

- fetching all three approved feeds;
- parsing XML;
- normalizing entries;
- combining results;
- sorting newest first where dates exist;
- limiting the total result volume;
- returning JSON.

## C. Shared Firecrawl scrape backend route

Recommended route: `/api/scrape`

Responsible for:

- accepting exactly one valid `http://` or `https://` URL;
- rejecting invalid/non-web URL schemes;
- reading `FIRECRAWL_API_KEY` server-side;
- calling Firecrawl **Scrape** for one page;
- requesting clean page content/metadata;
- returning a deliberately limited normalized result;
- returning readable errors;
- never exposing the API key.

**Important optimization:** both **Deep Read** and **Web Explorer** should reuse this same backend route. Phase 2 therefore adds mostly interface behavior rather than another integration.

## D. Git/GitHub layer

Responsible for:

- stable checkpoints after each phase;
- online repository;
- clear commit history.

## E. Vercel layer

Responsible for:

- public site;
- serverless API routes;
- `FIRECRAWL_API_KEY` environment variable;
- automatic redeployment after later GitHub pushes.

---

# 7. Approved Stack

Use the engineer-approved simple stack:

- **HTML** — page structure
- **CSS** — visual layout / responsive behavior
- **JavaScript** — frontend interaction
- **Vercel serverless API routes** — backend logic
- **fast-xml-parser** — RSS/XML parsing
- **Firecrawl Scrape API** — single-page retrieval
- **Git + GitHub** — version checkpoints / repository
- **Vercel** — public deployment

Codex may add only the minimum packages required by this stack.

Do not replace the stack with another framework unless the facilitator explicitly approves it.

---

# 8. Normalized Data Shapes

## RSS article

```js
{
  id: "stable-id",
  source: "WIRED",
  title: "Article title",
  url: "https://...",
  publishedAt: "ISO date or empty string",
  summary: "RSS summary or empty string"
}
```

## Firecrawl page result

```js
{
  title: "Page title or fallback",
  domain: "example.com",
  url: "https://...",
  description: "Metadata description or empty string",
  content: "Limited cleaned text/markdown excerpt"
}
```

Keep these structures simple and stable across phases.

---

# 9. Build Phases

Codex receives this whole document, but must build **only the phase explicitly requested**.

---

## PHASE 0 — Deployment Smoke Test

### Why this exists

Before introducing RSS, APIs or Firecrawl, prove that the complete build pipeline works:

**Codex -> local files -> Git -> GitHub -> Vercel -> public browser**

This should take only a few minutes and removes deployment uncertainty before the technical lesson begins.

### Build

Create an intentionally simple static page using only HTML/CSS.

Suggested content:

**Breaking News: Your Website Exists.**

Small line:

**Codex -> GitHub -> Vercel: ALIVE**

Make it visually fun but trivial. No package, API, backend or Firecrawl is needed.

### Acceptance criteria

1. Static page opens locally.
2. No console/build error.
3. Git checkpoint created.
4. Checkpoint pushed to GitHub.
5. Vercel displays the page at a public URL.
6. Another browser can open that URL.

### Suggested commit

`Phase 0 - deployment smoke test`

### STOP GATE

Do not start Phase 1 until the public page is visible.

---

## PHASE 1 — Three RSS Feeds + Filter + Deep Read

### Goal

Build the useful news product and introduce both **RSS discovery** and **Firecrawl extraction** in one controlled phase.

### Required RSS behavior

- load all three prepared feeds;
- parse each feed server-side;
- normalize items into one structure;
- combine the sources;
- sort newest first where possible;
- return a manageable set (target approximately 5-6 items per source / maximum about 18 total);
- display source labels;
- filter the already-loaded cards locally using title + RSS summary;
- clearing the filter restores the loaded set;
- original article opens in a new tab.

### Required Deep Read behavior

Each card has **Deep Read**.

When clicked:

1. frontend sends that article URL to `/api/scrape`;
2. backend calls Firecrawl Scrape;
3. shared Deep Read panel shows loading state;
4. result panel displays title/source + limited clean content excerpt;
5. original link remains available;
6. only one Deep Read result is shown at a time.

### Firecrawl limits

- one URL per user action;
- do not automatically scrape all RSS articles;
- do not crawl subpages;
- do not follow chains of links;
- limit displayed content to a useful excerpt rather than the whole page.

### Security

- `FIRECRAWL_API_KEY` only server-side;
- local key in `.env.local`;
- `.env.local` ignored by Git;
- Vercel key in Environment Variables;
- never return/log the key.

### Acceptance criteria

1. Phase 0 deployment pipeline remains intact.
2. Three RSS feeds are requested server-side.
3. Current items from all available feeds can appear.
4. Source labels are correct.
5. Combined results are readable and date-sorted where possible.
6. Keyword filter works locally.
7. Original links open new tabs.
8. Deep Read scrapes only the selected article.
9. Deep Read result appears in the shared result panel.
10. Missing/broken RSS source produces a readable partial/failure state rather than a blank page.
11. Firecrawl error produces a readable retryable message.
12. API key is not exposed to the browser or Git.
13. Production build passes.

### Suggested commit

`Phase 1 - multi RSS filter and deep read`

### STOP GATE

Codex reports files changed, packages added, tests performed and acceptance results, then stops.

---

## PHASE 2 — Web Explorer: User-Entered URL Scraping

### Goal

Demonstrate what Firecrawl adds when a useful webpage does **not** provide the prepared RSS discovery path.

### Required behavior

Add the **Explore Any Web Page** section below the RSS results.

User flow:

1. student enters one public webpage URL;
2. presses **Scrape Page**;
3. frontend validates that a value is present;
4. backend validates an `http://` or `https://` URL;
5. reuse the existing `/api/scrape` route;
6. Firecrawl retrieves the page;
7. result appears directly below the Web Explorer form.

### Defined output

Display:

- title;
- domain;
- URL;
- metadata description when available;
- limited clean-text/markdown excerpt;
- Open Original Page link.

### Explicit limits

This phase does **not**:

- crawl the entire domain;
- follow all internal links;
- search the web;
- scrape multiple URLs automatically;
- save results;
- summarize with an LLM;
- add the scraped page into the RSS feed.

### Public endpoint caution

A public scrape button can consume Firecrawl usage.

For the workshop:

- one URL per click;
- no automatic/batch scrape;
- keep output limited;
- use a workshop key/account with controlled usage;
- facilitator may disable/remove the public scrape feature after the exercise if desired.

### Acceptance criteria

1. Phase 1 still works.
2. Valid public URL can be entered.
3. Invalid URL receives a readable message.
4. Web Explorer reuses the existing backend scrape integration.
5. Result stays visually separate from RSS news cards.
6. Returned title/URL/content are readable.
7. Original page link works.
8. Firecrawl key remains server-side.
9. Failed scrape does not break the RSS section.
10. Production build passes.

### Suggested commit

`Phase 2 - web explorer scrape`

### STOP GATE

Stop after passing the acceptance tests.

---

## PHASE 3 — Responsive / Reliability Polish

### Goal

Improve usability without adding a new technology.

### Improvements

- responsive laptop/mobile layout;
- clean hierarchy between News Radar, Deep Read and Web Explorer;
- readable spacing/typography;
- disabled/loading buttons during requests;
- clear empty state such as **No matching stories**;
- readable partial-feed/error messages;
- basic accessibility labels/focus behavior;
- no heavy animation or redesign.

### Acceptance criteria

1. News Radar remains functional.
2. Deep Read remains functional.
3. Web Explorer remains functional.
4. Laptop layout is clean.
5. Phone layout is usable.
6. Loading/empty/error states make sense without instructor explanation.
7. No secrets exposed.
8. Production build passes.

### Suggested commit

`Phase 3 - responsive and reliability polish`

---

# 10. Error Handling Rules

Handle at minimum:

- one RSS feed unavailable while others work;
- all RSS feeds unavailable;
- invalid XML;
- missing summary;
- missing date;
- no keyword matches;
- missing Firecrawl API key;
- invalid user-entered URL;
- Firecrawl unavailable;
- page cannot be scraped;
- backend non-200 response.

The application should never fail into a blank page.

---

# 11. Explicitly Out of Scope for Day 1

Do not add:

- database;
- login/auth;
- user profiles;
- persistent history;
- payments;
- scheduled jobs;
- vector database;
- embeddings/RAG;
- LLM analysis/summarization;
- chat interface;
- agent framework;
- autonomous browsing loop;
- whole-domain Firecrawl Crawl;
- batch scraping;
- arbitrary extra APIs;
- file uploads;
- analytics stack;
- elaborate animation;
- framework migration.

These are later-learning opportunities.

---

# 12. Codex Operating Instructions

For every phase:

## Before editing

1. Read this entire specification.
2. Confirm the named file is present.
3. Confirm the requested phase.
4. Inspect the current repository/tree.
5. State the smallest set of files expected to change.
6. Preserve passed behavior from earlier phases.

## While editing

- implement only the current phase;
- prefer simple direct code;
- reuse working routes/components/functions;
- add minimum dependencies;
- do not rewrite unrelated files;
- do not introduce future-phase features;
- keep secrets server-side;
- avoid speculative abstraction;
- keep output volume small enough for reliable classroom use.

## If something fails

1. reproduce one observable symptom;
2. identify the smallest likely cause;
3. change one thing;
4. retest;
5. do not redesign the app while debugging.

## After editing

Codex should itself:

1. install required dependency if needed;
2. run locally;
3. run production/build validation;
4. test the phase acceptance criteria;
5. fix observable errors one at a time;
6. report changed files / dependency / tests / unresolved issues;
7. stop at the phase gate.

Students should not need to type routine terminal commands manually.

---

# 13. Git and Vercel Rules

After each working phase:

1. create a meaningful Git checkpoint;
2. push to GitHub;
3. wait for Vercel redeployment;
4. test the **public URL**, not only localhost;
5. do not begin the next phase until the public version passes.

The first GitHub-to-Vercel import is a one-time setup. Later GitHub pushes should redeploy automatically.

---

# 14. Definition of Done — Day 1

Another student should be able to open the public URL without coaching and:

1. load recent news from three RSS sources;
2. filter by a topic;
3. open original stories;
4. Deep Read one selected story;
5. enter another webpage URL and scrape it;
6. understand that the RSS and Web Explorer results came through different acquisition paths;
7. use the page without confusing loading/error behavior.

The goal is **a simple, working information-retrieval product whose architecture students can explain**.

---

# 15. Later Direction — Not for This Build

Later modules can add:

- LLM summarization / comparison;
- relevance scoring;
- source-grounded questions;
- chat interface;
- Firecrawl Search/Crawl where justified;
- tool choice;
- an agentic decision loop.

Those features should come only after students understand the fixed workflow they built on Day 1.

