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
    const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url: url.href, formats: ['markdown'], onlyMainContent: true, timeout: 30000 }),
      signal: AbortSignal.timeout(35000),
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (!result.success || !result.data || typeof result.data.markdown !== 'string' || !result.data.markdown.trim() || result.data.metadata?.statusCode >= 400) throw new Error();
    // Only these bounded fields reach the browser; never forward upstream errors or raw responses.
    const limited = (value, limit) => typeof value === 'string' ? value.split(key).join('[redacted]').slice(0, limit) : '';
    return res.status(200).json({
      title: limited(result.data.metadata?.title, 300) || url.hostname,
      domain: url.hostname,
      url: url.href,
      description: limited(result.data.metadata?.description, 1000),
      content: limited(result.data.markdown.trim(), 6000),
    });
  } catch {
    return res.status(502).json({ error: 'Deep Read could not retrieve this page. Try again or open the original article.' });
  }
}
