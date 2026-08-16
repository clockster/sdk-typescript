# Google Sheets, via Google Apps Script

Pull employees and timesheets into a spreadsheet, by hand or every morning.

**This does not use `@clockster/sdk`.** Apps Script has no npm, and no `fetch`, `Headers` or
`FormData` for the generated client to run on. These two files are the same API over
`UrlFetchApp`, meant to be copied into a project as they are.

## Setup

1. In the spreadsheet: **Extensions → Apps Script**.
2. Create two files, `Clockster.gs` and `Sheets.gs`, and paste the ones from this folder.
3. **Project Settings → Script Properties → Add script property**: name `CLOCKSTER_TOKEN`, value
   the company API key from Settings → API in the Clockster web application.
4. Reload the spreadsheet. A **Clockster** menu appears.

The key lives in a script property rather than in the code so that sharing the spreadsheet does not
share the key, and so that a copy of the file starts without one.

## What it does

**Clockster → Sync employees** fills a sheet named `Employees`: id, your own `external_id`, name,
phone, location, department, position, hire and dismissal dates. Everybody, including the people
who have left — the listing answers with only the active ones unless asked.

**Clockster → Sync timesheets** fills `Timesheets` for the current month: planned and worked
seconds per person per day, with lateness, early leaving, under- and overtime. Seconds because
that is what the API answers with; divide in the sheet if you want hours.

**Clockster → Run employee sync every morning** installs a 6 a.m. trigger. Running it twice
replaces the trigger rather than adding a second one.

Both sheets are cleared and rewritten on each run, so anything typed into them is lost. Point
formulas at these sheets from another one rather than editing them in place.

## Limits worth knowing

A script is stopped after six minutes. Pages are written to the sheet as they arrive, so an
interrupted run leaves a partly filled sheet rather than an empty one — and a roster large enough
to hit the limit is better read by a real integration than by a spreadsheet.

Rate limiting is 100 calls a minute per token. A 429 is retried up to four times, honouring
`Retry-After`.

Refusals raise an error carrying `error.code`, `error.message` and `error.request_id` from the API.
Quote the request id when asking us about a call.

## Adapting it

`clocksterCall_('users', { per_page: 100 })` is one call and returns the `data` of the answer.
`clocksterEachPage_('users', {}, function (rows) { … })` walks a cursor-paged listing.

The full list of endpoints, filters and fields is at
[api.clockster.com/openapi/v3.json](https://api.clockster.com/openapi/v3.json), rendered on the
documentation page of the web application.
