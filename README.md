# @clockster/sdk

Official TypeScript SDK for the [Clockster Company API](https://api.clockster.com/openapi/v3.json).

Server-to-server client for a company's employees, structure, schedules, attendance, tasks and
documents. Typed from the API's OpenAPI document. No runtime dependencies.

```bash
npm install @clockster/sdk
```

Requires Node 22 or newer.

## Quickstart

One token authenticates one company. Create it under Settings → API in the web application.

```ts
import { Clockster } from '@clockster/sdk';

const clockster = new Clockster({ token: process.env.CLOCKSTER_TOKEN });

const me = await clockster.me({ throwOnError: true });

const locations = await clockster.locations.upsert({
  body: { items: [{ external_id: 'HQ', title: 'Head office' }] },
  throwOnError: true,
});

await clockster.users.upsert({
  body: {
    users: [
      {
        external_id: 'HR-1',
        first_name: 'Aisulu',
        role: 'employee',
        location_id: locations.data.data[0].id,
      },
    ],
  },
  throwOnError: true,
});

const timesheets = await clockster.timesheets.list({
  query: { date_from: '2026-08-01', date_to: '2026-08-31' },
  throwOnError: true,
});
```

Two envelopes: the client returns `{ data, error }` and the API answers `{ data }`, so rows are
`response.data.data`.

## Refusals

Without `throwOnError` nothing throws and `data` is optional. Narrow on `error`:

```ts
const users = await clockster.users.list({ query: { per_page: 100 } });

if (users.error) {
  console.error(users.error.error.code, users.error.error.request_id);
  return;
}

console.log(users.data.data.length);
```

`error.code` is what to branch on; `error.message` is for a log; quote `error.request_id` when
asking us about a call. `422` adds `error.errors`, naming the fields.

## What is available

| Group | Operations |
| --- | --- |
| `me()` | — |
| `users` | `list` `get` `upsert` `dismiss` |
| `locations`, `departments`, `positions`, `userFilters` | `list` `get` `upsert` `delete` |
| `schedules` | `create` `get` `delete` |
| `attendance` | `list` `record` |
| `timesheets` | `list` |
| `tasks` | `list` `get` `upsert` |
| `documents` | `list` `get` `upsert` `delete` |
| `files` | `upload` |
| `payroll.payslips` | `list` |
| `userRequests` | `list` `get` |
| `webhooks` | `list` `get` `create` `update` `delete` `rotateSecret` |
| `webhooks.deliveries` | `list` `get` `redeliver` |
| `webhooks.events` | `list` |

## Paging

Listings are cursor-paged. Pass the previous `meta.next_cursor` and stop when it is null. A cursor
is bound to the filters it was issued under; change them and start again.

```ts
let cursor: string | null = null;

do {
  const page: Awaited<ReturnType<typeof clockster.users.list<true>>> = await clockster.users.list({
    query: { per_page: 100, cursor },
    throwOnError: true,
  });

  for (const user of page.data.data) {
    console.log(user.external_id ?? user.id);
  }

  cursor = page.data.meta.next_cursor;
} while (cursor);
```

The annotation is needed only because `cursor` is assigned from the result inside its own loop.

## Webhooks

`verifyWebhook` takes the body as received and returns the event, so the only path to the event
runs through the check.

```ts
import { verifyWebhook, WebhookVerificationError } from '@clockster/sdk/webhooks';

app.post('/clockster', express.raw({ type: 'application/json' }), (request, response) => {
  try {
    const event = verifyWebhook({
      body: request.body,
      signature: request.header('X-Clockster-Signature'),
      timestamp: request.header('X-Clockster-Timestamp'),
      secret: process.env.CLOCKSTER_WEBHOOK_SECRET,
    });

    response.sendStatus(202);
    queue.push(event);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return response.sendStatus(400);
    }

    throw error;
  }
});
```

- Pass the **raw bytes**. Re-serialising a parsed object does not reproduce what was signed.
- Answer **2xx quickly** and do the work afterwards; a timeout is retried.
- Deduplicate on **`id`**. The same event may arrive twice.

Deliveries older than five minutes are refused as replays; `toleranceSeconds` changes that.

## Versioning

Semver, independent of the API version. This package targets Company API v3; a new API version is a
major release here, not a second package.

## Development

`src/generated` is produced from `openapi/company-v3.json` and committed, so an API change appears
in review as the lines of the client it moves.

```bash
npm run spec        # refresh the specification from the deployed API
npm run generate    # regenerate the client from it
npm run typecheck
npm test
```

CI checks that the committed client is what the committed specification produces, and that every
operation is reachable on it. Drift against the deployed API is checked nightly.

## Licence

MIT. See [LICENSE](LICENSE).
