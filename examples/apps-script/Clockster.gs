/**
 * Clockster Company API v3 from Google Apps Script.
 *
 * The npm package does not run here: Apps Script has no fetch, Headers or FormData, and no npm.
 */

const CLOCKSTER_BASE_URL = 'https://api.clockster.com/company/v3';

const CLOCKSTER_MAX_RETRIES = 4;

/**
 * One call, answering the `data` of the response.
 *
 * @param {string} path e.g. 'users'
 * @param {Object} [query] query parameters; null and undefined are left out
 * @param {Object} [options] { method, body } for a write
 */
function clocksterCall_(path, query, options) {
  const settings = options || {};
  const url = CLOCKSTER_BASE_URL + '/' + path + clocksterQuery_(query);

  const request = {
    method: settings.method || 'get',
    headers: { Authorization: 'Bearer ' + clocksterToken_() },
    // Without this a 4xx throws before the error body can be read.
    muteHttpExceptions: true,
  };

  if (settings.body) {
    request.contentType = 'application/json';
    request.payload = JSON.stringify(settings.body);
  }

  for (let attempt = 1; attempt <= CLOCKSTER_MAX_RETRIES; attempt++) {
    const response = UrlFetchApp.fetch(url, request);
    const status = response.getResponseCode();

    if (status === 429 && attempt < CLOCKSTER_MAX_RETRIES) {
      Utilities.sleep(clocksterRetryAfter_(response) * 1000);
      continue;
    }

    const body = clocksterParse_(response);

    if (status >= 200 && status < 300) {
      return body;
    }

    throw new Error(clocksterRefusal_(status, body));
  }

  throw new Error('Clockster: rate limited after ' + CLOCKSTER_MAX_RETRIES + ' attempts.');
}

/**
 * Every page of a cursor-paged listing, handed to `onPage` as it arrives.
 *
 * @param {string} path e.g. 'users'
 * @param {Object} [query] filters, without `cursor`
 * @param {function(Array<Object>)} onPage
 */
function clocksterEachPage_(path, query, onPage) {
  let cursor = null;
  const seen = {};

  do {
    const answer = clocksterCall_(path, Object.assign({}, query || {}, { cursor: cursor }));

    onPage(answer.data);

    cursor = answer.meta ? answer.meta.next_cursor : null;

    // A cursor that repeats would loop until the six-minute limit kills the script.
    if (cursor && seen[cursor]) {
      return;
    }

    if (cursor) {
      seen[cursor] = true;
    }
  } while (cursor);
}

/** The API key, from Project Settings → Script Properties. */
function clocksterToken_() {
  const token = PropertiesService.getScriptProperties().getProperty('CLOCKSTER_TOKEN');

  if (!token) {
    throw new Error('Set CLOCKSTER_TOKEN in the script properties (Project Settings → Script Properties).');
  }

  return token;
}

/** Query string; Apps Script has no URLSearchParams. */
function clocksterQuery_(query) {
  const parts = [];

  Object.keys(query || {}).forEach(function (key) {
    const value = query[key];

    if (value === null || value === undefined || value === '') {
      return;
    }

    // A list travels comma-separated, which is how the API documents it.
    const one = Array.isArray(value) ? value.join(',') : value;

    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(one));
  });

  return parts.length ? '?' + parts.join('&') : '';
}

function clocksterParse_(response) {
  const text = response.getContentText();

  try {
    return JSON.parse(text);
  } catch (error) {
    // An edge refusal can answer before the application does, and need not be JSON.
    throw new Error('Clockster answered ' + response.getResponseCode() + ' with a body that is not JSON: ' + text.slice(0, 200));
  }
}

/** Quote `request_id` when asking us about a call. */
function clocksterRefusal_(status, body) {
  const error = body && body.error ? body.error : {};
  const fields = error.errors ? ' ' + JSON.stringify(error.errors) : '';

  return 'Clockster ' + status + ' ' + (error.code || 'unknown') + ': ' + (error.message || '') + fields +
    ' (request_id ' + (error.request_id || '-') + ')';
}

/** Seconds to wait, from Retry-After; header names arrive in any case. */
function clocksterRetryAfter_(response) {
  const headers = response.getHeaders();
  const name = Object.keys(headers).filter(function (key) {
    return key.toLowerCase() === 'retry-after';
  })[0];

  const seconds = name ? parseInt(headers[name], 10) : NaN;

  return isNaN(seconds) ? 5 : Math.min(seconds, 60);
}
