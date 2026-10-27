import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Trophy, Calendar, Pencil, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subMonths } from 'date-fns';
import { habitsApi, completionsApi, getLocalToday } from '../api';
import { HabitIcon } from '../components/HabitIcons';
import CalendarHeatmap from '../components/CalendarHeatmap';
import HabitModal from '../components/HabitModal';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getScheduleDetail(habit) {
  if (habit.schedule_type === 'daily') return 'Every day';
  if (habit.schedule_type === 'times_per_week') return `${habit.times_per_week} times per week`;
  if (habit.schedule_type === 'weekdays') {
    return (habit.schedule_days || []).sort().map((d) => WEEKDAY_NAMES[d]).join(', ');
  }
  return '';
}

function isScheduledDay(dateStr, habit) {
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  if (habit.schedule_type === 'daily') return true;
  if (habit.schedule_type === 'weekdays') return (habit.schedule_days || []).includes(dow);
  return true;
}

function getLast7Days(today) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = getLocalToday();
  const last7 = getLast7Days(today);
  const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');

  const [habit, setHabit] = useState(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [habitRes, completionRes] = await Promise.all([
        habitsApi.list(false).then((r) => {
          const h = r.data.habits.find((x) => x.id === id);
          if (!h) throw new Error('Not found');
          return { data: { habit: h } };
        }),
        completionsApi.getForHabit(id, { start: sixMonthsAgo, end: today }),
      ]);
      setHabit(habitRes.data.habit);
      setCompletions(completionRes.data.completions);
      setStreak({
        current: completionRes.data.current_streak,
        longest: completionRes.data.longest_streak,
      });
    } catch (err) {
      toast.error('Habit not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, today, sixMonthsAgo, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggle = async (date) => {
    if (toggling) return;
    setToggling(date);
    const doneSet = new Set(completions);
    try {
      if (doneSet.has(date)) {
        await completionsApi.unmark(id, date);
        setCompletions((prev) => prev.filter((d) => d !== date));
      } else {
        await completionsApi.markComplete(id, date);
        setCompletions((prev) => [...prev, date]);
        if (date === today) toast.success('✅ Habit completed!', { duration: 1500 });
      }
      const res = await completionsApi.getForHabit(id, { start: sixMonthsAgo, end: today });
      setStreak({ current: res.data.current_streak, longest: res.data.longest_streak });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen" style={{ minHeight: 300 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!habit) return null;

  const doneSet = new Set(completions);

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate(-1)} id="back-btn">
        <ArrowLeft size={16} />
        Back to Habits
      </button>

      {/* Header */}
      <div className="habit-detail-header">
        <HabitIcon icon={habit.icon} color={habit.color} size={28} bgSize={64} />
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{habit.name}</h1>
          {habit.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
              {habit.description}
            </p>
          )}
          <div style={{ marginTop: 8 }}>
            <span className="habit-schedule-tag">{getScheduleDetail(habit)}</span>
          </div>
        </div>
        <button
          id="edit-habit-btn"
          className="btn btn-ghost"
          onClick={() => setShowEdit(true)}
        >
          <Pencil size={15} />
          Edit
        </button>
      </div>

      {/* Streak Cards */}
      <div className="streak-cards">
        <div className="streak-card">
          <div className="flex items-center gap-2">
            <Flame size={20} color={streak.current > 0 ? '#f97316' : 'var(--text-muted)'} />
            <span
              className="streak-card-value"
              style={{ color: streak.current > 0 ? '#f97316' : 'var(--text-muted)' }}
            >
              {streak.current}
            </span>
          </div>
          <div className="streak-card-label">Current Streak</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {streak.current === 0 ? 'Start today!' : `${streak.current} ${streak.current === 1 ? 'day' : 'days'} in a row`}
          </div>
        </div>

        <div className="streak-card">
          <div className="flex items-center gap-2">
            <Trophy size={20} color={streak.longest > 0 ? '#eab308' : 'var(--text-muted)'} />
            <span
              className="streak-card-value"
              style={{ color: streak.longest > 0 ? '#eab308' : 'var(--text-muted)' }}
            >
              {streak.longest}
            </span>
          </div>
          <div className="streak-card-label">Best Streak</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {streak.longest === 0 ? 'No streak yet' : `Personal best!`}
          </div>
        </div>

        <div className="streak-card">
          <div className="flex items-center gap-2">
            <Calendar size={20} color="var(--accent-light)" />
            <span className="streak-card-value" style={{ color: 'var(--accent-light)' }}>
              {completions.length}
            </span>
          </div>
          <div className="streak-card-label">Total Completions</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            All time
          </div>
        </div>
      </div>

      {/* Last 7 days */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">Last 7 Days</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {last7.map((date) => {
            const scheduled = isScheduledDay(date, habit);
            const done = doneSet.has(date);
            const isToday = date === today;
            return (
              <button
                key={date}
                id={`day-${date}`}
                disabled={!scheduled || toggling === date}
                onClick={() => scheduled && toggle(date)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: done ? habit.color + '22' : 'var(--bg-elevated)',
                  border: `1px solid ${done ? habit.color + '66' : isToday ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: scheduled ? 'pointer' : 'default',
                  opacity: !scheduled ? 0.35 : 1,
                  transition: 'all 0.2s ease',
                  minWidth: 52,
                }}
              >
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {WEEKDAY_SHORT[new Date(date + 'T00:00:00Z').getUTCDay()]}
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: done ? habit.color : 'transparent',
                    border: `2px solid ${done ? habit.color : 'var(--border-active)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {done && <Check size={14} color="white" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: '0.65rem', color: isToday ? 'var(--accent-light)' : 'var(--text-secondary)', fontWeight: isToday ? 700 : 400 }}>
                  {isToday ? 'Today' : new Date(date + 'T00:00:00Z').getUTCDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Heatmap */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">6-Month Activity</div>
        <CalendarHeatmap completions={completions} color={habit.color} today={today} />
      </div>

      {showEdit && (
        <HabitModal
          habit={habit}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setHabit(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
