/**
 * Seed script: creates 2 demo users with habits and 6 months of realistic completion history.
 * Run: node src/db/seed.js
 *
 * Demo logins:
 *   demo@habits.com / Demo1234!
 *   test@habits.com / Test1234!
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const db = require('./index');

const TODAY = new Date().toISOString().slice(0, 10);

function dateStr(daysAgo) {
  const d = new Date(TODAY + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function getDow(dateString) {
  return new Date(dateString + 'T00:00:00Z').getUTCDay();
}

// Generate realistic completion history (with some misses for realism)
function generateDates(daysBack, missRate, scheduleFn) {
  const dates = [];
  for (let i = daysBack; i >= 0; i--) {
    const ds = dateStr(i);
    if (scheduleFn(ds) && Math.random() > missRate) {
      dates.push(ds);
    }
  }
  return dates;
}

async function seed() {
  console.log('🌱 Seeding database...');

  // Apply schema first
  const fs = require('fs');
  const path = require('path');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.query(schema);

  // Clear existing demo data
  await db.query(`DELETE FROM users WHERE email IN ('demo@habits.com', 'test@habits.com')`);

  const demoHash = await bcrypt.hash('Demo1234!', 12);
  const testHash = await bcrypt.hash('Test1234!', 12);

  // Create users
  const demoUser = (
    await db.query(
      `INSERT INTO users (email, password_hash, timezone) VALUES ($1, $2, $3) RETURNING id`,
      ['demo@habits.com', demoHash, 'America/New_York']
    )
  ).rows[0];

  const testUser = (
    await db.query(
      `INSERT INTO users (email, password_hash, timezone) VALUES ($1, $2, $3) RETURNING id`,
      ['test@habits.com', testHash, 'Europe/London']
    )
  ).rows[0];

  console.log('✅ Users created');

  // --- Demo User Habits ---
  const habits = [
    {
      user_id: demoUser.id,
      name: 'Morning Meditation',
      description: '10 minutes of mindfulness to start the day',
      color: '#6366f1',
      icon: 'brain',
      schedule_type: 'daily',
      schedule_days: null,
      times_per_week: null,
      missRate: 0.1,
      scheduleFn: () => true,
    },
    {
      user_id: demoUser.id,
      name: 'Gym Workout',
      description: 'Strength training sessions',
      color: '#ef4444',
      icon: 'dumbbell',
      schedule_type: 'weekdays',
      schedule_days: [1, 3, 5], // Mon, Wed, Fri
      times_per_week: null,
      missRate: 0.15,
      scheduleFn: (ds) => [1, 3, 5].includes(getDow(ds)),
    },
    {
      user_id: demoUser.id,
      name: 'Read a Book',
      description: 'Read at least 20 pages',
      color: '#f97316',
      icon: 'book',
      schedule_type: 'times_per_week',
      schedule_days: null,
      times_per_week: 5,
      missRate: 0.2,
      scheduleFn: () => true,
    },
    {
      user_id: demoUser.id,
      name: 'Drink 8 Glasses of Water',
      description: 'Stay hydrated throughout the day',
      color: '#06b6d4',
      icon: 'droplets',
      schedule_type: 'daily',
      schedule_days: null,
      times_per_week: null,
      missRate: 0.05,
      scheduleFn: () => true,
    },
    {
      user_id: demoUser.id,
      name: 'Evening Walk',
      description: '30-minute walk after dinner',
      color: '#22c55e',
      icon: 'sun',
      schedule_type: 'weekdays',
      schedule_days: [1, 2, 3, 4, 5], // Weekdays
      times_per_week: null,
      missRate: 0.25,
      scheduleFn: (ds) => [1, 2, 3, 4, 5].includes(getDow(ds)),
    },
    {
      user_id: demoUser.id,
      name: 'Practice Guitar',
      description: 'Learn new chords and songs',
      color: '#a855f7',
      icon: 'music',
      schedule_type: 'times_per_week',
      schedule_days: null,
      times_per_week: 3,
      missRate: 0.3,
      scheduleFn: () => true,
    },
    // Archived habit
    {
      user_id: demoUser.id,
      name: 'Cold Shower',
      description: 'Build resilience',
      color: '#06b6d4',
      icon: 'droplets',
      schedule_type: 'daily',
      schedule_days: null,
      times_per_week: null,
      archived: true,
      missRate: 0.4,
      scheduleFn: () => true,
    },
  ];

  for (const h of habits) {
    const result = await db.query(
      `INSERT INTO habits (user_id, name, description, color, icon, schedule_type, schedule_days, times_per_week, archived)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        h.user_id,
        h.name,
        h.description,
        h.color,
        h.icon,
        h.schedule_type,
        h.schedule_days ? JSON.stringify(h.schedule_days) : null,
        h.times_per_week || null,
        h.archived || false,
      ]
    );
    const habitId = result.rows[0].id;

    // Insert completions (180 days back)
    const dates = generateDates(180, h.missRate, h.scheduleFn);
    for (const date of dates) {
      await db.query(
        `INSERT INTO completions (habit_id, user_id, completed_date)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [habitId, h.user_id, date]
      );
    }
    console.log(`  ✅ ${h.name} — ${dates.length} completions`);
  }

  // --- Test User Habits ---
  const testHabits = [
    {
      name: 'Daily Coding',
      description: 'Work on side projects',
      color: '#6366f1',
      icon: 'code',
      schedule_type: 'daily',
      schedule_days: null,
      times_per_week: null,
      missRate: 0.15,
      scheduleFn: () => true,
    },
    {
      name: 'Weekly Review',
      description: 'Review goals and plan next week',
      color: '#eab308',
      icon: 'star',
      schedule_type: 'weekdays',
      schedule_days: [0], // Sunday
      times_per_week: null,
      missRate: 0.2,
      scheduleFn: (ds) => getDow(ds) === 0,
    },
  ];

  for (const h of testHabits) {
    const result = await db.query(
      `INSERT INTO habits (user_id, name, description, color, icon, schedule_type, schedule_days, times_per_week)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [testUser.id, h.name, h.description, h.color, h.icon, h.schedule_type,
       h.schedule_days ? JSON.stringify(h.schedule_days) : null, h.times_per_week || null]
    );
    const habitId = result.rows[0].id;
    const dates = generateDates(180, h.missRate, h.scheduleFn);
    for (const date of dates) {
      await db.query(
        `INSERT INTO completions (habit_id, user_id, completed_date)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [habitId, testUser.id, date]
      );
    }
    console.log(`  ✅ ${h.name} — ${dates.length} completions`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('\nDemo logins:');
  console.log('  demo@habits.com / Demo1234!');
  console.log('  test@habits.com / Test1234!');

  await db.pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
