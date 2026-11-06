import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const indexHtml = readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');

describe('Accessibility — HTML markup', () => {
  it('html has lang attribute', () => {
    expect(indexHtml).toMatch(/<html[^>]*lang=/i);
  });

  it('has meta viewport for mobile accessibility', () => {
    expect(indexHtml).toContain('viewport');
  });

  it('main content has id for skip navigation', () => {
    expect(indexHtml).toContain('id="app-content"');
  });

  it('toast container exists for aria-live announcements', () => {
    expect(indexHtml).toContain('id="toast-container"');
  });

  it('drawer has id for focus management', () => {
    expect(indexHtml).toContain('id="pool-drawer"');
  });

  it('modal has id for focus trap', () => {
    expect(indexHtml).toContain('id="column-modal"');
  });

  it('has title', () => {
    expect(indexHtml).toContain('<title>');
  });

  it('toast container has role=alert and aria-live=polite', () => {
    expect(indexHtml).toContain('role="alert"');
    expect(indexHtml).toContain('aria-live="polite"');
  });

  it('drawer has role=dialog and aria-modal=true', () => {
    expect(indexHtml).toContain('role="dialog"');
    expect(indexHtml).toContain('aria-modal="true"');
  });

  it('modal has role=dialog and aria-modal=true', () => {
    expect(indexHtml).toContain('role="dialog"');
    expect(indexHtml).toContain('aria-modal="true"');
  });

  it('close buttons have aria-label', () => {
    expect(indexHtml).toContain('aria-label="Fechar modal de colunas"');
    expect(indexHtml).toContain('aria-label="Fechar drawer de detalhes"');
  });

  it('header icon buttons have aria-label', () => {
    expect(indexHtml).toContain('aria-label="Atualizar dados"');
    expect(indexHtml).toContain('aria-label="Configurar colunas"');
    expect(indexHtml).toContain('aria-label="Alternar tema"');
  });
});

describe('Accessibility — no inline handlers in HTML', () => {
  it('index.html does not have inline onclick handlers', () => {
    expect(indexHtml).not.toMatch(/onclick\s*=/i);
  });
});
