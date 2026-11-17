import http from 'k6/http';
import { check } from 'k6';
import {
  getBaseUrl,
  getTargetUrl,
  getThresholds,
  isJsonObjectMatching,
  reportFailure,
} from './common.js';

const apiUrl = getBaseUrl('API_URL', 'http://localhost:5000');
const healthUrl = getTargetUrl(apiUrl, '/');
const profileUrl = getTargetUrl(apiUrl, '/api/auth/profile');

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: getThresholds(),
};

export default function () {
  const healthResponse = http.get(healthUrl, {
    timeout: '5s',
    responseCallback: http.expectedStatuses(200),
    tags: { name: 'API health' },
  });

  const healthPassed = check(healthResponse, {
    'API health returns HTTP 200': (response) => response.status === 200,
    'API health returns the BuildTrack JSON structure': (response) =>
      isJsonObjectMatching(
        response,
        (body) =>
          body.message === 'BuildTrack API' &&
          typeof body.version === 'string' &&
          body.status === 'running',
      ),
  });
  reportFailure('API health', healthResponse, healthPassed);

  const profileResponse = http.get(profileUrl, {
    timeout: '5s',
    responseCallback: http.expectedStatuses(401),
    tags: { name: 'unauthenticated profile access' },
  });

  const profilePassed = check(profileResponse, {
    'protected profile endpoint requires authentication (HTTP 401)': (response) =>
      response.status === 401,
    'authentication failure returns a JSON message': (response) =>
      isJsonObjectMatching(response, (body) => body.message === 'Access token required'),
  });
  reportFailure('protected profile endpoint', profileResponse, profilePassed);
}
