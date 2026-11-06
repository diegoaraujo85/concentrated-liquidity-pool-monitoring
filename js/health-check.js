// Health check utilities — monitor API availability
export const HealthStatus = {
  OK: 'ok',
  ERROR: 'error',
};

export class HealthResult {
  constructor(status, responseTime, error = null) {
    this.status = status;
    this.responseTime = responseTime;
    this.error = error;
    this.checkedAt = new Date().toISOString();
  }
}

export async function checkApiHealth(url, timeoutMs = 10000) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return new HealthResult(HealthStatus.ERROR, null, `HTTP ${response.status}`);
    }

    return new HealthResult(HealthStatus.OK, Date.now() - start);
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      return new HealthResult(HealthStatus.ERROR, null, 'Request timeout');
    }
    return new HealthResult(HealthStatus.ERROR, null, e.message || 'Unknown error');
  }
}

export async function checkAllApis(apis, timeoutMs = 10000) {
  const results = {};
  for (const api of apis) {
    results[api.name] = await checkApiHealth(api.url, timeoutMs);
  }
  return results;
}
