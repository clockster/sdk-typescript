import { createClient, createConfig, type Client } from './generated/client/index.js';
import { Clockster as Generated } from './generated/index.js';
import { DEFAULT_USER_AGENT } from './version.js';

// Argument and answer types of every operation. The class below shadows the generated one.
export * from './generated/index.js';

export { paginate, PaginationError, type Page } from './pagination.js';

export { VERSION, DEFAULT_USER_AGENT } from './version.js';

export const DEFAULT_BASE_URL = 'https://api.clockster.com';

export interface ClocksterOptions {
  /** The company API key, from Settings → API in the web application. */
  token: string;
  /** Point at a demo stand instead of production. */
  baseUrl?: string;
  /**
   * Name your integration in our request log, which is worth doing when several talk to the same
   * company. Defaults to this package and its version.
   */
  userAgent?: string;
  /** Replace the transport: a proxy, a retrying wrapper, a recording fetch. */
  fetch?: typeof globalThis.fetch;
}

/**
 * The client. Everything below the constructor is generated.
 *
 * Deliveries are verified with `verifyWebhook` from `@clockster/sdk/webhooks`.
 */
export class Clockster extends Generated {
  constructor(options: ClocksterOptions | { client: Client }) {
    if ('client' in options) {
      super({ client: options.client });

      return;
    }

    super({
      client: createClient(
        createConfig({
          baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
          // Read per request, so a rotated key does not require a new client.
          auth: () => options.token,
          headers: { 'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT },
          ...(options.fetch ? { fetch: options.fetch } : {}),
        }),
      ),
    });
  }
}
