# Junior Job Scout — Firecrawl Multi-URL Extension

**Placement:** Add directly below the existing Web Explorer section.

**Teaching purpose:** Show that scraping becomes valuable when software can turn several different webpages into one comparable decision view.

---

## 1. Feature Goal

Add a section titled **Junior Job Scout**.

The student can paste **1–5 public job-listing URLs** and press:

**Find Junior Opportunities**

The application then:

1. validates the URLs;
2. scrapes each supplied page server-side with Firecrawl;
3. extracts visible job listings into one common structure;
4. merges jobs from all successful sources;
5. ranks the strongest junior / graduate opportunities;
6. displays up to **5 recommended roles**;
7. gives exactly **3 evidence-based bullets** explaining why each role is promising;
8. keeps a link to the original job posting whenever available.

This is a **general early-career ranking**, not personalized career advice.

---

## 2. Suggested Classroom Sources

Use public job pages that do not require sign-in. Pre-test them shortly before class because site structure and anti-bot behavior can change.

Suggested candidates:

1. UK Government — Find a job  
   `https://findajob.dwp.gov.uk/search?lang_code=en`

2. Government of Canada — Job Bank  
   `https://www.jobbank.gc.ca/jobsearch/`

3. USAJOBS — U.S. Federal Government jobs  
   `https://www.usajobs.gov/Search`

4. New Zealand Government Jobs  
   `https://jobs.govt.nz/jobtools/jncustomsearch.searchResults?in_jobDate=All&in_orderby=dateinput+desc&in_organid=16563`

5. Ireland Public Jobs  
   `https://publicjobs.ie/en/`

Do **not** use LinkedIn, Indeed or other platforms that require login or create avoidable anti-bot/access-control friction for this exercise.

---

## 3. User Interface

Under Web Explorer add:

### Junior Job Scout

Short description:

> Paste up to 5 public job-listing pages. We will compare visible roles and surface promising early-career opportunities.

Show five compact URL fields:

- Job Source 1 URL
- Job Source 2 URL
- Job Source 3 URL
- Job Source 4 URL
- Job Source 5 URL

Only the first is required.

Buttons:

- **Find Junior Opportunities**
- optional **Clear Results**

Show a small per-source status:

- Waiting
- Scanning
- Extracted
- No jobs found
- Could not extract

One failed source must not cancel the others.

---

## 4. Results Area

Create one dedicated panel directly below the five URL fields:

# Top 5 Junior Opportunities

Do **not** show five raw scrape boxes.

Each ranked card shows:

- rank `#1` to `#5`;
- job title;
- employer / organization if available;
- location if available;
- source domain;
- employment type if available;
- publication date if available;
- **Open Job Posting** link;
- exactly **3 concise explanation bullets**.

The raw scraped content stays behind the scenes.

---

## 5. Ranking Criteria

Rank **general early-career opportunity quality** using:

| Criterion | Weight |
|---|---:|
| Early-career accessibility | 40% |
| Transferable skill development | 30% |
| Future-relevant exposure | 20% |
| Learning environment | 10% |

### Early-career positive signals

- junior
- graduate
- entry-level
- trainee
- internship
- assistant
- associate
- coordinator
- analyst
- 0–2 years experience
- no prior experience required

### Seniority warnings

Strongly penalize clear signals such as:

- senior
- lead
- principal
- head
- director
- executive
- 5+ years experience

---

## 6. Required 3-Bullet Explanation

Every displayed role uses these three headings:

1. **Accessible start** — why the listing appears realistic for a student / recent graduate.
2. **Skills you can build** — transferable capabilities evidenced by the listing.
3. **Career exposure** — future-relevant domain, responsibility or learning exposure evidenced by the listing.

Example:

**Junior Data Analyst — Example Agency**

- **Accessible start:** The posting targets graduates and asks for 0–2 years of experience.
- **Skills you can build:** Combines data analysis, presentation and stakeholder communication.
- **Career exposure:** Provides experience with digital services and data-driven decision making.

Do not invent evidence that is not present in the scraped content.

---

## 7. Backend Route

Create:

`POST /api/jobs/scan`

Example request:

```json
{
  "urls": [
    "https://example.gov/jobs",
    "https://example2.gov/jobs"
  ]
}
```

Rules:

- minimum 1 URL;
- maximum 5 URLs;
- HTTP/HTTPS only;
- remove duplicates;
- reject malformed URLs;
- reject localhost/private-network/internal addresses;
- keep all Firecrawl requests server-side.

---

## 8. Structured Extraction

For each supplied page, use Firecrawl to retrieve the page and extract **up to 8 visible jobs** into a common structure similar to:

```ts
type ExtractedJob = {
  title: string;
  employer: string;
  location: string;
  jobUrl: string;
  postedDate: string;
  employmentType: string;
  description: string;
  juniorEvidence: string[];
  transferableSkills: string[];
  futureRelevantSignals: string[];
  learningSignals: string[];
  seniorityWarnings: string[];
};
```

If a field is unavailable, return an empty string or array rather than inventing a value.

Use clean/main content where supported. Prefer structured JSON extraction over displaying raw markdown.

---

## 9. Extraction Instruction

Use a tightly scoped extraction instruction similar to:

> Extract up to 8 job opportunities visibly listed on this page. Focus on actual job postings, not navigation or promotional content. For each job return title, employer, location, direct job URL if visible, date, employment type, a short factual description, evidence that it is junior/graduate/entry-level, transferable skills, future-relevant technology/digital/data/policy/innovation signals, learning/training signals, and any evidence that the role is actually senior. Do not infer unsupported facts.

---

## 10. Scope Controls

This extension does **not**:

- log into job platforms;
- bypass access controls;
- scrape LinkedIn;
- crawl an entire employment site;
- follow pagination across hundreds of listings;
- submit applications;
- save user accounts;
- upload CVs;
- personalize recommendations to a specific student;
- create a database;
- run scheduled scans;
- send alerts.

It only analyzes content available from the **exact pages supplied**.

---

## 11. Failure Handling

- One source fails → continue with the others.
- No jobs found → show `No usable job listings were found on this page.`
- Fewer than five qualifying jobs → show only those found.
- Poor extraction / anti-bot challenge → show `This page could not be cleanly extracted. Try another public job page.`
- All sources fail → show one readable page-level error and keep the inputs editable.

Do not invent jobs to reach five results.

---

## 12. Acceptance Criteria

Complete when:

1. Junior Job Scout appears below Web Explorer.
2. User can enter 1–5 URLs.
3. Invalid URLs fail cleanly.
4. Firecrawl remains server-side.
5. API key never appears in frontend or Git.
6. Successful pages produce structured job data.
7. One failed page does not cancel the others.
8. Jobs are merged across sources.
9. Clearly senior roles are deprioritized.
10. Up to five recommended roles appear.
11. Each displayed role has exactly three evidence-based bullets.
12. Original job links work where available.
13. Raw markdown is not the normal user-facing result.
14. Existing RSS, Deep Read and Web Explorer functionality still works.
15. Production build passes.

---

## 13. Codex Implementation Instruction

Implement this as an **additive extension** to the existing Web Explorer.

Before changing code:

1. inspect the current repository;
2. identify existing Firecrawl/server-side code that can be reused;
3. preserve all working RSS, Deep Read and Web Explorer behavior;
4. make the smallest practical change.

During implementation:

- keep the UI simple;
- reuse existing styling;
- do not add a database;
- do not add authentication;
- do not add another scraping provider;
- do not add another AI API solely for this feature;
- keep URL fetching server-side;
- maximum 5 source URLs;
- maximum 8 extracted jobs per source;
- handle partial failures.

After implementation:

1. run typecheck/build;
2. test one URL, five URLs, one broken URL among valid URLs, and a page containing senior roles;
3. verify existing features still work;
4. report files changed, route added, dependencies added and acceptance results;
5. stop.

---

## 14. Definition of Done

A student can paste up to five public job-listing pages and receive one ranked panel containing up to five promising junior opportunities, each supported by three clear reasons.

> **A browser lets you visit five job sites. Scraping lets your software turn five different websites into one comparable decision view.**
