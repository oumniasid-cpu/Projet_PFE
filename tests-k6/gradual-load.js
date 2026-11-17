import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  getBaseUrl,
  getBoundedDuration,
  getPacingSeconds,
  getTargetUrl,
  getThresholds,
  reportFailure,
} from './common.js';

const frontendUrl = getBaseUrl('FRONTEND_URL', 'http://localhost:5173');
const frontendPath = __ENV.FRONTEND_PATH || '/';
const targetUrl = getTargetUrl(frontendUrl, frontendPath);
const stageDuration = getBoundedDuration('STAGE_DURATION', '30s', 10, 120);
const pacingSeconds = getPacingSeconds();
let diagnosticReported = false;

export const options = {
  scenarios: {
    gradual_frontend_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: stageDuration, target: 1 },
        { duration: stageDuration, target: 2 },
        { duration: stageDuration, target: 5 },
        { duration: stageDuration, target: 0 },
      ],
    },
  },
  thresholds: getThresholds(),
};

export default function () {
  const response = http.get(targetUrl, {
    timeout: '5s',
    responseCallback: http.expectedStatuses(200),
    tags: { name: 'gradual frontend load' },
  });

  const passed = check(response, {
    'frontend under gradual load returns HTTP 200': (result) => result.status === 200,
    'frontend under gradual load returns a non-empty page': (result) =>
      typeof result.body === 'string' && result.body.trim().length > 0,
    'frontend under gradual load serves the BuildTrack application': (result) =>
      typeof result.body === 'string' &&
      result.body.includes('<div id="root">') &&
      result.body.includes('<title>BuildTrack</title>'),
  });

  if (!passed && !diagnosticReported) {
    reportFailure('gradual frontend load', response, passed);
    diagnosticReported = true;
  }

  sleep(pacingSeconds);
}
