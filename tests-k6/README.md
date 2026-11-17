# BuildTrack k6 tests

These scripts test the frontend and backend independently. They do not start the
application, create test accounts, or change application data.

## What was verified

- The frontend is a React application served by Vite. Its development server
  defaults to `http://localhost:5173`; the Vite configuration does not set a
  different port. If port 5173 is busy, Vite can select another port, so use the
  URL printed by Vite.
- The backend is an Express application. `backend/server.js` uses
  `process.env.PORT` or defaults to port 5000. The frontend API client currently
  uses `http://localhost:5000/api`.
- The frontend API URL is hard-coded in its API client. These k6 tests accept
  production URLs independently, but the frontend availability check only
  validates the served HTML; it does not validate browser-side API calls.
- The backend exposes `GET /` as a JSON health response and protects
  `GET /api/auth/profile` with JWT authentication. Without a token, the expected
  response from the latter is HTTP 401 with an authentication message.
- PostgreSQL is an application dependency. The backend database module expects
  a local PostgreSQL database. The availability scripts below deliberately do
  not exercise database-backed or mutating routes.
- No listener was present on the default PostgreSQL port during inspection,
  although the backend health and unauthenticated profile routes responded.
  Those two HTTP checks therefore do not establish database readiness.
- The backend's CORS configuration allows the local Vite origin. k6 sends HTTP
  requests directly and does not enforce browser CORS rules.

At inspection time, `http://localhost:5173/` returned the BuildTrack HTML,
`http://localhost:5000/` returned the API health JSON, and
`http://localhost:5000/api/auth/profile` returned the expected HTTP 401. These
are point-in-time observations, not a guarantee that either server is running
when you later run k6.

## Prerequisites

- Grafana k6 installed and available as `k6` in CMD/PowerShell (`k6 version`).
- Node.js and npm, with the project dependencies installed.
- PostgreSQL running for normal backend operation, using the application's
  existing database configuration.
- The frontend and/or backend started separately before running the matching
  test. These tests do not start, stop, or configure either service.

## Start the application

Start PostgreSQL first. In a CMD window, start the backend:

```cmd
cd /d D:\Projet_PFE\backend
npm start
```

PowerShell:

```powershell
Set-Location D:\Projet_PFE\backend
npm start
```

In a second terminal, start the Vite development server. CMD:

```cmd
cd /d D:\Projet_PFE\frontend
npm run dev
```

PowerShell:

```powershell
Set-Location D:\Projet_PFE\frontend
npm run dev
```

Use the exact frontend URL printed by Vite. Do not assume it stayed on port
5173 if that port was already occupied.

## Configure target URLs

The scripts have safe local defaults, but accept explicit URLs so they can test
local development servers or deployed environments:

- `FRONTEND_URL`: frontend origin/base URL; default `http://localhost:5173`.
- `FRONTEND_PATH`: frontend page path; default `/`.
- `API_URL`: backend origin/base URL; default `http://localhost:5000`.
- `MAX_FAILURE_RATE`: maximum allowed HTTP request failure rate; default
  `0.01` (1%). Values must be greater than 0 and no greater than `0.1`.
- `P95_THRESHOLD_MS`: maximum allowed p95 HTTP request duration in
  milliseconds; default `1000`. Values must be from 1 to 60000.
- `REQUEST_SLEEP_SECONDS`: delay between performance-test requests; default
  `1` second. Values must be from 0.5 to 10 seconds.

Do not put passwords or tokens in URLs. The scripts reject credentials, query
strings, and fragments in the configured base URLs. Use an authorized test
environment for deployment checks.

## Test A — frontend availability

This is a single request, not a load test. It checks HTTP 200, a non-empty
response, and the BuildTrack HTML shell.

CMD:

```cmd
cd /d D:\Projet_PFE\tests-k6
k6 run -e FRONTEND_URL=http://localhost:5173 test-site.js
```

PowerShell:

```powershell
Set-Location D:\Projet_PFE\tests-k6
k6 run -e FRONTEND_URL=http://localhost:5173 .\test-site.js
```

For a deployment, substitute its frontend URL, for example
`-e FRONTEND_URL=https://your-authorized-host.example`.

## Test B — backend/API availability

This sends two read-only GET requests: the API health route should return HTTP
200 and the protected profile route should reject an unauthenticated request
with HTTP 401. It does not log in or modify user data. The expected 401 is
explicitly marked as an expected HTTP status, not a failed request.

CMD:

```cmd
cd /d D:\Projet_PFE\tests-k6
k6 run -e API_URL=http://localhost:5000 test-api.js
```

PowerShell:

```powershell
Set-Location D:\Projet_PFE\tests-k6
k6 run -e API_URL=http://localhost:5000 .\test-api.js
```

The profile check verifies the authentication boundary, not an authenticated
profile read or database readiness. No credentials are needed or accepted by
this test.

## Test C — performance

Run the baseline first. It defaults to 1 VU for 30 seconds, checks the same
frontend HTML contract as Test A, and sleeps for 1 second after every request.
That pacing is approximately at most 1 request per second at the default load
(actual throughput is lower when response time is non-zero). `VUS` is limited
to 1–5 and `DURATION` to 5–300 seconds.

CMD:

```cmd
cd /d D:\Projet_PFE\tests-k6
k6 run -e FRONTEND_URL=http://localhost:5173 -e VUS=1 -e DURATION=30s baseline.js
```

PowerShell:

```powershell
Set-Location D:\Projet_PFE\tests-k6
k6 run -e FRONTEND_URL=http://localhost:5173 -e VUS=1 -e DURATION=30s .\baseline.js
```

Only after the baseline passes, optionally run the gradual profile. It stages
1, 2, then 5 VUs and ramps down, using 30 seconds per stage by default. With
the default 1-second pacing, the peak request rate is approximately at most 5
requests per second. The stage duration can be set from 10 to 120 seconds.
Run it only against a service you are authorized to test; it is not run
automatically.

CMD:

```cmd
cd /d D:\Projet_PFE\tests-k6
k6 run -e FRONTEND_URL=http://localhost:5173 -e STAGE_DURATION=30s gradual-load.js
```

PowerShell:

```powershell
Set-Location D:\Projet_PFE\tests-k6
k6 run -e FRONTEND_URL=http://localhost:5173 -e STAGE_DURATION=30s .\gradual-load.js
```

For any test, thresholds can be overridden explicitly, for example:

```cmd
k6 run -e P95_THRESHOLD_MS=1500 -e MAX_FAILURE_RATE=0.02 test-site.js
```

PowerShell:

```powershell
k6 run -e P95_THRESHOLD_MS=1500 -e MAX_FAILURE_RATE=0.02 .\test-site.js
```

## Reading results and troubleshooting

- `checks_succeeded` should be 100%. The check names identify whether the
  status, response content, API JSON shape, or expected authentication response
  did not match.
- `http_req_failed` should stay below `MAX_FAILURE_RATE`; `http_req_duration`
  p95 should stay below `P95_THRESHOLD_MS`. A threshold failure makes k6 exit
  unsuccessfully. Do not raise a threshold merely to hide a broken endpoint.
- A `status=0` diagnostic means k6 received no HTTP response. The diagnostic
  includes k6's transport error and error code, while omitting response bodies
  and headers. Check that the service is running and that the configured URL is
  reachable from the same machine/network environment as k6. `connection
  refused` usually means no listener at that host/port; DNS and timeout errors
  point to name resolution or reachability/firewall problems. If k6 runs in
  WSL, a container, or another host, `localhost` refers to that environment,
  not necessarily Windows.
- HTTP 404 means the server was reached but the requested route/path is wrong
  or is not mounted. Confirm the printed Vite URL, `API_URL`, and route paths.
- HTTP 500 means the request reached the application but it failed while
  handling the request. Check the backend logs and, for database-backed routes,
  PostgreSQL availability and schema. The API test here intentionally avoids
  such routes.
- A 401 from the protected profile route is expected and required by Test B.
  A 401 from the health route, or any other unexpected status, is a failure.
  The test does not use tokens; do not disable authentication to make it pass.
- A failed p95 threshold indicates the service exceeded the configured latency
  target; inspect the baseline before attempting the gradual profile.

## Original failure diagnosis

The existing script targeted `http://localhost:5173`, which matches the
verified Vite default, and included a one-second `sleep()`. At the time of
inspection, that URL returned non-empty BuildTrack HTML. The backend's verified
default was port 5000, not 5173.

The reported combination of 100% failed requests with zero data received and
near-zero duration is consistent with a transport failure where k6 received no
HTTP response; it does not by itself distinguish connection refusal, DNS,
timeout, or a network-namespace mismatch. The old run's exact transport error
was not available, and k6 is not on PATH in the inspected environment, so that
historical failure could not be reproduced here. The live HTTP probes now
succeed on the configured frontend URL.

Also, the inspected file's 5 VUs, 30-second duration, and one-second sleep
cannot produce thousands of iterations: it should produce roughly 150 or
fewer, depending on request time. A thousands-iteration result therefore does
not match this file as inspected; verify the exact script path and command
used for that run. The revised scripts report status and transport diagnostics
without logging response bodies, headers, or credentials.
