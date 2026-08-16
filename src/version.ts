/**
 * This package's version, and the User-Agent built from it.
 *
 * A leaf module: the version is kept in step with package.json by a test, and nothing else here
 * reads both.
 */
export const VERSION = '0.7.1';

/**
 * Sent so our request log says which client made a call rather than which runtime did.
 *
 * A browser drops the header — it is one a page is not allowed to set — which is no loss: this
 * token belongs on a server, not in a page.
 */
export const DEFAULT_USER_AGENT = `clockster-typescript/${VERSION}`;
