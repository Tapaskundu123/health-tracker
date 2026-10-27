import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Pencil, Flame, Trophy, MoreVertical, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import { completionsApi } from '../api';
import { HabitIcon } from './HabitIcons';
import { getLocalToday } from '../api';

const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getScheduleLabel(habit) {
  if (habit.schedule_type === 'daily') return 'Every day';
  if (habit.schedule_type === 'times_per_week') return `${habit.times_per_week}× / week`;
  if (habit.schedule_type === 'weekdays') {
    const days = (habit.schedule_days || []).sort().map((d) => WEEKDAY_SHORT[d]);
    return days.join(', ');
  }
  return '';
}

function isScheduledDay(dateStr, habit) {
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  if (habit.schedule_type === 'daily') return true;
  if (habit.schedule_type === 'weekdays') return (habit.schedule_days || []).includes(dow);
  return true; // times_per_week: all days valid
}

function getLast7Days() {
  const today = getLocalToday();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function HabitCard({ habit, onEdit, onArchive, onRefresh }) {
  const [completions, setCompletions] = useState(new Set());
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const today = getLocalToday();
  const last7 = getLast7Days();

  const fetchData = useCallback(async () => {
    try {
      const start = last7[0];
      const res = await completionsApi.getForHabit(habit.id, { start, end: today });
      setCompletions(new Set(res.data.completions));
      setStreak({ current: res.data.current_streak, longest: res.data.longest_streak });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [habit.id, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = async (date, e) => {
    e.stopPropagation();
    if (toggling) return;
    setToggling(date);
    try {
      if (completions.has(date)) {
        await completionsApi.unmark(habit.id, date);
        setCompletions((prev) => { const s = new Set(prev); s.delete(date); return s; });
      } else {
        await completionsApi.markComplete(habit.id, date);
        setCompletions((prev) => new Set([...prev, date]));
        if (date === today) toast.success('✅ Habit completed!', { duration: 1500 });
      }
      // Refresh streak
      const res = await completionsApi.getForHabit(habit.id, { start: last7[0], end: today });
      setStreak({ current: res.data.current_streak, longest: res.data.longest_streak });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setToggling(null);
    }
  };

  const todayDone = completions.has(today);

  return (
    <div
      className="habit-card"
      style={{ '--habit-color': habit.color }}
      onClick={() => navigate(`/habits/${habit.id}`)}
    >
      <div className="habit-card-header">
        <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
          <HabitIcon icon={habit.icon} color={habit.color} size={18} bgSize={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="habit-name" style={{ marginBottom: 4 }}>{habit.name}</div>
            <span className="habit-schedule-tag">{getScheduleLabel(habit)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Today's check button */}
          {isScheduledDay(today, habit) && (
            <button
              id={`check-${habit.id}`}
              className={`check-btn ${todayDone ? 'checked' : ''}`}
              onClick={(e) => toggle(today, e)}
              disabled={toggling === today}
              aria-label={todayDone ? 'Mark incomplete' : 'Mark complete'}
              title={todayDone ? 'Unmark today' : 'Complete today'}
            >
              <Check size={16} strokeWidth={3} color="white" />
            </button>
          )}

          {/* Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-icon"
              id={`menu-${habit.id}`}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              aria-label="Options"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-active)',
                  borderRadius: 'var(--radius-md)', padding: '4px',
                  zIndex: 20, minWidth: 130,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="nav-link"
                  style={{ width: '100%', fontSize: '0.82rem' }}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(habit); }}
                  id={`edit-${habit.id}`}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  className="nav-link"
                  style={{ width: '100%', fontSize: '0.82rem' }}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(habit); }}
                  id={`archive-${habit.id}`}
                >
                  <Archive size={14} /> Archive
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last 7 days mini dots */}
      <div className="days-row" onClick={(e) => e.stopPropagation()}>
        {last7.map((date) => {
          const scheduled = isScheduledDay(date, habit);
          const done = completions.has(date);
          const isToday = date === today;
          return (
            <button
              key={date}
              className={`day-dot ${done ? 'completed' : ''} ${isToday ? 'today' : ''} ${!scheduled ? 'non-scheduled' : ''}`}
              style={done ? { '--habit-color': habit.color, background: habit.color } : {}}
              onClick={scheduled ? (e) => toggle(date, e) : undefined}
              title={date}
              disabled={toggling === date || !scheduled}
              aria-label={`${date}${done ? ' (done)' : ''}`}
            >
              {WEEKDAY_SHORT[new Date(date + 'T00:00:00Z').getUTCDay()][0]}
            </button>
          );
        })}
      </div>

      {/* Streaks */}
      {!loading && (
        <div className="habit-streak-row">
          <div className="streak-stat">
            <div className="flex items-center gap-2">
              <Flame size={16} color={streak.current > 0 ? '#f97316' : 'var(--text-muted)'} />
              <span
                className="streak-number"
                style={{ color: streak.current > 0 ? '#f97316' : 'var(--text-muted)', fontSize: '1.25rem' }}
              >
                {streak.current}
              </span>
            </div>
            <span className="streak-label">Current Streak</span>
          </div>
          <div className="streak-stat">
            <div className="flex items-center gap-2">
              <Trophy size={16} color={streak.longest > 0 ? '#eab308' : 'var(--text-muted)'} />
              <span
                className="streak-number"
                style={{ color: streak.longest > 0 ? '#eab308' : 'var(--text-muted)', fontSize: '1.25rem' }}
              >
                {streak.longest}
              </span>
            </div>
            <span className="streak-label">Best Streak</span>
          </div>
        </div>
      )}
    </div>
  );
}
