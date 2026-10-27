const express = require('express');
const { body, param, query } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { calculateStreaks, completionRate } = require('../utils/streaks');

const router = express.Router({ mergeParams: true });

/**
 * GET /api/habits/:id/completions
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD), today (YYYY-MM-DD)
 * Returns completions + streak info for the habit.
 */
router.get(
  '/',
  auth,
  [
    param('id').isUUID(),
    query('start').optional().isDate(),
    query('end').optional().isDate(),
    query('today').isDate().withMessage('today (YYYY-MM-DD) required for streak calculation'),
  ],
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { start, end, today } = req.query;

    try {
      // Verify habit ownership
      const habitResult = await db.query(
        'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (!habitResult.rows[0]) return res.status(404).json({ error: 'Habit not found' });
      const habit = habitResult.rows[0];

      // Fetch completions for heatmap/calendar range
      let completionsQ;
      if (start && end) {
        completionsQ = await db.query(
          `SELECT completed_date::text FROM completions
           WHERE habit_id = $1 AND user_id = $2
             AND completed_date BETWEEN $3 AND $4
           ORDER BY completed_date ASC`,
          [id, req.user.id, start, end]
        );
      } else {
        completionsQ = await db.query(
          `SELECT completed_date::text FROM completions
           WHERE habit_id = $1 AND user_id = $2
           ORDER BY completed_date ASC`,
          [id, req.user.id]
        );
      }

      const allDates = await db.query(
        `SELECT completed_date::text FROM completions
         WHERE habit_id = $1 AND user_id = $2
         ORDER BY completed_date ASC`,
        [id, req.user.id]
      );

      const allDateStrings = allDates.rows.map((r) => r.completed_date);
      const streaks = calculateStreaks(allDateStrings, habit, today);

      res.json({
        completions: completionsQ.rows.map((r) => r.completed_date),
        current_streak: streaks.current,
        longest_streak: streaks.longest,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/habits/:id/complete
 * Body: { date: 'YYYY-MM-DD' }
 * Marks a habit as complete on a specific date (must be within last 7 days).
 */
router.post(
  '/complete',
  auth,
  [
    param('id').isUUID(),
    body('date')
      .isDate()
      .withMessage('date (YYYY-MM-DD) required')
      .custom((date, { req: request }) => {
        const today = request.body.today;
        if (!today) return true; // today validation handled separately
        return true;
      }),
    body('today').isDate().withMessage('today (YYYY-MM-DD in user timezone) required'),
  ],
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { date, today } = req.body;

    // Enforce: date must be within the last 7 days (relative to user's today)
    const dateObj = new Date(date + 'T00:00:00Z');
    const todayObj = new Date(today + 'T00:00:00Z');
    const diffDays = Math.round((todayObj - dateObj) / 86400000);

    if (diffDays < 0) {
      return res.status(422).json({ error: 'Cannot mark a future date as complete' });
    }
    if (diffDays > 7) {
      return res.status(422).json({ error: 'Can only mark completions within the last 7 days' });
    }

    try {
      const habitResult = await db.query(
        'SELECT id FROM habits WHERE id = $1 AND user_id = $2 AND archived = FALSE',
        [id, req.user.id]
      );
      if (!habitResult.rows[0]) return res.status(404).json({ error: 'Habit not found or archived' });

      const result = await db.query(
        `INSERT INTO completions (habit_id, user_id, completed_date)
         VALUES ($1, $2, $3)
         ON CONFLICT (habit_id, completed_date) DO NOTHING
         RETURNING *`,
        [id, req.user.id, date]
      );

      res.status(201).json({
        completion: result.rows[0] || null,
        message: result.rows[0] ? 'Marked complete' : 'Already completed for this date',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/habits/:id/complete/:date
 * Unmark a completion for a specific date.
 */
router.delete(
  '/complete/:date',
  auth,
  [param('id').isUUID(), param('date').isDate()],
  validate,
  async (req, res) => {
    const { id, date } = req.params;
    try {
      const result = await db.query(
        'DELETE FROM completions WHERE habit_id = $1 AND user_id = $2 AND completed_date = $3 RETURNING id',
        [id, req.user.id, date]
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Completion not found' });
      res.json({ message: 'Completion removed' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
