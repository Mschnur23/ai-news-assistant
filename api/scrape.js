import { scrapePage } from '../lib/firecrawl.js';

export function cleanExcerpt(markdown) {
  const hasVerificationUI = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:Checking your browser|Verifying|Verification (?:failed|expired))[.…]*(?:\*\*)?\s*$/im.test(markdown);
  const paragraphs = markdown
    // Comments and recommendation sections are not part of the article.
    .split(/^#{1,6}\s+(?:Comments?(?:\s*\(\d+\))?|You Might Also Like|Related (?:Articles|Stories))\s*$/im)[0]
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, '')
    .replace(/\[([^\]]+)\]\((?:[^()\n]|\([^()\n]*\))*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\\([_*[\]])/g, '$1')
    // Match whole UI lines only, so article prose mentioning verification survives.
    .split('\n')
    .filter((line) => !/^(?:(?:(?:Checking your browser|Verifying|Verification (?:failed|expired))[.…]*|Stuck\?\s*Troubleshoot|Skip to (?:main )?content)\s*)+$/i.test(line.trim()) && !(hasVerificationUI && /^(?:Success!|Troubleshoot|Refresh|Cloudflare, opens in a new tab|Privacy\s*•\s*Help)$/i.test(line.trim())))
    .join('\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph && !/^(?:Skip to (?:main )?content|Back to top|(?:Comment\s*(?:\d+|Loader)?\s*|Save Story\s*|Save this story\s*|Share\s*)+|Sign in(?: or create account)?|Subscribe)$/i.test(paragraph));
  const unique = paragraphs.filter((paragraph, index) => paragraph !== paragraphs[index - 1]);
  const content = unique.slice(0, 3).join('\n\n');
  if (content.length <= 1500) return content;
  return content.slice(0, 1499).replace(/\s+\S*$/, '').trimEnd() + '…';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST for Deep Read.' });
  }
  let url;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body.url !== 'string' || body.url.length > 2048) throw new Error();
    url = new URL(body.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || url.hostname.endsWith('.local') || url.hostname.endsWith('.localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'Choose an article with a valid public http:// or https:// URL.' });
  }
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return res.status(503).json({ error: 'Deep Read is not configured. Add the server-side Firecrawl key and restart or redeploy.' });
  try {
    const result = { data: await scrapePage(url.href) };
    if (typeof result.data.markdown !== 'string' || !result.data.markdown.trim()) throw new Error();
    // Only these bounded fields reach the browser; never forward upstream errors or raw responses.
    const limited = (value, limit) => typeof value === 'string' ? value.split(key).join('[redacted]').slice(0, limit) : '';
    const content = cleanExcerpt(limited(result.data.markdown, 100000));
    if (!content) throw new Error();
    return res.status(200).json({
      title: limited(result.data.metadata?.title, 300) || url.hostname,
      domain: url.hostname,
      url: url.href,
      description: limited(result.data.metadata?.description, 1000),
      content,
    });
  } catch {
    return res.status(502).json({ error: 'Deep Read could not retrieve this page. Try again or open the original article.' });
  }
}
