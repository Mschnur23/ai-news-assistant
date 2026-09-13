import { validateJobURLs } from '../lib/job-urls.js';
import { crawlOptions,crawlRequest,receipt } from '../lib/crawl.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST to explore a site.'});}
  let url,depth;
  try {
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    depth=body?.depth;if(!Number.isInteger(depth)||depth<1||depth>3)throw new Error();
    [url]=await validateJobURLs([body.url]);
  } catch {return res.status(400).json({error:'Enter a public HTTP/HTTPS URL and a depth from 1 to 3.'});}
  if(!process.env.FIRECRAWL_API_KEY)return res.status(503).json({error:'Exploration is not configured.'});
  try {
    const data=await crawlRequest('',crawlOptions(url,depth));
    if(typeof data.id!=='string'||!/^[\da-f-]{36}$/i.test(data.id))throw new Error();
    return res.status(200).json({id:data.id,token:receipt({id:data.id,url,depth,expires:Date.now()+86400000})});
  } catch {return res.status(502).json({error:'This crawl could not be started. Try another public page.'});}
}
