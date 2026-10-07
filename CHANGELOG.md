# Changelog

## 0.11.0

### May break your build (types only)

Nothing. The seventeen values are additive.

### Changed in the API

Reaches you whether or not you update this package.

- A company may hold up to ten API keys, each with full access or read or write access per
  section, and every operation names the scope it needs. A call outside the key's scopes answers
  `403` with `insufficient_scope`. A key issued before scopes has full access.
- The limit of 100 requests a minute is counted against the company and shared by all of its keys.
- A document's `type` also takes `srts`, `vaccination`, `social_id`, `disability_certificate`,
  `large_family_certificate`, `asp_certificate`, `tech_passport`, `pension`, `rk_passport`,
  `student_card`, `vnzh`, `pcr_certificate`, `lbg_card`, `insurance_policy`, `hunter`, `oralman`
  and `attorney` — in the `types` filter, which now takes up to 49, and in
  `POST /documents/upsert`.
- The API is also served to AI agents as an MCP server at `https://api.clockster.com/company/mcp`;
  the document's introduction says how to connect one.

## 0.10.0

### May break your build (types only)

Nothing. Three operations are new.

### Changed in the API

Reaches you whether or not you update this package.

- `GET /payroll/payslips` answers the `external_id` of a dismissed employee. It was `null` on their
  payslips.

### New

- `clockster.payroll.singleAdjustments`: `list`, `create` and `delete` over
  `/payroll/single-adjustments` — one-off additions and deductions that the next calculation of a
  payslip takes in. `create` files up to 100 at a time, all or nothing; send an `Idempotency-Key` in
  `headers` so a retry does not file them twice. `type` is the union of the six types.

## 0.9.0

### May break your build (types only)

Nothing. The five values are additive.

### Changed in the API

Reaches you whether or not you update this package.

- A document's `type` also takes `driver_license`, `birth_certificate`, `marriage_certificate`,
  `divorce_certificate` and `change_fio_certificate` — in the `types` filter and in
  `POST /documents/upsert`.

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
