import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { verifyWebhook, WebhookVerificationError } from '../src/webhooks.ts';

const SECRET = '0000000000000000000000000000000000000000000000000000000000000000';

// Mirrors WebhookEnvelopeService::headers() in the backend: sha256= over `<timestamp>.<body>`.
function sign(body: string, timestamp: string, secret = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')}`;
}

function delivery(overrides: { body?: string; timestamp?: string; secret?: string } = {}) {
  const timestamp = overrides.timestamp ?? new Date().toISOString();
  const body = overrides.body ?? JSON.stringify({ id: 1, event: 'task.completed', occurred_at: timestamp, data: {} });

  return { body, timestamp, signature: sign(body, timestamp, overrides.secret), secret: SECRET };
}

test('returns the event of a genuine delivery', () => {
  const event = verifyWebhook(delivery());

  assert.equal(event.event, 'task.completed');
  assert.equal(event.id, 1);
});

test('accepts the raw body as bytes', () => {
  const { body, ...rest } = delivery();

  assert.equal(verifyWebhook({ ...rest, body: Buffer.from(body, 'utf8') }).event, 'task.completed');
});

test('refuses a body altered after signing', () => {
  const sent = delivery();

  assert.throws(
    () => verifyWebhook({ ...sent, body: sent.body.replace('task.completed', 'task.approved') }),
    (error: WebhookVerificationError) => error.reason === 'signature_mismatch',
  );
});

test('refuses a signature made with another secret', () => {
  assert.throws(
    () => verifyWebhook(delivery({ secret: 'f'.repeat(64) })),
    (error: WebhookVerificationError) => error.reason === 'signature_mismatch',
  );
});

// Re-serialising a parsed body is the mistake this package exists to prevent.
test('refuses a body re-serialised from the parsed object', () => {
  const sent = delivery({ body: '{"id":1,  "event":"task.completed","occurred_at":"x","data":{}}' });

  assert.throws(
    () => verifyWebhook({ ...sent, body: JSON.stringify(JSON.parse(sent.body)) }),
    (error: WebhookVerificationError) => error.reason === 'signature_mismatch',
  );
});

test('refuses a delivery older than the tolerance', () => {
  const timestamp = new Date(Date.now() - 3600 * 1000).toISOString();

  assert.throws(
    () => verifyWebhook(delivery({ timestamp })),
    (error: WebhookVerificationError) => error.reason === 'timestamp_outside_tolerance',
  );
});

test('accepts an old delivery when the tolerance is disabled', () => {
  const timestamp = new Date(Date.now() - 3600 * 1000).toISOString();

  assert.equal(verifyWebhook({ ...delivery({ timestamp }), toleranceSeconds: 0 }).event, 'task.completed');
});

// The timestamp is signed, so moving it forward invalidates the signature rather than the age.
test('refuses a replay whose timestamp was moved forward', () => {
  const sent = delivery({ timestamp: new Date(Date.now() - 3600 * 1000).toISOString() });

  assert.throws(
    () => verifyWebhook({ ...sent, timestamp: new Date().toISOString() }),
    (error: WebhookVerificationError) => error.reason === 'signature_mismatch',
  );
});

test('refuses a missing or unknown signature', () => {
  const sent = delivery();

  assert.throws(
    () => verifyWebhook({ ...sent, signature: undefined }),
    (error: WebhookVerificationError) => error.reason === 'missing_signature',
  );

  assert.throws(
    () => verifyWebhook({ ...sent, signature: sent.signature.replace('sha256=', 'sha512=') }),
    (error: WebhookVerificationError) => error.reason === 'unknown_scheme',
  );

  assert.throws(
    () => verifyWebhook({ ...sent, timestamp: undefined }),
    (error: WebhookVerificationError) => error.reason === 'missing_timestamp',
  );
});

test('reports an unreadable timestamp separately from a stale one', () => {
  const timestamp = 'not-a-date';

  assert.throws(
    () => verifyWebhook(delivery({ timestamp })),
    (error: WebhookVerificationError) => error.reason === 'timestamp_unreadable',
  );
});

test('reports a signed body that is not JSON', () => {
  assert.throws(
    () => verifyWebhook(delivery({ body: 'not json' })),
    (error: WebhookVerificationError) => error.reason === 'body_unparseable',
  );
});
