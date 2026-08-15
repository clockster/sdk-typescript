import { createHmac, timingSafeEqual } from 'node:crypto';

// A separate entry point: this needs Node crypto, the client needs only fetch.

/** A delivery. `id` is null on a trial delivery, which stands for no recorded event. */
export interface WebhookEvent<TData = unknown> {
  id: number | null;
  event: string;
  occurred_at: string;
  data: TData;
}

export type WebhookFailure =
  | 'missing_signature'
  | 'missing_timestamp'
  | 'unknown_scheme'
  | 'signature_mismatch'
  | 'timestamp_unreadable'
  | 'timestamp_outside_tolerance'
  | 'body_unparseable';

/** Thrown for anything that would make a delivery unsafe to act on. */
export class WebhookVerificationError extends Error {
  readonly reason: WebhookFailure;

  // Assigned rather than a parameter property, which is the one syntax Node cannot strip.
  constructor(message: string, reason: WebhookFailure) {
    super(message);
    this.name = 'WebhookVerificationError';
    this.reason = reason;
  }
}

export interface VerifyWebhookOptions {
  /** The body as received. Re-serialising a parsed object does not reproduce the signed bytes. */
  body: string | Uint8Array;
  /** `X-Clockster-Signature`. */
  signature: string | undefined | null;
  /** `X-Clockster-Timestamp`, an ISO 8601 instant rather than a Unix time. */
  timestamp: string | undefined | null;
  /** The signing secret of the endpoint. */
  secret: string;
  /** Maximum age in seconds; 0 accepts any. Refusing an old delivery is what stops a replay. */
  toleranceSeconds?: number;
}

const SCHEME = 'sha256=';

const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Verify a delivery and return the event it carries.
 *
 * @throws {WebhookVerificationError} when the delivery is not provably ours, or is too old.
 */
export function verifyWebhook<TData = unknown>(options: VerifyWebhookOptions): WebhookEvent<TData> {
  const { signature, timestamp } = options;

  if (!signature) {
    throw new WebhookVerificationError('No X-Clockster-Signature header.', 'missing_signature');
  }

  if (!timestamp) {
    throw new WebhookVerificationError('No X-Clockster-Timestamp header.', 'missing_timestamp');
  }

  if (!signature.startsWith(SCHEME)) {
    throw new WebhookVerificationError(`Signature is not ${SCHEME}<hex>.`, 'unknown_scheme');
  }

  const body =
    typeof options.body === 'string' ? Buffer.from(options.body, 'utf8') : Buffer.from(options.body);

  // The timestamp is inside what is signed, so it cannot be edited to widen the check below.
  const expected = createHmac('sha256', options.secret)
    .update(`${timestamp}.`, 'utf8')
    .update(body)
    .digest('hex');

  assertDigestMatches(signature.slice(SCHEME.length), expected);
  assertFresh(timestamp, options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS);

  return parse<TData>(body);
}

// Length is checked first because timingSafeEqual throws on a mismatch; it reveals nothing.
function assertDigestMatches(supplied: string, expected: string): void {
  const mismatch =
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied, 'utf8'), Buffer.from(expected, 'utf8'));

  if (mismatch) {
    throw new WebhookVerificationError(
      'Signature does not match the body. Verify the bytes as received, before parsing them.',
      'signature_mismatch',
    );
  }
}

function assertFresh(timestamp: string, toleranceSeconds: number): void {
  if (toleranceSeconds <= 0) {
    return;
  }

  const sent = Date.parse(timestamp);

  if (Number.isNaN(sent)) {
    throw new WebhookVerificationError(
      `Timestamp ${timestamp} is not an ISO 8601 instant.`,
      'timestamp_unreadable',
    );
  }

  // Absolute, so a receiver whose clock runs behind refuses rather than accepts indefinitely.
  if (Math.abs(Date.now() - sent) > toleranceSeconds * 1000) {
    throw new WebhookVerificationError(
      `Delivery is outside the ${toleranceSeconds}s tolerance.`,
      'timestamp_outside_tolerance',
    );
  }
}

function parse<TData>(body: Buffer): WebhookEvent<TData> {
  try {
    return JSON.parse(body.toString('utf8')) as WebhookEvent<TData>;
  } catch {
    throw new WebhookVerificationError('Body is signed but is not JSON.', 'body_unparseable');
  }
}
