// Walking a cursor-paged listing. Thirteen of them page this way, and the loop is the same each time.

/** One page as a listing answers it: rows, and the cursor for the next page. */
export interface Page<TRow> {
  data?: {
    data: TRow[];
    meta: { next_cursor: null | string };
  };
  error?: unknown;
}

/** Thrown when a page is refused, since a half-read listing is not a result. */
export class PaginationError extends Error {
  readonly refusal: unknown;

  constructor(refusal: unknown) {
    super('A page was refused; the listing is incomplete.');
    this.name = 'PaginationError';
    this.refusal = refusal;
  }
}

/**
 * Every row of a listing, one page at a time.
 *
 * Takes a function of the cursor rather than the method itself: the generated methods read
 * `this`, and a caller passing extra filters would have to thread them through anyway.
 *
 * @throws {PaginationError} when a page is refused.
 *
 * @example
 * for await (const user of paginate((cursor) =>
 *   clockster.users.list({ query: { per_page: 100, cursor } }),
 * )) {
 *   console.log(user.id);
 * }
 */
export async function* paginate<TRow>(
  page: (cursor: string | null) => Promise<Page<TRow>>,
): AsyncGenerator<TRow, void, undefined> {
  let cursor: string | null = null;
  const seen = new Set<string>();

  do {
    const answer = await page(cursor);

    if (!answer.data) {
      throw new PaginationError(answer.error);
    }

    yield* answer.data.data;

    cursor = answer.data.meta.next_cursor;

    // A cursor that repeats would loop until the process is killed, which is worse than stopping.
    if (cursor !== null && seen.has(cursor)) {
      return;
    }

    if (cursor !== null) {
      seen.add(cursor);
    }
  } while (cursor !== null);
}
