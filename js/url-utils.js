// URL validation utilities — prevents XSS via javascript: URIs in <a href>
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return '#';
    return url;
  } catch {
    return '#';
  }
}
