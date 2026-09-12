import test from 'node:test';
import assert from 'node:assert/strict';
import news, { parseFeed, sources } from '../api/news.js';
import scrape from '../api/scrape.js';

function setKey(t, value) {
  const previous = process.env.FIRECRAWL_API_KEY;
  process.env.FIRECRAWL_API_KEY = value;
  t.after(() => {
    if (previous === undefined) delete process.env.FIRECRAWL_API_KEY;
    else process.env.FIRECRAWL_API_KEY = previous;
  });
}

function response() {
  return { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
const feed = (items) => `<rss><channel>${items}</channel></rss>`;
const item = (i, date = '') => `<item><title>AI story ${i}</title><link>https://example.com/${i}</link><pubDate>${date}</pubDate><description><![CDATA[<p>Robots &amp; research</p>]]></description></item>`;

test('RSS normalizes, sorts before limiting, skips unsafe/duplicate links and tolerates missing fields', () => {
  const xml = feed(Array.from({ length: 8 }, (_, i) => item(i, `2026-09-${String(i + 1).padStart(2, '0')}`)).join('') + item(7) + '<item><link>javascript:alert(1)</link></item>');
  const result = parseFeed(xml, 'WIRED');
  assert.equal(result.length, 6);
  assert.equal(result[0].title, 'AI story 7');
  assert.equal(result[0].source, 'WIRED');
  assert.equal(result[0].publishedAt, '2026-09-08T00:00:00.000Z');
  assert.ok(!result[0].summary.includes('<p>'));
  assert.deepEqual(result, parseFeed(xml, 'WIRED'));
  const missing = parseFeed(feed('<item><link>https://example.com/missing</link></item>'), 'WIRED')[0];
  assert.equal(missing.summary, '');
  assert.equal(missing.publishedAt, '');
  assert.equal(missing.title, 'Untitled article');
  assert.equal(parseFeed(feed('<item><title>AI&#8217;s next step</title><link>https://example.com/entity</link></item>'), 'WIRED')[0].title, 'AI’s next step');
  assert.throws(() => parseFeed('<rss><broken>', 'WIRED'));
  assert.throws(() => parseFeed('<html>Not a feed</html>', 'WIRED'));
});

test('news requests all three configured feeds, combines at most 18 stories in date order', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    return new Response(feed(Array.from({ length: 9 }, (_, i) => item(i, `2026-09-${String(i + 1).padStart(2, '0')}`)).join('')));
  });
  const res = response();
  await news({ method: 'GET' }, res);
  assert.deepEqual(calls, sources.map((source) => source.url));
  assert.equal(res.code, 200);
  assert.equal(res.body.articles.length, 18);
  assert.deepEqual(new Set(res.body.articles.map((article) => article.source)), new Set(['WIRED', 'TechCrunch', 'VentureBeat']));
  assert.ok(res.body.articles.every((article, i, all) => !i || article.publishedAt <= all[i - 1].publishedAt));
});

test('partial malformed feed and total feed failure return readable results', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async (url) => new Response(url === sources[0].url ? '<broken>' : feed(item(1))));
  let res = response();
  await news({ method: 'GET' }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.articles.length, 2);
  assert.match(res.body.warnings[0], /WIRED is unavailable/);
  mock.mock.mockImplementation(async () => { throw new Error('network'); });
  res = response();
  await news({ method: 'GET' }, res);
  assert.equal(res.code, 502);
  assert.equal(res.body.warnings.length, 3);
  assert.match(res.body.error, /try again/i);
});

test('scrape rejects invalid URL/body/method and missing key without upstream calls', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { assert.fail('Unexpected upstream call'); });
  setKey(t, '');
  for (const body of [undefined, '{', { url: ['https://example.com'] }, { url: 'ftp://example.com' }, { url: 'http://127.0.0.1' }, { url: 'https://user:password@example.com' }]) {
    const res = response(); await scrape({ method: 'POST', body }, res); assert.equal(res.code, 400);
  }
  let res = response(); await scrape({ method: 'GET' }, res); assert.equal(res.code, 405);
  res = response(); await scrape({ method: 'POST', body: { url: 'https://example.com/article' } }, res); assert.equal(res.code, 503);
});

test('Deep Read performs exactly one scrape, limits fields and never forwards key/raw data', async (t) => {
  setKey(t, 'test-secret-value');
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    assert.equal(options.headers.Authorization, 'Bearer test-secret-value');
    return Response.json({ success: true, data: { markdown: 'test-secret-value ' + 'a'.repeat(8000), metadata: { title: 'Article', description: 'Description' }, secret: 'test-secret-value' } });
  });
  const res = response();
  await scrape({ method: 'POST', body: { url: 'https://example.com/article' } }, res);
  assert.equal(res.code, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.firecrawl.dev/v2/scrape');
  assert.deepEqual(calls[0].body, { url: 'https://example.com/article', formats: ['markdown'], onlyMainContent: true, timeout: 30000 });
  assert.deepEqual(Object.keys(res.body), ['title', 'domain', 'url', 'description', 'content']);
  assert.equal(res.body.content.length, 6000);
  assert.ok(!JSON.stringify(res.body).includes('test-secret-value'));
});

test('Firecrawl HTTP, timeout, malformed and empty responses give a retryable error', async (t) => {
  setKey(t, 'test-secret-value');
  const mock = t.mock.method(globalThis, 'fetch');
  for (const implementation of [
    async () => new Response('test-secret-value', { status: 429 }),
    async () => { throw new Error('test-secret-value'); },
    async () => new Response('not JSON'),
    async () => Response.json({ success: true, data: { markdown: '' } }),
    async () => Response.json({ success: false }),
  ]) {
    mock.mock.mockImplementation(implementation);
    const res = response(); await scrape({ method: 'POST', body: { url: 'https://example.com/article' } }, res);
    assert.equal(res.code, 502);
    assert.match(res.body.error, /Try again/);
    assert.ok(!JSON.stringify(res.body).includes('test-secret-value'));
  }
});
