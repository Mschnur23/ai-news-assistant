import { createHmac, timingSafeEqual } from 'node:crypto';
import { publicJobURL } from './job-urls.js';
import { cleanExcerpt } from '../api/scrape.js';
export const PAGE_LIMIT = 25;
export const excludedPaths = ['(^|/)(login|signin|sign-in|logout|signup|sign-up)(/|$)', '\\.(pdf|zip|gz|exe|docx?|xlsx?|pptx?|mp[34]|png|jpe?g|gif|svg)(\\?|$)'];
export function crawlOptions(url, depth) {
  return {url,maxDiscoveryDepth:depth,sitemap:'skip',crawlEntireDomain:true,allowExternalLinks:false,allowSubdomains:false,ignoreQueryParameters:true,ignoreRobotsTxt:false,limit:PAGE_LIMIT,excludePaths:excludedPaths,scrapeOptions:{formats:['markdown'],onlyMainContent:true,parsers:[]}};
}
export async function crawlRequest(path, body, signal = AbortSignal.timeout(30000)) {
  const response = await fetch(`https://api.firecrawl.dev/v2/crawl${path}`, {
    method:body ? 'POST':'GET', headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.FIRECRAWL_API_KEY}`},
    ...(body ? {body:JSON.stringify(body)}:{}), signal,
  });
  if (!response.ok) throw new Error('Crawl unavailable');
  const data = await response.json();
  if (data.success === false) throw new Error('Crawl unavailable');
  return data;
}
// A signed receipt binds status requests to crawls started here, without a database.
export function receipt(job) {
  const value=Buffer.from(JSON.stringify(job)).toString('base64url');
  return `${value}.${createHmac('sha256',process.env.FIRECRAWL_API_KEY).update(value).digest('base64url')}`;
}
export function readReceipt(value) {
  if(typeof value!=='string'||value.length>6000)throw new Error();
  const [payload,signature,...extra]=value.split('.');
  const expected=receipt(JSON.parse(Buffer.from(payload,'base64url').toString())).split('.')[1];
  const a=Buffer.from(signature||''),b=Buffer.from(expected);
  if(extra.length||a.length!==b.length||!timingSafeEqual(a,b))throw new Error();
  const job=JSON.parse(Buffer.from(payload,'base64url').toString());
  if(job.expires<Date.now()||!Number.isInteger(job.depth)||job.depth<1||job.depth>3||!/^[\da-f-]{36}$/i.test(job.id))throw new Error();
  publicJobURL(job.url);return job;
}
export function normalizePages(data, startUrl) {
  const seen=new Set(),host=new URL(startUrl).hostname;
  const limited=(value,n)=>typeof value==='string'?value.split(process.env.FIRECRAWL_API_KEY).join('[redacted]').slice(0,n):'';
  return data.flatMap(page=>{
    try {
      const url=publicJobURL(page.metadata?.url||page.metadata?.sourceURL);
      if(new URL(url).hostname!==host||page.metadata?.statusCode>=400||seen.has(url)||excludedPaths.some(pattern=>new RegExp(pattern,'i').test(new URL(url).pathname)))return [];
      const content=cleanExcerpt(limited(page.markdown,100000)).slice(0,600);
      if(!content)return [];seen.add(url);
      return [{url,title:limited(page.metadata?.title,300)||host,content}];
    } catch {return [];}
  }).slice(0,PAGE_LIMIT);
}
