const express = require('express');
const { body, param, query } = require('express-validator');
const db = require('../db');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const VALID_COLORS = ['#6366f1', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#a855f7', '#eab308', '#ef4444'];
const VALID_ICONS = ['star', 'heart', 'zap', 'book', 'dumbbell', 'droplets', 'brain', 'moon', 'sun', 'music', 'code', 'coffee'];

// GET /api/habits — list user's habits (non-archived by default)
router.get('/', auth, async (req, res) => {
  const { archived } = req.query;
  try {
    const result = await db.query(
      `SELECT * FROM habits WHERE user_id = $1 AND archived = $2 ORDER BY created_at ASC`,
      [req.user.id, archived === 'true']
    );
    res.json({ habits: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/habits — create a habit
router.post(
  '/',
  auth,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 chars)'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().isIn(VALID_COLORS).withMessage('Invalid color'),
    body('icon').optional().isIn(VALID_ICONS).withMessage('Invalid icon'),
    body('schedule_type')
      .isIn(['daily', 'weekdays', 'times_per_week'])
      .withMessage('schedule_type must be daily, weekdays, or times_per_week'),
    body('schedule_days')
      .if(body('schedule_type').equals('weekdays'))
      .isArray({ min: 1 })
      .withMessage('schedule_days required for weekdays schedule')
      .custom((days) => {
        if (!days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
          throw new Error('schedule_days must be integers 0–6');
        }
        return true;
      }),
    body('times_per_week')
      .if(body('schedule_type').equals('times_per_week'))
      .isInt({ min: 1, max: 7 })
      .withMessage('times_per_week must be 1–7'),
  ],
  validate,
  async (req, res) => {
    const {
      name,
      description,
      color = '#6366f1',
      icon = 'star',
      schedule_type,
      schedule_days,
      times_per_week,
    } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO habits (user_id, name, description, color, icon, schedule_type, schedule_days, times_per_week)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          req.user.id,
          name,
          description || null,
          color,
          icon,
          schedule_type,
          schedule_type === 'weekdays' ? JSON.stringify(schedule_days) : null,
          schedule_type === 'times_per_week' ? times_per_week : null,
        ]
      );
      res.status(201).json({ habit: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/habits/:id — update a habit
router.put(
  '/:id',
  auth,
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().isIn(VALID_COLORS),
    body('icon').optional().isIn(VALID_ICONS),
    body('schedule_type').optional().isIn(['daily', 'weekdays', 'times_per_week']),
    body('schedule_days')
      .optional()
      .isArray({ min: 1 })
      .custom((days) => {
        if (!days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
          throw new Error('schedule_days must be integers 0–6');
        }
        return true;
      }),
    body('times_per_week').optional().isInt({ min: 1, max: 7 }),
  ],
  validate,
  async (req, res) => {
    const { id } = req.params;
    try {
      const existing = await db.query(
        'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (!existing.rows[0]) return res.status(404).json({ error: 'Habit not found' });

      const habit = existing.rows[0];
      const {
        name = habit.name,
        description = habit.description,
        color = habit.color,
        icon = habit.icon,
        schedule_type = habit.schedule_type,
        schedule_days = habit.schedule_days,
        times_per_week = habit.times_per_week,
      } = req.body;

      const result = await db.query(
        `UPDATE habits SET name=$1, description=$2, color=$3, icon=$4, schedule_type=$5,
         schedule_days=$6, times_per_week=$7, updated_at=NOW()
         WHERE id=$8 AND user_id=$9 RETURNING *`,
        [name, description, color, icon, schedule_type,
         schedule_type === 'weekdays' ? JSON.stringify(schedule_days) : null,
         schedule_type === 'times_per_week' ? times_per_week : null,
         id, req.user.id]
      );
      res.json({ habit: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/habits/:id
router.delete('/:id', auth, [param('id').isUUID()], validate, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Habit not found' });
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/habits/:id/archive
router.post('/:id/archive', auth, [param('id').isUUID()], validate, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE habits SET archived = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Habit not found' });
    res.json({ habit: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/habits/:id/restore
router.post('/:id/restore', auth, [param('id').isUUID()], validate, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE habits SET archived = FALSE, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Habit not found' });
    res.json({ habit: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
