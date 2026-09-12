import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const sources = [
  { name: 'WIRED', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/category/ai/feed/' },
];
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, htmlEntities: true });
const text = (value) => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
const dateValue = (article) => Date.parse(article.publishedAt) || 0;

export function parseFeed(xml, source) {
  if (/<!DOCTYPE/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Invalid feed');
  const channel = parser.parse(xml)?.rss?.channel;
  if (!channel) throw new Error('Invalid feed');
  const items = channel.item ? (Array.isArray(channel.item) ? channel.item : [channel.item]) : [];
  const seen = new Set();
  return items.flatMap((item) => {
    let url;
    try {
      url = new URL(item.link);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return [];
    } catch { return []; }
    if (seen.has(url.href)) return [];
    seen.add(url.href);
    const date = Date.parse(item.pubDate || '');
    return [{
      id: createHash('sha256').update(`${source}:${url.href}`).digest('hex').slice(0, 20),
      source,
      title: text(item.title).slice(0, 300) || 'Untitled article',
      url: url.href,
      publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : '',
      summary: text(item.description).slice(0, 1000),
    }];
  }).sort((a, b) => dateValue(b) - dateValue(a)).slice(0, 6);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET to load news.' });
  }
  const results = await Promise.allSettled(sources.map(async (source) => {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Feed unavailable');
    const xml = await response.text();
    if (xml.length > 2_000_000) throw new Error('Feed too large');
    return parseFeed(xml, source.name);
  }));
  const articles = [];
  const warnings = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') articles.push(...result.value);
    else warnings.push(`${sources[index].name} is unavailable. Try loading news again.`);
  });
  articles.sort((a, b) => dateValue(b) - dateValue(a));
  return res.status(results.every((result) => result.status === 'rejected') ? 502 : 200).json({
    articles, warnings,
    ...(results.every((result) => result.status === 'rejected') ? { error: 'News could not be loaded. Please try again.' } : {}),
  });
}
