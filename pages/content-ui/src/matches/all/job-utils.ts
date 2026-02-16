export type JobInfo = {
  title?: string;
  company?: string;
  location?: string;
  url: string;
};

export const getCurrentJobInfo = (jobDescriptionText?: string): JobInfo => {
  const url = window.location.href;

  const titleCandidates = [
    'h1',
    '[data-testid*="job-title"]',
    '[data-automation-id*="jobTitle"]',
    '[class*="jobTitle"]',
    '[class*="job-title"]',
    '[class*="posting-headline"]',
    '[class*="title"] h1',
  ];

  const title =
    titleCandidates
      .map(sel => document.querySelector(sel))
      .find(el => el?.textContent && el.textContent.trim().length > 2)
      ?.textContent?.trim() || document.title?.trim();

  const companyFromMeta =
    document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() ||
    document.querySelector('meta[name="author"]')?.getAttribute('content')?.trim();

  const companyFromJD = jobDescriptionText ? extractCompanyFromText(jobDescriptionText) : undefined;

  const company = companyFromJD || companyFromMeta || undefined;

  const locationCandidates = [
    '[data-testid*="location"]',
    '[data-automation-id*="location"]',
    '[class*="location"]',
    '[class*="jobLocation"]',
    '[class*="job-location"]',
  ];

  const location =
    locationCandidates
      .map(sel => document.querySelector(sel))
      .find(el => el?.textContent && el.textContent.trim().length > 2)
      ?.textContent?.trim() || undefined;

  return {
    title: sanitizeInlineText(title),
    company: sanitizeInlineText(company),
    location: sanitizeInlineText(location),
    url,
  };
};

export const wordCount = (text: string): number => {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
};

export const extractBulletLines = (text: string, max = 8): string[] => {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const bullets = lines
    .filter(l => /^[-•‣▪–—]\s+/.test(l))
    .map(l => l.replace(/^[-•‣▪–—]\s+/, '').trim())
    .filter(l => l.length >= 20 && l.length <= 140);

  if (bullets.length > 0) return bullets.slice(0, max);

  // Fallback: sentence-ish chunks
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => s.length >= 40 && s.length <= 160);

  return sentences.slice(0, max);
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'he',
  'her',
  'hers',
  'him',
  'his',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'me',
  'my',
  'not',
  'of',
  'on',
  'or',
  'our',
  'ours',
  'she',
  'so',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'they',
  'this',
  'to',
  'us',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'will',
  'with',
  'you',
  'your',
  'yours',
  'about',
  'across',
  'after',
  'all',
  'also',
  'any',
  'around',
  'because',
  'before',
  'being',
  'between',
  'both',
  'can',
  'could',
  'do',
  'does',
  'doing',
  'done',
  'each',
  'either',
  'else',
  'ever',
  'every',
  'few',
  'get',
  'gets',
  'getting',
  'got',
  'had',
  'how',
  'just',
  'least',
  'less',
  'like',
  'many',
  'may',
  'might',
  'more',
  'most',
  'must',
  'new',
  'no',
  'now',
  'only',
  'other',
  'over',
  'per',
  'please',
  'role',
  'roles',
  'should',
  'some',
  'such',
  'than',
  'then',
  'there',
  'these',
  'those',
  'through',
  'under',
  'up',
  'use',
  'using',
  'very',
  'want',
  'within',
  'work',
  'working',
  'year',
  'years',
]);

export const extractKeywords = (text: string, max = 14): string[] => {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const words = cleaned
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length >= 2 && w.length <= 24)
    .filter(w => !STOP_WORDS.has(w))
    .filter(w => !/^\d+$/.test(w));

  const scores = new Map<string, number>();
  const bump = (term: string, amount: number) => scores.set(term, (scores.get(term) ?? 0) + amount);

  for (const w of words) bump(w, 1);

  // Capture simple bigrams like "product management" / "machine learning"
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (!a || !b) continue;
    if (STOP_WORDS.has(a) || STOP_WORDS.has(b)) continue;
    const bigram = `${a} ${b}`;
    if (bigram.length <= 3) continue;
    bump(bigram, 2);
  }

  return [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([term]) => term)
    .filter(uniqueFilter())
    .slice(0, max)
    .map(toTitleish);
};

const extractCompanyFromText = (text: string): string | undefined => {
  const match =
    text.match(
      /(?:at|with|for|join)\s+([A-Z][A-Za-z0-9&.,\u00C0-\u017F ]{1,60}?)(?:\s+(?:Inc|LLC|Corp|Ltd|Company|Co)\b)?/i,
    ) ?? text.match(/Company[:\s]+([A-Z][A-Za-z0-9&.,\u00C0-\u017F ]{1,60})/i);

  if (!match?.[1]) return undefined;
  return match[1].trim();
};

const sanitizeInlineText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length < 2) return undefined;
  return normalized.slice(0, 120);
};

const toTitleish = (term: string): string => {
  if (term.toUpperCase() === term) return term;
  if (term.includes('+')) return term.toUpperCase();
  if (/^[a-z]{2,6}$/.test(term)) return term.toUpperCase(); // e.g. "sql", "react"
  return term
    .split(' ')
    .map(part => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(' ');
};

const uniqueFilter = () => {
  const seen = new Set<string>();
  return (value: string) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
};
