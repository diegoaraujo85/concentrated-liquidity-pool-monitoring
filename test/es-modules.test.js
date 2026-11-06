import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function tryLoadAsESModule(filePath) {
  const code = readFileSync(path.resolve(__dirname, filePath), 'utf-8');
  const hasESExport = /export\s+(function|const|let|var|class|async function|\{)/.test(code);
  return { hasESExport, code };
}

describe('ES Modules migration', () => {
  it('config.js is an ES module (has export)', () => {
    const { hasESExport } = tryLoadAsESModule('../js/config.js');
    expect(hasESExport).toBe(true);
  });

  it('api.js is an ES module (has export)', () => {
    const { hasESExport } = tryLoadAsESModule('../js/api.js');
    expect(hasESExport).toBe(true);
  });

  it('scoring.js is an ES module (has export)', () => {
    const { hasESExport } = tryLoadAsESModule('../js/scoring.js');
    expect(hasESExport).toBe(true);
  });

  it('state.js is an ES module (has export)', () => {
    const { hasESExport } = tryLoadAsESModule('../js/state.js');
    expect(hasESExport).toBe(true);
  });

  it('ui.js is an ES module (has export)', () => {
    const { hasESExport } = tryLoadAsESModule('../js/ui.js');
    expect(hasESExport).toBe(true);
  });

  it('app.js is an ES module (has export)', () => {
    const { hasESExport } = tryLoadAsESModule('../js/app.js');
    expect(hasESExport).toBe(true);
  });
});
