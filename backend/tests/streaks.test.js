/**
 * streaks.test.js
 * Unit tests for streak and completion rate logic.
 * No database required — pure function testing.
 */
const {
  calculateStreaks,
  completionRate,
  isScheduledDay,
} = require('../src/utils/streaks');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeHabit(overrides) {
  return {
    schedule_type: 'daily',
    schedule_days: null,
    times_per_week: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. DAILY habit — unbroken streak
// ---------------------------------------------------------------------------
describe('Daily habit — unbroken streak', () => {
  test('counts consecutive days up to today', () => {
    const today = '2024-06-10';
    const dates = ['2024-06-08', '2024-06-09', '2024-06-10'];
    const habit = makeHabit({ schedule_type: 'daily' });
    const { current, longest } = calculateStreaks(dates, habit, today);
    expect(current).toBe(3);
    expect(longest).toBe(3);
  });

  test('current streak counts yesterday if today not done yet', () => {
    const today = '2024-06-10';
    const dates = ['2024-06-07', '2024-06-08', '2024-06-09'];
    const habit = makeHabit({ schedule_type: 'daily' });
    const { current } = calculateStreaks(dates, habit, today);
    expect(current).toBe(3);
  });

  test('longest is tracked across multiple runs', () => {
    const today = '2024-06-15';
    // Two runs: 3 days, then gap, then 5 days ending on Jun 12
    const dates = [
      '2024-06-01', '2024-06-02', '2024-06-03', // 3-day run
      '2024-06-08', '2024-06-09', '2024-06-10', '2024-06-11', '2024-06-12', // 5-day run
    ];
    const habit = makeHabit({ schedule_type: 'daily' });
    const { current, longest } = calculateStreaks(dates, habit, today);
    expect(longest).toBe(5);
    // today is Jun 15, last completion is Jun 12 → current = 0
    expect(current).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. DAILY habit — broken streak resets to 0
// ---------------------------------------------------------------------------
describe('Daily habit — broken streak', () => {
  test('gap yesterday resets current streak to 0', () => {
    const today = '2024-06-10';
    const dates = ['2024-06-07', '2024-06-08']; // gap on 9th and 10th
    const habit = makeHabit({ schedule_type: 'daily' });
    const { current } = calculateStreaks(dates, habit, today);
    expect(current).toBe(0);
  });

  test('single completion then gap: current = 0, longest = 1', () => {
    const today = '2024-06-10';
    const dates = ['2024-06-05'];
    const habit = makeHabit({ schedule_type: 'daily' });
    const { current, longest } = calculateStreaks(dates, habit, today);
    expect(current).toBe(0);
    expect(longest).toBe(1);
  });

  test('empty completions returns 0/0', () => {
    const { current, longest } = calculateStreaks([], makeHabit(), '2024-06-10');
    expect(current).toBe(0);
    expect(longest).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. WEEKDAY habit — non-scheduled days are transparent
// ---------------------------------------------------------------------------
describe('Weekday habit (Mon/Wed/Fri) — non-scheduled days do not break streak', () => {
  // Mon=1, Wed=3, Fri=5
  const habit = makeHabit({ schedule_type: 'weekdays', schedule_days: [1, 3, 5] });

  test('streak is not broken by Tue/Thu/Sat/Sun gaps', () => {
    // Week: Mon 2024-06-03, Wed 2024-06-05, Fri 2024-06-07
    const today = '2024-06-07'; // Friday
    const dates = ['2024-06-03', '2024-06-05', '2024-06-07'];
    const { current, longest } = calculateStreaks(dates, habit, today);
    expect(current).toBe(3);
    expect(longest).toBe(3);
  });

  test('missing a scheduled day breaks the streak', () => {
    // Miss Wednesday
    const today = '2024-06-07';
    const dates = ['2024-06-03', '2024-06-07']; // Mon + Fri (skipped Wed)
    const { current, longest } = calculateStreaks(dates, habit, today);
    // Current should be 1 (only Friday), longest should be 1 (Mon alone before gap, or Fri)
    expect(current).toBe(1);
  });

  test('Sun-only habit: completions on Sun, Mon non-scheduled', () => {
    const sunOnlyHabit = makeHabit({ schedule_type: 'weekdays', schedule_days: [0] }); // Sunday
    // 2024-06-02 Sun, 2024-06-09 Sun, today=2024-06-09 Sun
    const dates = ['2024-06-02', '2024-06-09'];
    const { current, longest } = calculateStreaks(dates, sunOnlyHabit, '2024-06-09');
    expect(current).toBe(2);
    expect(longest).toBe(2);
  });

  test('isScheduledDay returns false for non-scheduled days', () => {
    // Tuesday (DOW=2) is not in [1,3,5]
    expect(isScheduledDay('2024-06-04', habit)).toBe(false);
    // Monday (DOW=1) is in [1,3,5]
    expect(isScheduledDay('2024-06-03', habit)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. TIMES_PER_WEEK habit
// ---------------------------------------------------------------------------
describe('Times-per-week habit (3x/week)', () => {
  const habit = makeHabit({ schedule_type: 'times_per_week', times_per_week: 3 });

  test('week with 3 completions counts as fulfilled', () => {
    // Week of 2024-06-02 (Sun) to 2024-06-08 (Sat)
    const today = '2024-06-08';
    const dates = ['2024-06-03', '2024-06-05', '2024-06-07']; // 3 in same week
    const { current, longest } = calculateStreaks(dates, habit, today);
    expect(current).toBe(1);
    expect(longest).toBe(1);
  });

  test('week with only 2 completions (< 3) breaks streak', () => {
    const today = '2024-06-08';
    const dates = ['2024-06-03', '2024-06-05']; // only 2 this week
    const { current } = calculateStreaks(dates, habit, today);
    expect(current).toBe(0);
  });

  test('two consecutive weeks meeting quota = streak of 2', () => {
    // Week 1: Jun 2-8, Week 2: Jun 9-15
    const today = '2024-06-15';
    const dates = [
      '2024-06-03', '2024-06-05', '2024-06-07', // week 1 (Sun Jun 2)
      '2024-06-10', '2024-06-12', '2024-06-14', // week 2 (Sun Jun 9)
    ];
    const { current, longest } = calculateStreaks(dates, habit, today);
    expect(current).toBe(2);
    expect(longest).toBe(2);
  });

  test('more than required completions in week still counts as 1', () => {
    const today = '2024-06-08';
    const dates = ['2024-06-03', '2024-06-04', '2024-06-05', '2024-06-06', '2024-06-07'];
    const { current, longest } = calculateStreaks(dates, habit, today);
    expect(current).toBe(1);
    expect(longest).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. LONGEST streak calculation
// ---------------------------------------------------------------------------
describe('Longest streak calculation', () => {
  test('daily: longest captures peak run', () => {
    const today = '2024-06-20';
    const dates = [
      // Run 1: 7 days
      '2024-06-01', '2024-06-02', '2024-06-03', '2024-06-04',
      '2024-06-05', '2024-06-06', '2024-06-07',
      // Gap
      '2024-06-10', '2024-06-11', // Run 2: 2 days
    ];
    const habit = makeHabit({ schedule_type: 'daily' });
    const { longest } = calculateStreaks(dates, habit, today);
    expect(longest).toBe(7);
  });

  test('weekday: longest counts scheduled-day runs', () => {
    const habit = makeHabit({ schedule_type: 'weekdays', schedule_days: [1, 3, 5] });
    const today = '2024-06-21'; // Friday
    const dates = [
      // Full week 1: Mon/Wed/Fri
      '2024-06-03', '2024-06-05', '2024-06-07',
      // Full week 2: Mon/Wed/Fri
      '2024-06-10', '2024-06-12', '2024-06-14',
      // Miss Mon Jun 17, then Wed/Fri
      '2024-06-19', '2024-06-21',
    ];
    const { longest } = calculateStreaks(dates, habit, today);
    expect(longest).toBe(6); // 6 consecutive scheduled days (two full weeks)
  });
});

// ---------------------------------------------------------------------------
// 6. Completion rate
// ---------------------------------------------------------------------------
describe('Completion rate', () => {
  test('100% for daily habit with all days completed', () => {
    const today = '2024-06-10';
    const dates = [];
    // Fill all 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date('2024-06-10T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    const habit = makeHabit({ schedule_type: 'daily' });
    expect(completionRate(dates, habit, today, 30)).toBe(100);
  });

  test('0% for daily habit with no completions', () => {
    const habit = makeHabit({ schedule_type: 'daily' });
    expect(completionRate([], habit, '2024-06-10', 30)).toBe(0);
  });

  test('50% for daily habit with half the days', () => {
    const today = '2024-06-10';
    const dates = [];
    // Complete only even-indexed days (15 out of 30)
    for (let i = 0; i < 30; i += 2) {
      const d = new Date('2024-06-10T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    const habit = makeHabit({ schedule_type: 'daily' });
    expect(completionRate(dates, habit, today, 30)).toBe(50);
  });

  test('weekday habit: only scheduled days count toward rate', () => {
    // Mon/Wed/Fri habit for exactly one week (Mon Jun 3 – Sun Jun 9)
    const today = '2024-06-09'; // Sunday
    const habit = makeHabit({ schedule_type: 'weekdays', schedule_days: [1, 3, 5] });
    // Complete only Monday in that week
    const dates = ['2024-06-03'];
    // Over 7 days: 3 scheduled (Mon/Wed/Fri), 1 complete → 33%
    const rate = completionRate(dates, habit, today, 7);
    expect(rate).toBe(33);
  });
});
