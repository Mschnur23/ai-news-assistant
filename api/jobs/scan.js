import { scrapePage } from '../../lib/firecrawl.js';
import { validateJobURLs } from '../../lib/job-urls.js';
import { jobSchema, extractionPrompt, extractJobs, rankJobs } from '../../lib/jobs.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method!=='POST') {res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST to scan job pages.'});}
  let urls;
  try {const body=typeof req.body==='string'?JSON.parse(req.body):req.body;urls=await validateJobURLs(body?.urls);}
  catch {return res.status(400).json({error:'Enter 1–5 valid public HTTP/HTTPS URLs. Private/internal addresses, custom ports, LinkedIn and Indeed are not supported.'});}
  if(!process.env.FIRECRAWL_API_KEY) return res.status(503).json({error:'Job Scout is not configured. Ask the site owner to check the Firecrawl key.'});
  const results=await Promise.all(urls.map(async url=>{
    try {
      const data=await scrapePage(url,['markdown',{type:'json',schema:jobSchema,prompt:extractionPrompt}],45000);
      const jobs=extractJobs(data,url);
      if (!jobs.length && /checking your browser|verify (?:you are|that you are) human|verification (?:failed|expired)|access denied/i.test(data.markdown)) throw new Error('Challenge');
      return {url,status:jobs.length?'Extracted':'No jobs found',message:jobs.length?`${jobs.length} visible job(s) extracted.`:'No usable job listings were found on this page.',jobs};
    } catch {return {url,status:'Could not extract',message:'This page could not be cleanly extracted. Try another public job page.',jobs:[]};}
  }));
  const failed=results.every(result=>result.status==='Could not extract');
  return res.status(failed?502:200).json({sources:results.map(({jobs,...source})=>source),jobs:rankJobs(results.flatMap(result=>result.jobs)),...(failed?{error:'No sources could be extracted. Try other public job pages.'}:{})});
}
