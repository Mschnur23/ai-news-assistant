const loadButton = document.querySelector('#load-news');
const keyword = document.querySelector('#keyword');
const articlesElement = document.querySelector('#articles');
const status = document.querySelector('#news-status');
const warning = document.querySelector('#news-warning');
const deepPanel = document.querySelector('#deep-read');
const deepResult = document.querySelector('#deep-result');
let articles = [];
let hasLoaded = false;
let loadingNews = false;
let loadingDeep = false;

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function originalLink(url) {
  const link = element('a', 'Read Original Article');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
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
    button.disabled = loadingDeep;
    button.addEventListener('click', () => deepRead(article));
    actions.append(originalLink(article.url), button);
    card.append(actions);
    articlesElement.append(card);
  }
  if (hasLoaded && !loadingNews) status.textContent = matches.length ? `${matches.length} of ${articles.length} stories shown.` : term && articles.length ? 'No matching stories. Try another keyword or clear the filter.' : 'No stories available. Try loading news again.';
}
loadButton.addEventListener('click', async () => {
  loadingNews = true;
  loadButton.disabled = true;
  loadButton.textContent = 'Loading news…';
  status.textContent = 'Loading the three RSS feeds…';
  warning.textContent = '';
  try {
    const response = await fetch('/api/news');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'News could not be loaded. Please try again.');
    articles = data.articles;
    hasLoaded = true;
    warning.textContent = data.warnings.join(' ');
  } catch (error) {
    warning.textContent = error.message === 'Failed to fetch' ? 'News could not be loaded. Check your connection and try again.' : error.message;
    status.textContent = articles.length ? 'Previously loaded stories are still available.' : 'No news loaded. Please try again.';
  } finally {
    loadingNews = false;
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
  deepPanel.setAttribute('aria-busy', 'true');
  deepResult.replaceChildren(element('p', `Retrieving “${article.title}”…`));
  renderArticles();
  try {
    const response = await fetch('/api/scrape', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: article.url }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Deep Read failed. Please try again.');
    deepResult.replaceChildren(element('h3', data.title), element('p', `${data.domain} · Firecrawl excerpt`, 'metadata'));
    if (data.description) deepResult.append(element('p', data.description));
    deepResult.append(element('p', data.content, 'excerpt'), originalLink(article.url));
  } catch {
    const retry = element('button', 'Retry Deep Read');
    retry.type = 'button';
    retry.addEventListener('click', () => deepRead(article));
    deepResult.replaceChildren(element('h3', article.title), element('p', 'Deep Read could not retrieve this article. Try again or open the original.'), retry, originalLink(article.url));
  } finally {
    loadingDeep = false;
    deepPanel.setAttribute('aria-busy', 'false');
    renderArticles();
  }
}
