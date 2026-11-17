import http from 'k6/http';
import { check } from 'k6';
import { getBaseUrl, getTargetUrl, getThresholds, reportFailure } from './common.js';

const frontendUrl = getBaseUrl('FRONTEND_URL', 'http://localhost:5173');
const frontendPath = __ENV.FRONTEND_PATH || '/';
const targetUrl = getTargetUrl(frontendUrl, frontendPath);

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: getThresholds(),
};

export default function () {
  const response = http.get(targetUrl, {
    timeout: '5s',
    responseCallback: http.expectedStatuses(200),
    tags: { name: 'frontend availability' },
  });

  const passed = check(response, {
    'frontend returns HTTP 200': (result) => result.status === 200,
    'frontend returns a non-empty page': (result) =>
      typeof result.body === 'string' && result.body.trim().length > 0,
    'frontend serves the BuildTrack application': (result) =>
      typeof result.body === 'string' &&
      result.body.includes('<div id="root">') &&
      result.body.includes('<title>BuildTrack</title>'),
  });

  reportFailure('frontend availability', response, passed);
}
