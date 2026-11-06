import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { showToast } from '../js/toast.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const indexHtml = readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');

describe('CSP header and inline handlers', () => {
  it('has Content-Security-Policy meta tag', () => {
    expect(indexHtml).toContain('Content-Security-Policy');
  });

  it('does not contain inline onclick handlers in HTML', () => {
    expect(indexHtml).not.toMatch(/onclick\s*=/i);
  });
});

describe('showToast XSS sanitization', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not execute HTML in message — renders as plain text', () => {
    // Arrange
    const maliciousMessage = '<img src=x onerror=alert(1)>';
    const safeMessage = 'Normal error message';

    // Act
    showToast(maliciousMessage, 'error', 0);
    showToast(safeMessage, 'error', 0);

    // Assert — message text should appear escaped, not rendered as HTML
    const toastMessages = container.querySelectorAll('.toast-message');
    expect(toastMessages).toHaveLength(2);

    // First toast: no  element created in DOM (XSS prevented)
    const firstMsg = toastMessages[0];
    expect(firstMsg.querySelector('img')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(firstMsg.textContent).toContain(maliciousMessage);

    // Second toast: normal message preserved
    expect(toastMessages[1].textContent).toBe(safeMessage);
  });

  it('escapes <script> tags in message', () => {
    const scriptMessage = '<script>alert("xss")</script>';

    showToast(scriptMessage, 'warning', 0);

    const msgEl = container.querySelector('.toast-message');
    expect(msgEl.querySelector('script')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(msgEl.textContent).toContain(scriptMessage);
  });
});
