// Schema validation for localStorage state — prevents injection attacks
export const SCHEMA = {
  theme: { type: 'string', allowed: ['dark', 'light'], default: 'dark' },
  monitor: {
    type: 'object',
    properties: {
      refreshInterval: { type: 'string', allowed: ['15s', '30s', '60s', '5min', 'manual'], default: '60s' },
      profile: { type: 'string', allowed: ['conservative', 'aggressive'], default: 'conservative' },
      viewPreset: { type: 'string', allowed: ['conservative', 'aggressive', 'custom'], default: 'conservative' },
      visibleColumns: { type: 'array', default: [] },
      filters: { type: 'object', default: {} }
    },
    default: {}
  },
  tracker: {
    type: 'object',
    properties: {
      wallets: { type: 'array', default: [] },
      refreshInterval: { type: 'string', allowed: ['15s', '30s', '60s', '5min', 'manual'], default: '60s' },
      viewPreset: { type: 'string', allowed: ['conservative', 'aggressive', 'custom'], default: 'conservative' },
      visibleColumns: { type: 'array', default: [] },
      filters: { type: 'object', default: {} }
    },
    default: {}
  }
};

export function validateSchema(raw, schema) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const result = {};
  for (const [key, def] of Object.entries(schema)) {
    if (def.type === 'string') {
      result[key] = (typeof raw[key] === 'string' && def.allowed && def.allowed.includes(raw[key]))
        ? raw[key] : def.default;
    } else if (def.type === 'object') {
      result[key] = validateObject(raw[key] || {}, def.properties, def.default);
    } else if (def.type === 'array') {
      result[key] = Array.isArray(raw[key]) ? raw[key] : def.default;
    }
  }
  return result;
}

function validateObject(rawObj, properties, fallback) {
  if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) return fallback || {};
  if (!properties) return rawObj; // object without schema (e.g. filters) — pass through
  const result = {};
  for (const [propKey, propDef] of Object.entries(properties)) {
    if (propDef.type === 'string') {
      result[propKey] = (typeof rawObj[propKey] === 'string' && propDef.allowed && propDef.allowed.includes(rawObj[propKey]))
        ? rawObj[propKey] : propDef.default;
    } else if (propDef.type === 'array') {
      result[propKey] = Array.isArray(rawObj[propKey]) ? rawObj[propKey] : propDef.default;
    } else if (propDef.type === 'object') {
      result[propKey] = validateObject(rawObj[propKey], propDef.properties, propDef.default);
    }
  }
  return result;
}

export function validateWallet(wallet) {
  if (!wallet || typeof wallet !== 'object') return null;
  const { address, network, label } = wallet;
  // Address must be a string, not starting with javascript:/data:
  if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  if (typeof network !== 'string') return null;
  if (typeof label !== 'string') return null;
  return { address, network, label };
}

export function validateWallets(rawWallets) {
  if (!Array.isArray(rawWallets)) return [];
  return rawWallets.map(validateWallet).filter(Boolean);
}
