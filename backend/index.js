require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'src/db/schema.sql'), 'utf8');
  await db.query(schema);
  console.log('✅ Database schema applied');
}

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`🚀 Habit Tracker API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
