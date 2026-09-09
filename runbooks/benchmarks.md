# Load Test Results

Measured, not estimated — run with [k6](https://k6.io) against the actual
running Docker Compose stack on this dev machine. Numbers below are from one
real run; re-run the command yourself before quoting these in a report if
meaningful time has passed or the hardware differs (this machine's own specs
affect throughput, so this is not a claim about production capacity).

## Methodology

```bash
# k6-script.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    catalog_read: { executor: 'constant-vus', vus: 20, duration: '30s' },
  },
  thresholds: { http_req_duration: ['p(95)<1000'] },
};

export default function () {
  const res = http.get('http://host.docker.internal:4102/v1/catalog/artworks', {
    headers: { 'x-service-token': '<ATELIER_INTERNAL_SERVICE_TOKEN>' },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

```bash
docker run --rm --add-host=host.docker.internal:host-gateway \
  -v "<absolute-path-to-k6-script.js>:/script.js:ro" \
  grafana/k6:latest run /script.js
```

Target: `GET /v1/catalog/artworks` on `catalog-discovery-service` — the same
read-model endpoint used in `scripts/smoke-test.sh`, chosen because it's a
realistic "browse the marketplace" read against the Postgres-backed read
model (not a static health check).

## Results (2026-09-07, 20 concurrent VUs, 30s, this dev machine)

| Metric | Value |
|---|---|
| Total requests | 54,682 |
| Throughput | 1,820 req/s |
| Failed requests | 0 (0.00%) |
| Checks passed | 54,682 / 54,682 (100%) |
| avg latency | 10.89 ms |
| median (p50) | 5.03 ms |
| p90 | 45.79 ms |
| p95 | 56.24 ms |
| max | 185.41 ms |

No errors, no timeouts, no degradation over the 30s window at this
concurrency. p95 comfortably inside the 1000ms threshold checked by the test
itself.

## What this does and doesn't tell you

- This is a **single-endpoint, read-heavy** benchmark on **one developer
  machine**, not a production capacity plan. Treat it as "the read path
  isn't obviously slow," not as an SLA.
- Not tested here: write-heavy paths (`checkout`, `reservations`) under
  concurrent load — Phase 5's concurrency test already exercises correctness
  under contention (see the inventory-reservation work), but not throughput
  under sustained load. Extending this script to a write scenario would need
  care to avoid exhausting the small seed dataset of artworks (each
  successful checkout consumes one) — worth doing with a larger synthetic
  dataset if a real capacity number is ever needed, out of scope here.
- No comparison point (this is the first and only run) — a regression
  baseline would need this re-run on the same hardware after future changes.
