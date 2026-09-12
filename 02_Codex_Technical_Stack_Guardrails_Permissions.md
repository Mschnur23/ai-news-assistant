Codex Technical Stack, Guardrails & Permissions

**Project:** AI News Assistant  
**Audience:** Codex + facilitators; readable by non-technical students  
**Purpose:** Keep every lock-step build technically consistent, secure and simple enough to troubleshoot in class.

---

# 1. Core Build Philosophy

The class optimizes for:

1. one common stack;
2. one common repository pattern;
3. natural-language instructions to Codex;
4. minimal manual terminal use;
5. small observable phases;
6. reuse rather than rewrites;
7. least-privilege permissions;
8. public acceptance testing after each checkpoint.

Codex handles routine commands. Students focus on **intent, inspection, testing and judgment**.

---

# 2. Approved Stack

Use:

- HTML
- CSS
- browser JavaScript
- Vercel serverless API routes
- `fast-xml-parser`
- Firecrawl **Scrape** API for one URL at a time
- Git + GitHub
- Vercel

### Why this stack

It exposes frontend/backend/API concepts without introducing a large web framework.

Do **not** migrate to React/Next.js/Vue/etc. unless the facilitator changes the workshop design.

---

# 3. Phase Map

## Phase 0 — deployment smoke test

Frontend only:

- `index.html`
- `style.css`

No API. No package. No backend.

Purpose: prove Codex -> GitHub -> Vercel works before adding dependencies.

## Phase 1 — multi-RSS + filter + Firecrawl Deep Read

Adds:

- frontend JavaScript;
- RSS backend route;
- XML parser;
- shared Firecrawl scrape backend route;
- environment variable.

## Phase 2 — user-entered Web Explorer

Reuses the **same Firecrawl scrape route**.

Only the UI and validation path should expand substantially.

## Phase 3 — responsive/reliability polish

No new external technology.

---

# 4. Frontend vs Backend Responsibilities

## Frontend may do

- render UI;
- receive user clicks/text;
- filter already-loaded articles;
- call same-origin API routes;
- display results and errors;
- open original links in new tabs.

## Frontend must not do

- contain Firecrawl secret;
- call Firecrawl directly with a secret;
- fetch arbitrary sites directly;
- parse raw RSS if the backend already owns that responsibility;
- store credentials.

## Backend may do

- fetch RSS feeds;
- parse/normalize XML;
- call Firecrawl;
- validate URLs;
- read environment variables;
- limit returned payloads;
- return structured JSON/errors.

---

# 5. Approved RSS Sources

Use exactly these prepared feeds in Phase 1 unless facilitator substitutes one before class:

```text
WIRED AI
https://www.wired.com/feed/tag/ai/latest/rss

TechCrunch AI
https://techcrunch.com/category/artificial-intelligence/feed/

VentureBeat AI
https://venturebeat.com/category/ai/feed/
```

### RSS rules

- Fetch server-side.
- Parse XML with `fast-xml-parser`.
- Keep source configuration together.
- Normalize all feeds into the same article object.
- Target about 5-6 items/source; keep total roughly <=18.
- Combine/sort by date where possible.
- Do not use Firecrawl to parse RSS XML.
- A failure in one source should not necessarily destroy valid results from the others.

---

# 6. Shared API Route Design

Keep the backend easy to explain.

## `/api/news`

Role:

```text
Browser
  -> /api/news
  -> backend fetches 3 RSS feeds
  -> parse + normalize + combine
  -> JSON articles
  -> browser renders cards
```

## `/api/scrape`

Role:

```text
Browser sends one URL
  -> /api/scrape
  -> backend validates URL
  -> backend reads FIRECRAWL_API_KEY
  -> Firecrawl Scrape
  -> normalized page result
  -> browser displays result
```

**Reuse `/api/scrape` for both:**

- RSS article **Deep Read**;
- user-entered **Web Explorer**.

This reuse is deliberate: fewer integrations = fewer classroom bugs.

---

# 7. Firecrawl Rules

Use **Scrape**, not Crawl, for Day 1.

### Why

Scrape demonstrates retrieval from a normal webpage with one predictable request. Whole-site crawl introduces discovery depth, page limits, job state and greater cost/latency.

### Allowed

- one public `http://` or `https://` page per user action;
- clean content/markdown;
- basic metadata such as title/description/source URL;
- limited excerpt returned to browser.

Not allowed Day 1

- whole-domain crawl;
- batch scrape;
- automatic scrape of all RSS cards;
- autonomous link following;
- search endpoint;
- interact/browser automation endpoint;
- structured LLM extraction;
- screenshots/images unless facilitator explicitly adds them.

### URL validation

Backend should:

- require a URL;
- accept only `http`/`https`;
- reject obviously invalid/non-web values;
- return a readable 400-style error rather than crash.

### Public-use caution

The Web Explorer can consume Firecrawl usage if strangers use the public URL.

For class:

- one page/click;
- no background scrape;
- no batching;
- controlled workshop account/key;
- facilitator can remove/disable the public scrape feature after teaching if desired.

---

# 8. Defined Firecrawl Output

Normalize the page response to something like:

```js
{
  title: "Page title",
  domain: "example.com",
  url: "https://example.com/page",
  description: "Metadata description",
  content: "Limited clean excerpt"
}
```

Do not send the entire raw Firecrawl response to the frontend.

Benefits:

- easier student explanation;
- smaller payload;
- less accidental complexity;
- same display structure for Deep Read and Web Explorer.

---

# 9. Secret / Environment Variable Rules

Use:

`FIRECRAWL_API_KEY`

### Local

Store in `.env.local` or equivalent server-side local environment mechanism.

### Git

Secret file must be ignored.

Codex should inspect for obvious secret leakage before commit.

### Vercel

Add the key manually in:

**Project Settings -> Environment Variables**

Redeploy if required.

### Never

- hard-code key;
- place key in frontend JS;
- include key in screenshots/README;
- log full key;
- return key in JSON;
- commit local environment file.

---

# 10. Inclusion List by Phase

## Phase 0

Allowed:

- static HTML/CSS;
- tiny visual joke/message;
- Git/GitHub/Vercel publication.

Not allowed:

- package install;
- API;
- RSS;
- Firecrawl.

## Phase 1

Allowed:

- frontend JS;
- 3 prepared feeds;
- `fast-xml-parser`;
- `/api/news`;
- filter;
- new-tab source links;
- `/api/scrape`;
- Firecrawl Deep Read;
- Firecrawl environment variable.

## Phase 2

Allowed:

- URL form;
- URL validation;
- reuse `/api/scrape`;
- dedicated Web Explorer result area.

## Phase 3

Allowed:

- responsive CSS;
- basic accessibility;
- clearer errors/states;
- low-risk visual refinement.

---

# 11. Global Exclusion List

Do not introduce unless a later workshop explicitly asks for it:

- database;
- auth/login;
- user profiles;
- persistent storage;
- payments;
- scheduled jobs;
- queues;
- vector database;
- embeddings;
- RAG;
- LLM calls;
- chatbot;
- agent framework;
- multi-agent logic;
- whole-site Firecrawl crawl;
- Firecrawl search/interact;
- arbitrary additional APIs;
- email/Telegram/WeChat;
- analytics stack;
- Docker;
- custom CI/CD;
- framework migration;
- elaborate design system.

If Codex believes an excluded component is required, it must **stop and explain why** rather than add it.

---

# 12. Codex Operating Rules

## Before coding

Codex must:

1. confirm it sees the named master specification;
2. state the requested phase;
3. inspect existing files;
4. preserve prior passed behavior;
5. state the smallest expected file changes.

## While coding

Codex should:

- prefer direct readable code;
- reuse existing working functions/routes;
- minimize dependencies;
- avoid speculative abstractions;
- avoid renaming working files;
- avoid large rewrites;
- avoid adding later-phase features;
- keep server secrets server-side;
- keep network payloads small.

## Debugging

Use:

**observe -> reproduce -> change one thing -> retest**

Do not respond to one error by redesigning the whole project.

## After coding

Codex should:

- run the site;
- run available build validation;
- execute acceptance tests;
- fix concrete errors;
- report changed files/dependencies/tests;
- stop at the gate.

Students should not be asked to type routine package/Git commands unless troubleshooting requires visibility.

---

# 13. Natural-Language-First Student Instructions

Prefer:

> Run the project locally and tell me the URL.

instead of teaching a command first.

Prefer:

> Create a Git checkpoint for the working Phase 1 build and push it to GitHub.

instead of requiring students to type a sequence of Git commands.

Prefer:

> Test the public Vercel version against the Phase 1 acceptance criteria.

instead of making the student manually inspect infrastructure details.

Commands may appear in facilitator troubleshooting material, not as the primary learning path.

---

# 14. Git / GitHub / Vercel Rules

## Phase 0

Use the first deployment as a **smoke test** of the publishing chain.

Recommended page text:

> **Breaking News: Your Website Exists.**

## Later phases

After a phase passes:

1. create clear Git checkpoint;
2. push to GitHub;
3. Vercel auto-redeploys;
4. test the stable public URL;
5. continue only when public behavior passes.

Do not repeat the first-time Vercel import each phase.

---

# 15. Permission Principles

Use least privilege.

| Permission type | Preferred scope | Reason |
|---|---|---|
| Localhost browser access | Allow once | One local test origin |
| Project folder edit | Allow once / task scope | Needed for current build |
| Internet/package/feed access | Allow once | Current network task |
| `.git` metadata | Allow once | Current repo checkpoint |
| GitHub Desktop Computer Use | Allow this conversation | Several actions during one publish session |
| Browser Computer Use | Allow this conversation | Several GitHub/Vercel actions during one session |
| Screen/accessibility | Only when required on trusted machine | Broad system visibility/control |
| Vercel GitHub App | Only selected workshop repository | Limits repository blast radius |

### General rule

- **Allow once:** default for one-off access.
- **Allow this conversation:** useful where repeated GUI control is expected during the supervised session.
- **Always allow:** avoid by default in the workshop.

Close unrelated sensitive windows before granting screen access.

---

# 16. Failure Recovery Order

If a student falls behind:

1. identify one symptom;
2. ask Codex to reproduce it;
3. make one targeted fix;
4. restore last good Git checkpoint if needed;
5. use facilitator recovery branch/files if needed;
6. reduce polish before reducing the learning objective.

Do not let one student spend 30 minutes debugging a non-essential implementation choice.

---

# 17. Facilitator Preflight

Before class:

- verify three RSS feed URLs;
- verify Firecrawl key/account and available usage;
- test one Deep Read URL from each RSS source;
- test one arbitrary public URL in Web Explorer;
- verify `.env` is ignored;
- verify Vercel environment variable flow;
- test the Phase 0 GitHub/Vercel deployment route;
- keep a working checkpoint for each phase;
- keep one fallback RSS feed ready.

