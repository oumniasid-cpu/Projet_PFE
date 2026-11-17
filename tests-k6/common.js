export function getBaseUrl(environmentName, defaultUrl) {
  const rawUrl = __ENV[environmentName] || defaultUrl;
  const match =
    /^(https?):\/\/(?:[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?|\[[0-9A-Fa-f:.]+\])(?::(\d{1,5}))?(\/[^?#\s]*)?$/.exec(
      rawUrl,
    );

  if (!match || (match[2] !== undefined && Number(match[2]) > 65535)) {
    throw new Error(
      `${environmentName} must be an absolute HTTP(S) URL without credentials, a query, or a fragment.`,
    );
  }

  return rawUrl.replace(/\/+$/, '');
}

export function getTargetUrl(baseUrl, path) {
  return `${baseUrl}/${path.replace(/^\/+/, '')}`;
}

export function getThresholds() {
  const maxFailureRate = Number(__ENV.MAX_FAILURE_RATE || 0.01);
  const p95ThresholdMs = Number(__ENV.P95_THRESHOLD_MS || 1000);

  if (!Number.isFinite(maxFailureRate) || maxFailureRate <= 0 || maxFailureRate > 0.1) {
    throw new Error('MAX_FAILURE_RATE must be greater than 0 and no greater than 0.1.');
  }

  if (!Number.isFinite(p95ThresholdMs) || p95ThresholdMs <= 0 || p95ThresholdMs > 60000) {
    throw new Error('P95_THRESHOLD_MS must be between 1 and 60000.');
  }

  return {
    http_req_failed: [`rate<${maxFailureRate}`],
    http_req_duration: [`p(95)<${p95ThresholdMs}`],
    checks: ['rate==1'],
  };
}

export function getBoundedInteger(environmentName, defaultValue, minimum, maximum) {
  const rawValue = __ENV[environmentName];
  const value = rawValue === undefined ? defaultValue : Number(rawValue);

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${environmentName} must be an integer from ${minimum} to ${maximum}.`);
  }

  return value;
}

export function getPacingSeconds() {
  const rawValue = __ENV.REQUEST_SLEEP_SECONDS;
  const value = rawValue === undefined ? 1 : Number(rawValue);

  if (!Number.isFinite(value) || value < 0.5 || value > 10) {
    throw new Error('REQUEST_SLEEP_SECONDS must be between 0.5 and 10 seconds.');
  }

  return value;
}

export function getBoundedDuration(environmentName, defaultValue, minimumSeconds, maximumSeconds) {
  const value = __ENV[environmentName] || defaultValue;
  const match = /^(\d+)(ms|s|m)$/.exec(value);

  if (!match) {
    throw new Error(`${environmentName} must be a duration in milliseconds, seconds, or minutes.`);
  }

  const amount = Number(match[1]);
  const durationSeconds = amount * (match[2] === 'ms' ? 0.001 : match[2] === 'm' ? 60 : 1);

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds < minimumSeconds ||
    durationSeconds > maximumSeconds
  ) {
    throw new Error(
      `${environmentName} must be between ${minimumSeconds} and ${maximumSeconds} seconds.`,
    );
  }

  return value;
}

export function isJsonObjectMatching(response, predicate) {
  if (typeof response.body !== 'string') {
    return false;
  }

  let body;
  try {
    body = JSON.parse(response.body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return false;
    }
    throw error;
  }

  return body !== null && typeof body === 'object' && !Array.isArray(body) && predicate(body);
}

export function reportFailure(label, response, passed) {
  if (passed) {
    return;
  }

  const transportError = response.status === 0
    ? `; transport error=${response.error || 'no HTTP response'}; error_code=${
      response.error_code === undefined ? 'unknown' : response.error_code
    }`
    : '';

  console.error(
    `[k6] ${label} failed: HTTP status=${response.status}${transportError}. Response body and headers omitted.`,
  );
}
