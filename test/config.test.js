import { describe, it, expect } from 'vitest';
import { CONFIG } from '../js/config.js';

function deepFreeze(obj) {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((name) => {
    const prop = obj[name];
    if (prop && typeof prop === 'object' && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  });
  return obj;
}

describe('CONFIG immutability — Object.freeze', () => {
  it('root CONFIG object is frozen', () => {
    expect(Object.isFrozen(CONFIG)).toBe(true);
  });

  it('NETWORKS is deeply frozen', () => {
    expect(Object.isFrozen(CONFIG.NETWORKS)).toBe(true);
    expect(Object.isFrozen(CONFIG.NETWORKS.ethereum)).toBe(true);
  });

  it('PROTOCOLS is deeply frozen', () => {
    expect(Object.isFrozen(CONFIG.PROTOCOLS)).toBe(true);
    expect(Object.isFrozen(CONFIG.PROTOCOLS['uniswap-v3'])).toBe(true);
  });

  it('SCORING is deeply frozen', () => {
    expect(Object.isFrozen(CONFIG.SCORING)).toBe(true);
  });

  it('RANGES is deeply frozen', () => {
    expect(Object.isFrozen(CONFIG.RANGES)).toBe(true);
  });

  it('mutating a nested property does not change value', () => {
    const original = CONFIG.NETWORKS.ethereum.color;
    try {
      CONFIG.NETWORKS.ethereum.color = '#000000';
    } catch (e) {
      // expected in strict mode — mutation is blocked
    }
    expect(CONFIG.NETWORKS.ethereum.color).toBe(original);
  });

  it('adding new property to root does not work', () => {
    const keysBefore = Object.keys(CONFIG);
    try {
      CONFIG.newProp = 'test';
    } catch (e) {
      // expected in strict mode — mutation is blocked
    }
    expect(Object.keys(CONFIG)).toEqual(keysBefore);
    expect(CONFIG.newProp).toBeUndefined();
  });

  it('deepFreeze utility works on nested objects', () => {
    const obj = { a: { b: { c: 1 } } };
    deepFreeze(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.a)).toBe(true);
    expect(Object.isFrozen(obj.a.b)).toBe(true);
    try {
      obj.a.b.c = 999;
    } catch (e) {
      // expected in strict mode
    }
    expect(obj.a.b.c).toBe(1);
  });
});
