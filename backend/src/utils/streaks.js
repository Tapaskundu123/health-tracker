/**
 * streaks.js
 * Core streak + stats calculation logic.
 * All date arithmetic is done in YYYY-MM-DD strings (user's timezone).
 * No date objects are created from server timezone — caller must pass
 * dates already converted to the user's local date strings.
 */

/**
 * Parse a YYYY-MM-DD string to a plain object { year, month, day }.
 * Never creates a Date from the string to avoid TZ shifts.
 */
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Format a UTC Date object as YYYY-MM-DD.
 */
function formatDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Add N days to a UTC date.
 */
function addDays(d, n) {
  return new Date(d.getTime() + n * 86400000);
}

/**
 * Subtract N days from a UTC date.
 */
function subDays(d, n) {
  return new Date(d.getTime() - n * 86400000);
}

/**
 * Get day of week (0=Sun … 6=Sat) for a UTC date.
 */
function getDow(d) {
  return d.getUTCDay();
}

/**
 * Get ISO week number and year for a UTC date.
 * Returns { week, year } using Mon-start convention.
 */
function getIsoWeek(d) {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week decides the year
  copy.setUTCDate(copy.getUTCDate() + 4 - (copy.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((copy - yearStart) / 86400000 + 1) / 7);
  return { week, year: copy.getUTCFullYear() };
}

/**
 * For 'times_per_week' schedule: get the Sun-start calendar week key (YYYY-Www)
 * for a given date.
 */
function getSundayWeekKey(d) {
  // Find Sunday of this week
  const dow = d.getUTCDay(); // 0=Sun
  const sunday = subDays(d, dow);
  return formatDate(sunday);
}

/**
 * Determine if a given date is a "scheduled" day for a habit.
 *
 * @param {string} dateStr  YYYY-MM-DD
 * @param {object} habit    { schedule_type, schedule_days, times_per_week }
 * @returns {boolean}
 */
function isScheduledDay(dateStr, habit) {
  const d = parseDate(dateStr);
  const dow = getDow(d);

  if (habit.schedule_type === 'daily') {
    return true;
  }

  if (habit.schedule_type === 'weekdays') {
    const days = habit.schedule_days || [];
    return days.includes(dow);
  }

  // times_per_week: every day is potentially a valid check-in day;
  // streak logic handles the weekly quota separately
  if (habit.schedule_type === 'times_per_week') {
    return true;
  }

  return false;
}

/**
 * Build a streak from an array of completion date strings.
 * Returns { current, longest }.
 *
 * @param {string[]} completionDates  Sorted ascending YYYY-MM-DD strings
 * @param {object}   habit            { schedule_type, schedule_days, times_per_week }
 * @param {string}   today            YYYY-MM-DD string in user's timezone
 */
function calculateStreaks(completionDates, habit, today) {
  if (!completionDates || completionDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  const sorted = [...completionDates].sort();
  const doneSet = new Set(sorted);

  if (habit.schedule_type === 'daily') {
    return calcDailyStreak(doneSet, sorted, today);
  }

  if (habit.schedule_type === 'weekdays') {
    return calcWeekdayStreak(doneSet, sorted, today, habit.schedule_days || []);
  }

  if (habit.schedule_type === 'times_per_week') {
    return calcTimesPerWeekStreak(doneSet, sorted, today, habit.times_per_week || 1);
  }

  return { current: 0, longest: 0 };
}

/**
 * Daily streak: every consecutive calendar day must have a completion.
 */
function calcDailyStreak(doneSet, sorted, today) {
  let longest = 0;
  let run = 0;
  let prev = null;

  for (const dateStr of sorted) {
    const d = parseDate(dateStr);
    if (prev === null) {
      run = 1;
    } else {
      const expected = formatDate(addDays(prev, 1));
      if (expected === dateStr) {
        run++;
      } else {
        run = 1;
      }
    }
    if (run > longest) longest = run;
    prev = d;
  }

  // Current streak: count backwards from today
  let current = 0;
  let cursor = parseDate(today);
  while (true) {
    const key = formatDate(cursor);
    if (doneSet.has(key)) {
      current++;
      cursor = subDays(cursor, 1);
    } else {
      // Allow today to be incomplete (streak starts from yesterday)
      if (key === today && current === 0) {
        cursor = subDays(cursor, 1);
        continue;
      }
      break;
    }
  }

  return { current, longest };
}

/**
 * Weekday streak: only scheduled weekdays are checkpoints.
 * Non-scheduled days are transparent (don't break the streak).
 */
function calcWeekdayStreak(doneSet, sorted, today, scheduleDays) {
  // Build ordered list of scheduled dates that have occurred up to today
  const todayD = parseDate(today);
  const firstDate = parseDate(sorted[0]);

  // Collect all scheduled days from first completion date up to today
  const scheduledDates = [];
  let cursor = firstDate;
  while (cursor <= todayD) {
    if (scheduleDays.includes(getDow(cursor))) {
      scheduledDates.push(formatDate(cursor));
    }
    cursor = addDays(cursor, 1);
  }

  if (scheduledDates.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 0;

  for (const sd of scheduledDates) {
    if (doneSet.has(sd)) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak: walk backwards through scheduled dates
  let current = 0;
  for (let i = scheduledDates.length - 1; i >= 0; i--) {
    const sd = scheduledDates[i];
    if (doneSet.has(sd)) {
      current++;
    } else {
      // If the most recent scheduled day hasn't been completed yet,
      // it might be today — allow grace for the current scheduled day
      if (i === scheduledDates.length - 1 && current === 0) {
        continue;
      }
      break;
    }
  }

  return { current, longest };
}

/**
 * Times-per-week streak: count consecutive calendar weeks where
 * the user completed the habit >= N times.
 * Week = Sunday–Saturday.
 */
function calcTimesPerWeekStreak(doneSet, sorted, today, timesPerWeek) {
  // Group completions by week key
  const weekCounts = {};
  for (const dateStr of sorted) {
    const wk = getSundayWeekKey(parseDate(dateStr));
    weekCounts[wk] = (weekCounts[wk] || 0) + 1;
  }

  // Build ordered list of week keys from first week to current week
  const firstD = parseDate(sorted[0]);
  const firstWeekStart = subDays(firstD, getDow(firstD)); // this week's Sunday
  const todayD = parseDate(today);
  const thisWeekStart = subDays(todayD, getDow(todayD));

  const weekKeys = [];
  let wCursor = firstWeekStart;
  while (wCursor <= thisWeekStart) {
    weekKeys.push(formatDate(wCursor));
    wCursor = addDays(wCursor, 7);
  }

  let longest = 0;
  let run = 0;

  for (const wk of weekKeys) {
    const count = weekCounts[wk] || 0;
    if (count >= timesPerWeek) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak: walk backwards through weeks
  let current = 0;
  for (let i = weekKeys.length - 1; i >= 0; i--) {
    const wk = weekKeys[i];
    const count = weekCounts[wk] || 0;
    if (count >= timesPerWeek) {
      current++;
    } else {
      // Grace for the current (possibly incomplete) week
      if (i === weekKeys.length - 1 && current === 0) {
        continue;
      }
      break;
    }
  }

  return { current, longest };
}

/**
 * Calculate completion rate for a habit over the last N days.
 *
 * @param {string[]} completionDates  YYYY-MM-DD strings
 * @param {object}   habit            habit object
 * @param {string}   today            YYYY-MM-DD (user's timezone)
 * @param {number}   days             window (default 30)
 * @returns {number}  0–100 percentage
 */
function completionRate(completionDates, habit, today, days = 30) {
  const doneSet = new Set(completionDates);
  const todayD = parseDate(today);
  const startD = subDays(todayD, days - 1);

  let scheduled = 0;
  let completed = 0;
  let cursor = startD;

  while (cursor <= todayD) {
    const ds = formatDate(cursor);
    if (isScheduledDay(ds, habit)) {
      scheduled++;
      if (doneSet.has(ds)) completed++;
    }
    cursor = addDays(cursor, 1);
  }

  if (scheduled === 0) return 0;
  return Math.round((completed / scheduled) * 100);
}

module.exports = {
  calculateStreaks,
  completionRate,
  isScheduledDay,
  parseDate,
  formatDate,
  addDays,
  subDays,
  getDow,
  getSundayWeekKey,
};
