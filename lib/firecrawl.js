// Shared by single-page reading and structured job extraction. Never forward raw errors.
export async function scrapePage(url, formats = ['markdown'], timeout = 30000) {
  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
    body: JSON.stringify({ url, formats, onlyMainContent: true, timeout }),
    signal: AbortSignal.timeout(timeout + 5000),
  });
  if (!response.ok) throw new Error('Scrape unavailable');
  const result = await response.json();
  if (!result.success || !result.data || result.data.metadata?.statusCode >= 400) throw new Error('Scrape unavailable');
  return result.data;
}
