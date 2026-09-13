import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Small DOM stand-in for request/state regression tests; real layout is checked in the browser.
function setup() {
  let focused;
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.value = ''; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    focus() { focused = this; }
    querySelectorAll(tag) { return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]); }
    emit(name) { return this.listeners[name]({ preventDefault() {} }); }
  }
  const ids = [...readFileSync('index.html', 'utf8').matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  const nodes = Object.fromEntries(ids.map(id => [id, new Element()]));
  const requests = [];
  let next;
  const fetch = (url, options) => { requests.push({ url, options }); return next(); };
  runInNewContext(readFileSync('app.js', 'utf8'), { document: { querySelector: selector => nodes[selector.slice(1)], createElement: tag => new Element(tag) }, fetch, URL, AbortSignal, Date });
  return { nodes, requests, focused: () => focused, respond: callback => { next = callback; } };
}
const article = { title: 'AI research', summary: 'Robots learn', source: 'WIRED', url: 'https://example.com/story', publishedAt: '' };
const news = { articles: [article], warnings: [] };
const page = { title: 'Example', domain: 'example.com', url: article.url, description: 'Description', content: 'Readable article text.' };
const ok = data => Promise.resolve({ ok: true, json: async () => data });

test('news loading blocks duplicate requests; failed refresh keeps stories and recovery clears errors', async () => {
  const ui = setup(), n = ui.nodes;
  let resolve;
  ui.respond(() => new Promise(done => { resolve = done; }));
  const pending = n['load-news'].emit('click');
  assert.equal(n['load-news'].disabled, true);
  assert.equal(n.articles.attributes['aria-busy'], 'true');
  await n['load-news'].emit('click');
  assert.equal(ui.requests.length, 1);
  resolve(await ok(news)); await pending;
  assert.equal(n.articles.children.length, 1);
  ui.respond(() => Promise.reject(new Error('network')));
  await n['load-news'].emit('click');
  assert.equal(n.articles.children.length, 1);
  assert.match(n['news-status'].textContent, /previously loaded/);
  assert.equal(n['load-news'].disabled, false);
  ui.respond(() => ok(news)); await n['load-news'].emit('click');
  n.keyword.value = 'NOMATCH'; n.keyword.emit('input');
  assert.match(n['news-status'].textContent, /No matching stories/);
  n.keyword.value = 'ROBOTS'; n.keyword.emit('input');
  assert.equal(n.articles.children.length, 1);
  n.keyword.value = ''; n.keyword.emit('input');
  assert.equal(n.articles.children.length, 1);
  assert.equal(n['news-warning'].textContent, '');
});

test('empty and malformed news responses have readable states without parser details', async () => {
  const ui = setup(), n = ui.nodes;
  ui.respond(() => ok({ articles: [], warnings: [] })); await n['load-news'].emit('click');
  assert.match(n['news-status'].textContent, /No stories available/);
  ui.respond(() => Promise.resolve({ ok: true, json: async () => { throw new SyntaxError('raw HTML response'); } }));
  await n['load-news'].emit('click');
  assert.match(n['news-status'].textContent, /No news loaded/);
  assert.ok(!n['news-warning'].textContent.includes('raw HTML'));
});

test('Deep Read preserves cards, focuses its panel, and recovers from timeout via retry', async () => {
  const ui = setup(), n = ui.nodes;
  ui.respond(() => ok(news)); await n['load-news'].emit('click');
  const card = n.articles.children[0];
  ui.respond(() => Promise.reject(Object.assign(new Error(), { name: 'TimeoutError' })));
  await n.articles.querySelectorAll('button')[0].emit('click');
  assert.equal(n.articles.children[0], card);
  assert.equal(ui.focused(), n['deep-read']);
  assert.match(n['deep-status'].textContent, /too long/);
  assert.equal(n.articles.querySelectorAll('button')[0].disabled, false);
  ui.respond(() => ok(page)); await n['deep-result'].querySelectorAll('button')[0].emit('click');
  assert.match(n['deep-status'].textContent, /Article retrieved/);
  assert.equal(n['deep-result'].attributes['aria-busy'], 'false');
  assert.equal(n.articles.children[0], card);
});

test('Explorer validates locally, handles missing configuration and errors, and unlocks after success', async () => {
  const ui = setup(), n = ui.nodes;
  ui.respond(() => ok(news)); await n['load-news'].emit('click');
  for (const value of ['', 'not a url', 'ftp://example.com']) {
    n['page-url'].value = value; await n['explorer-form'].emit('submit');
    assert.equal(n['page-url'].attributes['aria-invalid'], 'true');
  }
  assert.equal(ui.requests.length, 1);
  n['page-url'].value = 'https://example.com';
  for (const status of [400, 503, 502]) {
    ui.respond(() => Promise.resolve({ ok: false, status }));
    await n['explorer-form'].emit('submit');
    assert.match(n['explorer-status'].textContent, status === 503 ? /not configured/ : /public|could not/);
    assert.equal(n['scrape-page'].disabled, false);
    assert.equal(n['page-url'].readOnly, false);
    assert.equal(n.articles.children.length, 1);
  }
  let resolve;
  ui.respond(() => new Promise(done => { resolve = done; }));
  const pending = n['explorer-form'].emit('submit');
  const count = ui.requests.length;
  await n['explorer-form'].emit('submit');
  assert.equal(ui.requests.length, count);
  assert.equal(n['page-url'].readOnly, true);
  assert.equal(n['scrape-page'].disabled, true);
  resolve(await ok(page)); await pending;
  assert.match(n['explorer-status'].textContent, /Page retrieved/);
  assert.equal(n['page-url'].readOnly, false);
  assert.equal(n['explorer-result'].querySelectorAll('a')[0].target, '_blank');
  assert.equal(ui.requests.at(-1).url, '/api/scrape');
});

test('Job Scout validates first source, shows partial results with three bullets, and preserves news', async()=>{
 const ui=setup(),n=ui.nodes;ui.respond(()=>ok(news));await n['load-news'].emit('click');
 await n['jobs-form'].emit('submit');assert.equal(ui.requests.length,1);assert.equal(n['job-url-1'].attributes['aria-invalid'],'true');
 n['job-url-1'].value='https://example.com/jobs';n['job-url-2'].value='https://example.com/broken';
 ui.respond(()=>ok({sources:[{url:'https://example.com/jobs',status:'Extracted',message:'1 job'},{url:'https://example.com/broken',status:'Could not extract',message:'Try another page.'}],jobs:[{title:'Junior Analyst',domain:'example.com',sourceUrl:'https://example.com/jobs',jobUrl:'https://example.com/job',bullets:[{heading:'Accessible start',text:'Junior Analyst'},{heading:'Skills you can build',text:'Not specified'},{heading:'Career exposure',text:'Not specified'}]}]}));
 await n['jobs-form'].emit('submit');assert.equal(n['jobs-results'].querySelectorAll('li').length,3);assert.equal(n.articles.children.length,1);assert.match(n['job-source-2'].textContent,/Could not extract/);assert.equal(n['scan-jobs'].disabled,false);
 ui.respond(()=>Promise.reject(new Error('network')));await n['jobs-form'].emit('submit');assert.equal(n['job-url-1'].readOnly,false);assert.match(n['jobs-status'].textContent,/Try again/);assert.equal(n.articles.children.length,1);
});
