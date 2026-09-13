import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]]) blocked.addSubnet(address,prefix,'ipv4');
const globalV6 = new BlockList(); globalV6.addSubnet('2000::',3,'ipv6');
blocked.addSubnet('2001:db8::',32,'ipv6'); blocked.addSubnet('2002::',16,'ipv6');
export function isPublicAddress(address) {
  const version = isIP(address);
  return version === 4 ? !blocked.check(address,'ipv4') : version === 6 && globalV6.check(address,'ipv6') && !blocked.check(address,'ipv6');
}
export function publicJobURL(value, base) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error('Invalid URL');
  const url = new URL(value, base);
  const host = url.hostname.replace(/^\[|\]$/g,'').replace(/\.$/,'').toLowerCase();
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port)) || !host.includes('.') && !isIP(host) || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$/.test(host) || /(?:^|\.)(?:linkedin\.com|indeed\.com)$/.test(host) || isIP(host) && !isPublicAddress(host)) throw new Error('Invalid public URL');
  url.hash = ''; return url.href;
}
export async function validateJobURLs(values, resolve = lookup) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 5) throw new Error('Enter 1–5 URLs');
  const urls = [...new Set(values.map(value => publicJobURL(value)))];
  await Promise.all(urls.map(async value => {
    const host = new URL(value).hostname.replace(/^\[|\]$/g,'');
    if (isIP(host)) return;
    let timer;
    try {
      const records = await Promise.race([resolve(host,{all:true}),new Promise((_,reject) => { timer=setTimeout(()=>reject(new Error('DNS timeout')),3000); })]);
      if (!records.length || records.some(record => !isPublicAddress(record.address))) throw new Error('Private address');
    } catch (error) {
      // Unavailable public domains are handled as per-source extraction failures.
      if (!['ENOTFOUND','EAI_AGAIN','ENODATA'].includes(error.code)) throw error;
    } finally { clearTimeout(timer); }
  }));
  return urls;
}
