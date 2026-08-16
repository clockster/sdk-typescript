/**
 * Filling a sheet from the Company API.
 *
 * Run `clocksterSyncEmployees` by hand, then `clocksterInstallDailyTrigger` for every morning.
 */

function clocksterSyncEmployees() {
  clocksterFillSheet_({
    sheet: 'Employees',
    path: 'users',
    query: { per_page: 100, include: ['location', 'department', 'position'] },
    headers: ['id', 'external_id', 'code', 'Name', 'Phone', 'Location', 'Department', 'Position', 'Hired', 'Dismissed'],
    row: function (user) {
      return [
        user.id,
        user.external_id,
        user.code,
        clocksterName_(user),
        user.phone,
        user.location ? user.location.title : '',
        user.department ? user.department.title : '',
        user.position ? user.position.title : '',
        user.date_hire,
        user.dismissed_at,
      ];
    },
  });
}

function clocksterSyncTimesheets() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);

  clocksterFillSheet_({
    sheet: 'Timesheets',
    path: 'timesheets',
    query: {
      per_page: 100,
      date_from: clocksterDate_(first),
      date_to: clocksterDate_(today),
      // `user` too: without it a row names the employee by id alone and the name column is empty.
      include: ['actual', 'variance', 'user'],
    },
    headers: ['Date', 'Employee', 'external_id', 'Planned', 'Worked', 'Late', 'Left early', 'Under', 'Over'],
    row: function (entry) {
      const variance = entry.variance || {};

      return [
        entry.date,
        clocksterName_(entry.user),
        entry.user.external_id,
        // Seconds. An empty cell is a day nobody was scheduled for; 0 is a shift of no length.
        entry.planned ? entry.planned.time_planned : '',
        entry.actual ? entry.actual.time_worked : '',
        variance.time_late,
        variance.time_early_left,
        variance.time_underworked,
        variance.time_overworked,
      ];
    },
  });
}

/**
 * Reads a listing page by page and writes each page as it arrives, since a script is stopped
 * after six minutes and a partly filled sheet beats an empty one.
 */
function clocksterFillSheet_(options) {
  const sheet = clocksterSheet_(options.sheet);

  sheet.clear();
  sheet.getRange(1, 1, 1, options.headers.length).setValues([options.headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  let written = 0;

  clocksterEachPage_(options.path, options.query, function (rows) {
    if (!rows.length) {
      return;
    }

    const values = rows.map(options.row);

    // One write per page; cell by cell is what makes these scripts take minutes.
    sheet.getRange(written + 2, 1, values.length, options.headers.length).setValues(values);
    written += values.length;
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(written + ' rows in ' + options.sheet, 'Clockster', 5);
}

/** Falls back to what identifies a person when the name fields are empty. */
function clocksterName_(person) {
  const name = [person.last_name, person.first_name, person.middle_name].filter(Boolean).join(' ');

  return name || person.code || ('#' + person.id);
}

function clocksterSheet_(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function clocksterDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/** Safe to run twice: it replaces its own trigger rather than adding a second. */
function clocksterInstallDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'clocksterSyncEmployees') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('clocksterSyncEmployees').timeBased().atHour(6).everyDays(1).create();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Clockster')
    .addItem('Sync employees', 'clocksterSyncEmployees')
    .addItem('Sync timesheets', 'clocksterSyncTimesheets')
    .addSeparator()
    .addItem('Run employee sync every morning', 'clocksterInstallDailyTrigger')
    .addToUi();
}
