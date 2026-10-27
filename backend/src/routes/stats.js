const express = require('express');
const { query } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { completionRate } = require('../utils/streaks');

const router = express.Router();

/**
 * GET /api/stats
 * Returns completion rate per habit for the last 30 days.
 * Query param: today (YYYY-MM-DD in user's timezone)
 */
router.get(
  '/',
  auth,
  [query('today').isDate().withMessage('today (YYYY-MM-DD) required')],
  validate,
  async (req, res) => {
    const { today } = req.query;

    try {
      // Get all active habits
      const habitsResult = await db.query(
        'SELECT * FROM habits WHERE user_id = $1 AND archived = FALSE ORDER BY created_at ASC',
        [req.user.id]
      );
      const habits = habitsResult.rows;

      if (habits.length === 0) {
        return res.json({ stats: [] });
      }

      // Compute date range: last 30 days
      const todayObj = new Date(today + 'T00:00:00Z');
      const startObj = new Date(todayObj.getTime() - 29 * 86400000);
      const startStr = startObj.toISOString().slice(0, 10);

      // Fetch completions in that range for all habits
      const completionsResult = await db.query(
        `SELECT habit_id, completed_date::text FROM completions
         WHERE user_id = $1
           AND completed_date BETWEEN $2 AND $3`,
        [req.user.id, startStr, today]
      );

      // Group completions by habit_id
      const byHabit = {};
      for (const row of completionsResult.rows) {
        if (!byHabit[row.habit_id]) byHabit[row.habit_id] = [];
        byHabit[row.habit_id].push(row.completed_date);
      }

      const stats = habits.map((habit) => {
        const dates = byHabit[habit.id] || [];
        const rate = completionRate(dates, habit, today, 30);
        return {
          habit_id: habit.id,
          habit_name: habit.name,
          habit_color: habit.color,
          habit_icon: habit.icon,
          schedule_type: habit.schedule_type,
          completion_rate: rate,
        };
      });

      res.json({ stats });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
