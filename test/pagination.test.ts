import assert from 'node:assert/strict';
import { test } from 'node:test';

import { paginate, PaginationError, type Page } from '../src/pagination.ts';

/** A listing of `pages` pages, recording the cursor it was asked for each time. */
function listing(pages: string[][], asked: (string | null)[] = []) {
  return (cursor: string | null): Promise<Page<string>> => {
    asked.push(cursor);

    const index = cursor === null ? 0 : Number(cursor);
    const next = index + 1 < pages.length ? String(index + 1) : null;

    return Promise.resolve({
      data: { data: pages[index] ?? [], meta: { next_cursor: next } },
    });
  };
}

async function collect<T>(rows: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];

  for await (const row of rows) {
    out.push(row);
  }

  return out;
}

test('yields every row across every page', async () => {
  const rows = await collect(paginate(listing([['a', 'b'], ['c'], ['d', 'e']])));

  assert.deepEqual(rows, ['a', 'b', 'c', 'd', 'e']);
});

test('asks for the first page without a cursor, then for the one it was given', async () => {
  const asked: (string | null)[] = [];

  await collect(paginate(listing([['a'], ['b'], ['c']], asked)));

  assert.deepEqual(asked, [null, '1', '2']);
});

test('stops on a single page', async () => {
  const asked: (string | null)[] = [];

  assert.deepEqual(await collect(paginate(listing([['a']], asked))), ['a']);
  assert.deepEqual(asked, [null]);
});

test('yields nothing for an empty listing', async () => {
  assert.deepEqual(await collect(paginate(listing([[]]))), []);
});

test('throws the refusal rather than ending the listing quietly', async () => {
  const refused = (): Promise<Page<string>> =>
    Promise.resolve({ error: { error: { code: 'rate_limited' } } });

  await assert.rejects(collect(paginate(refused)), (error: PaginationError) => {
    assert.equal(error.name, 'PaginationError');
    assert.deepEqual(error.refusal, { error: { code: 'rate_limited' } });

    return true;
  });
});

test('refuses a refusal in the middle, after the rows it did read', async () => {
  let call = 0;

  const halfway = (): Promise<Page<string>> => {
    call += 1;

    return Promise.resolve(
      call === 1 ? { data: { data: ['a'], meta: { next_cursor: '1' } } } : { error: 'gone' },
    );
  };

  const rows: string[] = [];

  await assert.rejects(async () => {
    for await (const row of paginate(halfway)) {
      rows.push(row);
    }
  }, PaginationError);

  assert.deepEqual(rows, ['a']);
});

// A server that keeps handing back the same cursor would otherwise loop until the process is killed.
test('stops when a cursor repeats', async () => {
  let calls = 0;

  const stuck = (): Promise<Page<string>> => {
    calls += 1;

    return Promise.resolve({ data: { data: ['a'], meta: { next_cursor: 'same' } } });
  };

  const rows = await collect(paginate(stuck));

  assert.deepEqual(rows, ['a', 'a']);
  assert.equal(calls, 2);
});
