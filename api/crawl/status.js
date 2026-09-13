import { crawlRequest,readReceipt,normalizePages,PAGE_LIMIT } from '../../lib/crawl.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET to check crawl progress.'});}
  if(!process.env.FIRECRAWL_API_KEY)return res.status(503).json({error:'Exploration is not configured.'});
  let job;
  try {const query=new URL(req.url,'http://localhost').searchParams;job=readReceipt(query.get('token'));if(query.get('id')!==job.id)throw new Error();}
  catch {return res.status(400).json({error:'This crawl reference is invalid or expired. Start a new exploration.'});}
  try {
    const signal=AbortSignal.timeout(30000);
    let result=await crawlRequest(`/${job.id}`,undefined,signal);
    if(!['scraping','completed','failed','cancelled'].includes(result.status)||!Array.isArray(result.data))throw new Error();
    const state=result.status,completed=Math.min(PAGE_LIMIT,Math.max(0,Number(result.completed)||0));
    const raw=[...result.data];const visited=new Set();
    // Follow Firecrawl result pagination only, never website links or arbitrary URLs.
    while(state!=='scraping'&&result.next&&raw.length<PAGE_LIMIT) {
      const next=new URL(result.next);
      if(next.origin!=='https://api.firecrawl.dev'||next.pathname!==`/v2/crawl/${job.id}`||visited.has(next.href)||visited.size>=PAGE_LIMIT)throw new Error();
      visited.add(next.href);result=await crawlRequest(`/${job.id}${next.search}`,undefined,signal);
      if(!Array.isArray(result.data))throw new Error();raw.push(...result.data);
    }
    const pages=normalizePages(raw.slice(0,PAGE_LIMIT),job.url);
    return res.status(200).json({status:state,url:job.url,depth:job.depth,completed,pages,capReached:completed>=PAGE_LIMIT});
  } catch {return res.status(502).json({error:'Progress could not be checked. Try checking this crawl again.'});}
}
