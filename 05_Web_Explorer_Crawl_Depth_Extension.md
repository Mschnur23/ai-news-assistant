# Web Explorer — Crawl Depth Extension

**Purpose:** Extend the existing single-URL Web Explorer so students can see the difference between **scraping one page** and **crawling through a website**.

---

## 1. Current Behavior

The current project intentionally uses Firecrawl **Scrape** on exactly one entered URL.

That means:

- it reads the current page only;
- it does not automatically open every link;
- it does not inspect deeper levels of the site;
- Deep Read also retrieves only the selected article page.

This extension adds a controlled whole-site exploration option.

---

## 2. New UI Control

Next to the Web Explorer URL input, add a dropdown:

**Explore Depth**

Options:

- **0 — This page only**
- **1 — This page + links on it**
- **2 — Two link levels**
- **3 — Three link levels**

Keep one primary button:

**Explore Site**

Student-facing metaphor:

> Depth is how many rounds of internal links the crawler is allowed to follow.

---

## 3. Exact Meaning of Each Depth

### Depth 0

Use Firecrawl **Scrape**.

Retrieve only the entered URL.

### Depth 1

Use Firecrawl **Crawl**.

Retrieve:

- the entered URL;
- eligible internal pages linked directly from it.

### Depth 2

Retrieve:

- level 0;
- level 1 pages;
- eligible internal pages discovered from level 1.

### Depth 3

Repeat one additional internal-link discovery level.

**Important:** this does not mean literally every link without limit. Crawls can grow exponentially, so the classroom build must enforce a total-page cap.

---

## 4. Firecrawl Crawl Configuration

For depth 1–3 use Firecrawl Crawl with:

```text
maxDiscoveryDepth = selected dropdown value
sitemap = "skip"
crawlEntireDomain = true
allowExternalLinks = false
allowSubdomains = false
ignoreQueryParameters = true
limit = 25
```

Use clean/main content for each retrieved page.

### Why `sitemap = "skip"`

Firecrawl can treat sitemap-discovered pages as discovery depth 0. That would make a classroom dropdown labelled 0/1/2/3 confusing.

Skipping the sitemap makes the levels behave much more like the student's intuitive model:

`starting page → links → links from those pages → next level`

### Why `limit = 25`

Depth and page count are different controls.

A single page may contain hundreds of links. A hard page cap prevents:

- runaway Firecrawl usage;
- long classroom waits;
- huge result payloads;
- accidental crawling of a very large site.

If 25 pages are reached before the selected depth is exhausted, stop at 25 and tell the user the cap was reached.

---

## 5. Same-Domain Rule

Follow **internal links only**.

Do not follow:

- external domains;
- login pages where avoidable;
- mailto/tel links;
- file downloads unless explicitly supported later;
- localhost/private-network addresses.

Subdomains remain excluded for this workshop.

---

## 6. Backend Design

Keep Depth 0 on the existing:

`POST /api/scrape`

For Depth 1–3 add a crawl flow.

Recommended routes:

- `POST /api/crawl` — starts a Firecrawl crawl and returns a crawl/job ID.
- `GET /api/crawl/status?id=...` — checks progress and returns results when complete.

This is preferable to keeping one server request open for a long multi-page crawl.

All Firecrawl credentials remain server-side.

---

## 7. Loading / Progress UX

For Depth 0:

`Reading page...`

For Depth 1–3:

Show a visible status such as:

- `Starting crawl...`
- `Exploring site...`
- `12 pages retrieved...`
- `Completed: 18 pages`

If the 25-page cap is reached:

`Stopped at the 25-page classroom limit.`

Do not leave the user staring at an unexplained spinner.

---

## 8. Result Area

Keep results directly underneath Web Explorer.

### Depth 0 result

Keep the existing single-page result:

- title;
- domain;
- URL;
- description/metadata;
- clean excerpt;
- Open Original Page.

### Depth 1–3 result

Show a compact summary header:

**Site Exploration Result**

- starting URL;
- selected depth;
- pages retrieved;
- whether page cap was reached.

Then show one compact card per retrieved page:

- page title;
- URL;
- short clean excerpt;
- Open Page.

Do not render full raw markdown for every page.

---

## 9. Explicit Limits

This extension does **not**:

- follow external websites;
- bypass access controls;
- ignore robots.txt;
- crawl more than 25 pages;
- crawl indefinitely;
- save crawled pages to a database;
- automatically summarize all pages with an LLM;
- automatically decide what site to crawl;
- turn crawling into an autonomous agent.

---

## 10. Acceptance Criteria

1. Web Explorer has a 0/1/2/3 depth dropdown.
2. Depth 0 preserves the existing single-page scrape behavior.
3. Depth 1–3 use Firecrawl Crawl rather than manually coding recursive fetches.
4. Sitemap discovery is skipped so depth matches link-hop expectations.
5. External links are not followed.
6. Subdomains are not followed.
7. Maximum 25 pages are retrieved per crawl.
8. Crawl progress is visible.
9. Results show page titles, URLs and short clean excerpts.
10. Firecrawl key stays server-side.
11. Failed crawl does not break RSS/Deep Read.
12. Existing Web Explorer single-page functionality still works.
13. Production build passes.

---

## 11. Codex Implementation Instruction

Implement this as an extension of the existing Web Explorer.

Before changing code:

1. inspect the current Firecrawl integration;
2. preserve `/api/scrape` for depth 0;
3. use Firecrawl's Crawl capability for depth 1–3;
4. do not write a custom recursive crawler;
5. preserve RSS, Deep Read and existing page styling.

During implementation:

- add the depth dropdown;
- add only the routes/components needed for crawl start/status/results;
- enforce the 25-page cap server-side;
- use `sitemap: "skip"`;
- keep external links and subdomains disabled;
- keep the API key server-side;
- show partial/readable failure states;
- do not add a database or LLM analysis.

After implementation:

1. test depth 0, 1, 2 and 3 on a small public site;
2. verify page counts never exceed 25;
3. test one failing URL;
4. run typecheck/build;
5. verify RSS and Deep Read still work;
6. report files changed and acceptance results;
7. stop.

---

## 12. Definition of Done

Students can enter one public URL and choose how far the software explores:

> **0 = read this page; 1–3 = progressively follow internal links, within a safe page cap.**

The lesson becomes visible:

> **Scrape reads a page. Crawl discovers and reads a site.**
