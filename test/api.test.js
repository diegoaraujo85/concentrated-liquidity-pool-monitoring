import { describe, it, expect } from 'vitest';
import { safeUrl } from '../js/url-utils.js';

describe('safeUrl — URL validation', () => {
  it('returns https URLs unchanged', () => {
    expect(safeUrl('https://defillama.com/yields/pool/abc')).toBe('https://defillama.com/yields/pool/abc');
  });

  it('returns http URLs unchanged', () => {
    expect(safeUrl('http://example.com')).toBe('http://example.com');
  });

  it('returns # for javascript: URIs', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#');
  });

  it('returns # for data: URIs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  it('returns # for empty string', () => {
    expect(safeUrl('')).toBe('#');
  });

  it('returns # for null/undefined', () => {
    expect(safeUrl(null)).toBe('#');
    expect(safeUrl(undefined)).toBe('#');
  });

  it('returns # for malformed URLs', () => {
    expect(safeUrl('not-a-url')).toBe('#');
  });
});
