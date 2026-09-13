const loadButton = document.querySelector('#load-news');
const keyword = document.querySelector('#keyword');
const articlesElement = document.querySelector('#articles');
const status = document.querySelector('#news-status');
const warning = document.querySelector('#news-warning');
const deepPanel = document.querySelector('#deep-read');
const deepResult = document.querySelector('#deep-result');
const deepStatus = document.querySelector('#deep-status');
let articles = [];
let hasLoaded = false;
let loadingNews = false;
let loadingDeep = false;
let newsFailed = false;

async function requestJSON(path, options = {}) {
  const response = await fetch(path, { ...options, signal: AbortSignal.timeout(path === '/api/news' ? 18000 : 45000) });
  if (!response.ok) {
    const error = new Error('Request failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
}
function scrapeError(error) {
  if (error.status === 400) return 'Enter a public http:// or https:// page URL. Local addresses and URLs containing credentials are not supported.';
  if (error.status === 503) return 'Scraping is not configured. Ask the site owner to check the server-side Firecrawl key.';
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'The page took too long to respond. Please try again.';
  return 'This page could not be retrieved. Please try again or open the original page.';
}
function updateDeepButtons() {
  for (const button of articlesElement.querySelectorAll('button')) button.disabled = loadingDeep;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function originalLink(url, label = 'Read Original Article') {
  const link = element('a', label);
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `${label} (opens in a new tab)`);
  return link;
}
function renderArticles() {
  const term = keyword.value.trim().toLowerCase();
  const matches = articles.filter((article) => `${article.title} ${article.summary}`.toLowerCase().includes(term));
  articlesElement.replaceChildren();
  for (const article of matches) {
    const card = document.createElement('article');
    card.append(element('p', `${article.source} · RSS${article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString()}` : ''}`, 'metadata'), element('h3', article.title));
    if (article.summary) card.append(element('p', article.summary));
    const actions = element('div', '', 'actions');
    const button = element('button', 'Deep Read');
    button.type = 'button';
    button.setAttribute('aria-label', `Deep Read: ${article.title}`);
    button.disabled = loadingDeep;
    button.addEventListener('click', () => deepRead(article));
    actions.append(originalLink(article.url), button);
    card.append(actions);
    articlesElement.append(card);
  }
  if (newsFailed && !loadingNews) {
    status.textContent = articles.length ? `Refresh failed. Showing ${matches.length} of ${articles.length} previously loaded stories.` : 'No news loaded. Select Load Latest News to try again.';
    return;
  }
  if (hasLoaded && !loadingNews) status.textContent = matches.length ? `${matches.length} of ${articles.length} stories shown.` : term && articles.length ? 'No matching stories. Try another keyword or clear the filter.' : 'No stories available. Try loading news again.';
}
loadButton.addEventListener('click', async () => {
  if (loadingNews) return;
  loadingNews = true;
  articlesElement.setAttribute('aria-busy', 'true');
  loadButton.disabled = true;
  loadButton.textContent = 'Loading news…';
  status.textContent = 'Loading the three RSS feeds…';
  warning.textContent = '';
  try {
    const data = await requestJSON('/api/news');
    if (!Array.isArray(data.articles) || !Array.isArray(data.warnings)) throw new Error('Invalid response');
    newsFailed = false;
    articles = data.articles;
    hasLoaded = true;
    warning.textContent = data.warnings.join(' ');
  } catch (error) {
    newsFailed = true;
    warning.textContent = 'News could not be refreshed. Check your connection and try Load Latest News again.';
  } finally {
    loadingNews = false;
    articlesElement.setAttribute('aria-busy', 'false');
    loadButton.disabled = false;
    loadButton.textContent = 'Load Latest News';
    renderArticles();
  }
});
keyword.addEventListener('input', renderArticles);

async function deepRead(article) {
  if (loadingDeep) return;
  loadingDeep = true;
  deepPanel.hidden = false;
  deepStatus.textContent = `Retrieving “${article.title}”…`;
  deepResult.replaceChildren();
  deepResult.setAttribute('aria-busy', 'true');
  deepPanel.focus();
  updateDeepButtons();
  try {
    const data = await requestJSON('/api/scrape', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: article.url }),
    });
    if (typeof data.content !== 'string' || !data.content.trim()) throw new Error('Empty response');
    deepStatus.textContent = 'Article retrieved. Showing a short main-content excerpt.';
    deepResult.replaceChildren(element('h3', data.title), element('p', `${data.domain} · Firecrawl excerpt`, 'metadata'));
    if (data.description) deepResult.append(element('p', data.description));
    deepResult.append(element('p', data.content, 'excerpt'), originalLink(article.url));
  } catch (error) {
    deepStatus.textContent = scrapeError(error);
    const retry = element('button', 'Retry Deep Read');
    retry.type = 'button';
    retry.addEventListener('click', () => deepRead(article));
    deepResult.replaceChildren(element('h3', article.title), retry, originalLink(article.url));
  } finally {
    loadingDeep = false;
    deepResult.setAttribute('aria-busy', 'false');
    updateDeepButtons();
  }
}

const explorerForm = document.querySelector('#explorer-form');
const pageUrl = document.querySelector('#page-url');
const scrapeButton = document.querySelector('#scrape-page');
const explorerStatus = document.querySelector('#explorer-status');
const explorerResult = document.querySelector('#explorer-result');
let loadingExplorer = false;

explorerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (loadingExplorer) return;
  let url;
  try {
    const value = pageUrl.value.trim();
    if (!value || value.length > 2048) throw new Error();
    url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
  } catch {
    pageUrl.setAttribute('aria-invalid', 'true');
    explorerStatus.textContent = 'Enter one valid public URL starting with http:// or https://.';
    pageUrl.focus();
    return;
  }
  explorerResult.replaceChildren();
  pageUrl.removeAttribute('aria-invalid');
  loadingExplorer = true;
  scrapeButton.disabled = true;
  pageUrl.readOnly = true;
  scrapeButton.textContent = 'Scraping page…';
  explorerResult.setAttribute('aria-busy', 'true');
  explorerStatus.textContent = `Retrieving ${url.href}…`;
  try {
    const data = await requestJSON('/api/scrape', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.href }),
    });
    if (typeof data.content !== 'string' || !data.content.trim()) throw new Error('Empty response');
    explorerResult.replaceChildren(
      element('h3', data.title),
      element('p', `${data.domain} · Firecrawl excerpt`, 'metadata'),
      element('p', data.url),
    );
    if (data.description) explorerResult.append(element('p', data.description));
    explorerResult.append(element('p', data.content, 'excerpt'), originalLink(url.href, 'Open Original Page'));
    explorerStatus.textContent = 'Page retrieved. Showing a limited excerpt.';
  } catch (error) {
    explorerStatus.textContent = `${scrapeError(error)} Select Scrape Page to retry.`;
    if (error.status === 400) pageUrl.setAttribute('aria-invalid', 'true');
  } finally {
    loadingExplorer = false;
    scrapeButton.disabled = false;
    pageUrl.readOnly = false;
    scrapeButton.textContent = 'Scrape Page';
    explorerResult.setAttribute('aria-busy', 'false');
  }
});


const jobsForm = document.querySelector('#jobs-form');
const scanJobs = document.querySelector('#scan-jobs');
const jobsStatus = document.querySelector('#jobs-status');
const jobsResults = document.querySelector('#jobs-results');
const jobInputs = [1,2,3,4,5].map(i => document.querySelector(`#job-url-${i}`));
const sourceStatuses = [1,2,3,4,5].map(i => document.querySelector(`#job-source-${i}`));
let scanningJobs = false;
jobsForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (scanningJobs) return;
  const entries = [];
  jobInputs.forEach(input => input.removeAttribute('aria-invalid'));
  try {
    for (let i=0;i<jobInputs.length;i++) {
      const value=jobInputs[i].value.trim();
      if (!value && i>0) continue;
      try {
        const url=new URL(value);
        if (!['http:','https:'].includes(url.protocol) || url.username || url.password || value.length>2048) throw new Error();
        url.hash='';entries.push({index:i,url:url.href});
      } catch { jobInputs[i].setAttribute('aria-invalid','true');jobInputs[i].focus();throw new Error(); }
    }
  } catch { jobsStatus.textContent='Enter a valid public HTTP/HTTPS URL in Job Source 1 and each optional field you use.';return; }
  scanningJobs=true;scanJobs.disabled=true;scanJobs.textContent='Scanning job pages…';
  jobInputs.forEach(input=>{input.readOnly=true;});
  sourceStatuses.forEach((node,i)=>{node.textContent=entries.some(entry=>entry.index===i)?'Scanning':'Waiting';});
  jobsResults.replaceChildren();jobsResults.setAttribute('aria-busy','true');
  jobsStatus.textContent='Scanning supplied pages and comparing visible roles…';
  try {
    const response=await fetch('/api/jobs/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({urls:[...new Set(entries.map(entry=>entry.url))]}),signal:AbortSignal.timeout(60000)});
    const data=await response.json();
    if (Array.isArray(data.sources)) for(const entry of entries) {
      const source=data.sources.find(source=>source.url===entry.url);
      sourceStatuses[entry.index].textContent=source?`${source.status}: ${source.message}`:'Could not extract';
    }
    if(!response.ok) throw Object.assign(new Error(),{status:response.status});
    if(!Array.isArray(data.jobs)) throw new Error();
    data.jobs.slice(0,5).forEach((job,index)=>{
      const card=element('article','');
      card.append(element('h4',`#${index+1} ${job.title}`));
      card.append(element('p',[job.employer,job.location,job.domain,job.employmentType,job.postedDate].filter(Boolean).join(' · '),'metadata'));
      const bullets=element('ul','');
      for(const bullet of job.bullets.slice(0,3)) {
        const li=element('li','');li.append(element('strong',`${bullet.heading}: `),element('span',bullet.text));bullets.append(li);
      }
      card.append(bullets,originalLink(job.jobUrl || job.sourceUrl,job.jobUrl?'Open Job Posting':'Open Source Page'));
      jobsResults.append(card);
    });
    const failed=data.sources.filter(source=>source.status==='Could not extract').length;
    jobsStatus.textContent=data.jobs.length?`${data.jobs.length} early-career opportunities found.${failed?' Some sources could not be extracted.':''}`:'No qualifying junior opportunities found. Try more specific junior or graduate job pages.';
  } catch(error) {
    for(const entry of entries) if(sourceStatuses[entry.index].textContent==='Scanning') sourceStatuses[entry.index].textContent='Could not extract';
    jobsStatus.textContent=error.status===400?'Enter 1–5 public job URLs. Private/internal addresses, custom ports, LinkedIn and Indeed are not supported.':error.status===503?'Job Scout is not configured. Ask the site owner to check the Firecrawl key.':'Job pages could not be compared. Try again or choose other public job pages.';
  } finally {
    scanningJobs=false;scanJobs.disabled=false;scanJobs.textContent='Find Junior Opportunities';
    jobInputs.forEach(input=>{input.readOnly=false;});jobsResults.setAttribute('aria-busy','false');
  }
});
