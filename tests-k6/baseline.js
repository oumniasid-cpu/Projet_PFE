import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  getBaseUrl,
  getBoundedDuration,
  getBoundedInteger,
  getPacingSeconds,
  getTargetUrl,
  getThresholds,
  reportFailure,
} from './common.js';

const frontendUrl = getBaseUrl('FRONTEND_URL', 'http://localhost:5173');
const frontendPath = __ENV.FRONTEND_PATH || '/';
const targetUrl = getTargetUrl(frontendUrl, frontendPath);
const vus = getBoundedInteger('VUS', 1, 1, 5);
const duration = getBoundedDuration('DURATION', '30s', 5, 300);
const pacingSeconds = getPacingSeconds();
let diagnosticReported = false;

export const options = {
  vus,
  duration,
  thresholds: getThresholds(),
};

export default function () {
  const response = http.get(targetUrl, {
    timeout: '5s',
    responseCallback: http.expectedStatuses(200),
    tags: { name: 'frontend baseline' },
  });

  const passed = check(response, {
    'frontend baseline returns HTTP 200': (result) => result.status === 200,
    'frontend baseline returns a non-empty page': (result) =>
      typeof result.body === 'string' && result.body.trim().length > 0,
    'frontend baseline serves the BuildTrack application': (result) =>
      typeof result.body === 'string' &&
      result.body.includes('<div id="root">') &&
      result.body.includes('<title>BuildTrack</title>'),
  });

  if (!passed && !diagnosticReported) {
    reportFailure('frontend baseline', response, passed);
    diagnosticReported = true;
  }

  sleep(pacingSeconds);
}
