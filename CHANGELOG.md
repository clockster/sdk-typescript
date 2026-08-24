# Changelog

## 0.8.0

### May break your build (types only)

Nothing changes on the wire. Defer with `@ts-expect-error` if you need to.

- `priority` was typed `'0' | '1'` and is now `0 | 1`. Send the number.
- `radius` no longer accepts `null`.
- The `employment` filter is the union of the ten terms rather than `string`.

### Changed in the API

Reaches you whether or not you update this package.

- A location's `radius` must be between 50 and 700. A value outside that is refused.
- `radius` cannot be cleared. Leave the key out to keep what is stored.
- `?employment=` takes only the ten terms of the set. An unknown one is refused rather than
  answering an empty page.

### New

- Every request body field carries a JSDoc comment, so the fields of a write are described where
  they are written.
