import test from 'node:test';
import assert from 'node:assert/strict';
import scan from '../api/jobs/scan.js';
import { extractJobs,rankJobs } from '../lib/jobs.js';
import { publicJobURL,validateJobURLs,isPublicAddress } from '../lib/job-urls.js';
const raw=(title='Junior Analyst',jobUrl='https://8.8.8.8/job')=>({title,jobUrl,employer:'Agency',location:'London',postedDate:'',employmentType:'Full time',description:'Build digital services through data analysis.',juniorEvidence:['No prior experience required'],transferableSkills:['data analysis','communication','planning'],futureRelevantSignals:['digital services','technology'],learningSignals:['mentoring'],seniorityWarnings:[]});
const data=jobs=>({markdown:jobs.map(job=>Object.values(job).flat().join('\n')).join('\n'),json:{jobs}});
const response=()=>({code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}});
function mockKey(t){const prior=process.env.FIRECRAWL_API_KEY;process.env.FIRECRAWL_API_KEY='fake-job-key';t.after(()=>{if(prior===undefined)delete process.env.FIRECRAWL_API_KEY;else process.env.FIRECRAWL_API_KEY=prior;});}
test('job URL limits, deduplication, schemes, private/internal and DNS-private rejection',async()=>{
 for(const url of ['http://localhost','http://127.0.0.1','http://2130706433','http://10.2.3.4','http://[::1]','http://[::ffff:127.0.0.1]','https://x.internal','file:///etc/passwd','https://user:pass@example.com','https://www.linkedin.com/jobs','https://indeed.com/jobs'])assert.throws(()=>publicJobURL(url));
 assert.equal(isPublicAddress('100.64.1.1'),false);assert.equal(isPublicAddress('8.8.8.8'),true);
 await assert.rejects(validateJobURLs([]));await assert.rejects(validateJobURLs(Array(6).fill('https://8.8.8.8')));
 assert.deepEqual(await validateJobURLs(['https://8.8.8.8/#a','https://8.8.8.8/']),['https://8.8.8.8/']);
 await assert.rejects(validateJobURLs(['https://example.com'],async()=>[{address:'10.0.0.1'}]));
});
test('rank caps, senior exclusion, absent/unsupported evidence and duplicate jobs',()=>{
 const mentored={...raw(),description:'Work with senior colleagues and the director.'};
 assert.equal(rankJobs(extractJobs(data([mentored]),'https://8.8.8.8')).length,1);
 const junior=raw();const senior=raw('Senior Director','https://8.8.8.8/senior');
 const jobs=extractJobs(data([junior,senior]),'https://8.8.8.8/source');
 assert.equal(rankJobs(jobs)[0].score,100);assert.equal(rankJobs(jobs).length,1);
 const ranked=rankJobs([...jobs,...jobs]);assert.equal(ranked.length,1);assert.equal(ranked[0].bullets.length,3);
 assert.deepEqual(ranked[0].bullets.map(b=>b.heading),['Accessible start','Skills you can build','Career exposure']);
 const sparse=raw();const sparseData=data([sparse]);sparseData.json.jobs[0]={...sparse,transferableSkills:['invented skill'],futureRelevantSignals:[],learningSignals:[],employer:'Invented employer',jobUrl:'javascript:alert(1)'};
 const normalized=extractJobs(sparseData,'https://8.8.8.8/source')[0];assert.equal(normalized.employer,'');assert.equal(normalized.jobUrl,'');assert.equal(normalized.transferableSkills.length,0);assert.match(rankJobs([normalized])[0].bullets[1].text,/not specified/);
 assert.equal(extractJobs(data(Array(12).fill(junior)),'https://8.8.8.8').length,8);
});
test('one source and five sources use one scrape per distinct URL; partial failure and top-five cap',async t=>{
 mockKey(t);let calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  const payload=JSON.parse(options.body);calls.push(payload);
  assert.equal(url,'https://api.firecrawl.dev/v2/scrape');assert.equal(payload.formats[1].type,'json');
  if(payload.url.endsWith('/bad'))throw new Error('fake-job-key');
  return Response.json({success:true,data:data([raw('Junior Analyst '+payload.url,payload.url+'/job'),raw('Graduate Trainee '+payload.url,payload.url+'/other')])});
 });
 let res=response();await scan({method:'POST',body:{urls:['https://8.8.8.8/one']}},res);assert.equal(res.code,200);assert.equal(res.body.jobs.length,2);assert.equal(calls.length,1);
 calls=[];res=response();await scan({method:'POST',body:{urls:['https://8.8.8.8/1','https://8.8.8.8/2','https://8.8.8.8/3','https://8.8.8.8/4','https://8.8.8.8/bad']}},res);
 assert.equal(res.code,200);assert.equal(calls.length,5);assert.equal(res.body.sources[4].status,'Could not extract');assert.equal(res.body.jobs.length,5);assert.ok(res.body.jobs.every(job=>job.bullets.length===3));assert.ok(!JSON.stringify(res.body).includes('fake-job-key'));assert.ok(!JSON.stringify(res.body).includes('markdown'));
});
test('all failed, no jobs, malformed extraction and challenge pages are distinguishable',async t=>{
 mockKey(t);const mocked=t.mock.method(globalThis,'fetch');
 for(const [result,expected,status] of [[{markdown:'Ordinary information',json:{jobs:[]}},'No jobs found',200],[{markdown:'Checking your Browser...',json:{jobs:[]}},'Could not extract',502],[{markdown:'Jobs',json:{}},'Could not extract',502]]){
  mocked.mock.mockImplementation(async()=>Response.json({success:true,data:result}));const res=response();await scan({method:'POST',body:{urls:['https://8.8.8.8']}},res);assert.equal(res.code,status);assert.equal(res.body.sources[0].status,expected);assert.equal(res.body.jobs.length,0);
 }
});

test('observed USAJOBS internship card ranks using verified employment type, without invented skills',async()=>{
 const {readFile}=await import('node:fs/promises');
 const observed=JSON.parse(await readFile(new URL('./fixtures/usajobs-internship.json',import.meta.url),'utf8'));
 const jobs=extractJobs(observed,'https://www.usajobs.gov/Search/Results?wt=15328');
 assert.equal(jobs.length,1);
 const ranked=rankJobs(jobs);
 assert.equal(ranked.length,1);assert.equal(ranked[0].title,'MATHEMATICIAN');
 assert.equal(ranked[0].jobUrl,'https://www.usajobs.gov/job/846709100');
 assert.equal(ranked[0].score,40);assert.equal(ranked[0].bullets.length,3);
 assert.match(ranked[0].bullets[0].text,/Internships/);
 assert.deepEqual(ranked[0].transferableSkills,[]);assert.deepEqual(ranked[0].learningSignals,[]);
 assert.match(ranked[0].bullets[1].text,/not specified/);
 const invented=structuredClone(observed);invented.json.jobs[0].employmentType='Graduate programme';
 assert.equal(rankJobs(extractJobs(invented,'https://www.usajobs.gov/Search/Results?wt=15328')).length,0);
 for(const markdown of ['# Get work that works for you\n[Find a job](https://www.jobs.service.gov.uk/jobs)','## Please refine your search\nWe couldn\'t find any results. Try refining your search.\n## No jobs found']) {
  assert.deepEqual(rankJobs(extractJobs({markdown,json:{jobs:[]}},'https://www.usajobs.gov/Search')),[]);
 }
});
