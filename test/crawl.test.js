import test from 'node:test';
import assert from 'node:assert/strict';
import start from '../api/crawl.js';
import status from '../api/crawl/status.js';
import {receipt,normalizePages} from '../lib/crawl.js';
const id='12345678-1234-1234-1234-123456789abc';
const url='https://8.8.8.8/';
const res=()=>({code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}});
const page=(n)=>({metadata:{url:url+n,title:'Page '+n},markdown:'[Skip to main content](https://example.com)\n\nReadable content. secret-test-key'});
function key(t){const old=process.env.FIRECRAWL_API_KEY;process.env.FIRECRAWL_API_KEY='secret-test-key';t.after(()=>{if(old===undefined)delete process.env.FIRECRAWL_API_KEY;else process.env.FIRECRAWL_API_KEY=old;});}
const request=()=>({method:'GET',url:'/api/crawl/status?id='+id+'&token='+receipt({id,url,depth:2,expires:Date.now()+60000})});
test('depths 1–3 enforce all workshop limits; invalid depths and private URLs never start a crawl',async t=>{
 key(t);let calls=0;
 t.mock.method(globalThis,'fetch',async(u,o)=>{calls++;assert.equal(u,'https://api.firecrawl.dev/v2/crawl');const b=JSON.parse(o.body);assert.equal(b.limit,25);assert.equal(b.sitemap,'skip');assert.equal(b.ignoreQueryParameters,true);assert.equal(b.crawlEntireDomain,true);assert.equal(b.allowExternalLinks,false);assert.equal(b.allowSubdomains,false);assert.equal(b.ignoreRobotsTxt,false);assert.deepEqual(b.scrapeOptions.formats,['markdown']);assert.equal(b.scrapeOptions.onlyMainContent,true);assert.ok(b.excludePaths.length);return Response.json({success:true,id});});
 for(const depth of [1,2,3]){const r=res();await start({method:'POST',body:{url,depth,limit:999,allowExternalLinks:true}},r);assert.equal(r.code,200);assert.equal(r.body.id,id);assert.ok(!JSON.stringify(r.body).includes('secret-test-key'));}
 for(const depth of [0,4,1.5,'2',null]){const r=res();await start({method:'POST',body:{url,depth}},r);assert.equal(r.code,400);}
 const r=res();await start({method:'POST',body:{url:'http://127.0.0.1',depth:1}},r);assert.equal(r.code,400);assert.equal(calls,3);
});
test('status bounds output, cleans excerpts, excludes foreign hosts and handles result pagination',async t=>{
 key(t);let calls=0;
 t.mock.method(globalThis,'fetch',async u=>{calls++;return Response.json(calls===1?{status:'completed',completed:25,data:[page(0)],next:`https://api.firecrawl.dev/v2/crawl/${id}?skip=1`}:{status:'completed',completed:25,data:Array.from({length:30},(_,i)=>page(i+1))});});
 const r=res();await status(request(),r);assert.equal(r.code,200);assert.equal(r.body.completed,25);assert.equal(r.body.capReached,true);assert.equal(r.body.pages.length,25);assert.equal(calls,2);assert.ok(!JSON.stringify(r.body).includes('secret-test-key'));assert.ok(!r.body.pages[0].content.includes('Skip to'));
 assert.deepEqual(normalizePages([{metadata:{url:'https://sub.8.8.8.8/a'},markdown:'external'}, {metadata:{url:'http://127.0.0.1/a'},markdown:'private'},{metadata:{url:url+'file.pdf'},markdown:'file'}, {metadata:{url:url+'login'},markdown:'login'}],url),[]);
});
test('invalid receipts, malformed upstream, failed crawls, and unsafe pagination fail cleanly',async t=>{
 key(t);let payload={status:'failed',completed:1,data:[page(1)]};let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json(payload);});
 let r=res();await status({method:'GET',url:'/api/crawl/status?id='+id+'&token=invalid'},r);assert.equal(r.code,400);assert.equal(calls,0);
 r=res();await status(request(),r);assert.equal(r.body.status,'failed');assert.equal(r.body.pages.length,1);
 payload={status:'completed',completed:1,data:[page(1)],next:'https://evil.example/steal'};r=res();await status(request(),r);assert.equal(r.code,502);assert.equal(calls,2);
 payload={status:'unknown',data:[]};r=res();await status(request(),r);assert.equal(r.code,502);
});
