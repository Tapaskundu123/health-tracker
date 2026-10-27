import { useState, useEffect, useCallback } from 'react';
import { Archive, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { habitsApi } from '../api';
import { HabitIcon } from '../components/HabitIcons';

export default function ArchivePage() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  const fetchArchived = useCallback(async () => {
    try {
      const res = await habitsApi.list(true);
      setHabits(res.data.habits);
    } catch {
      toast.error('Failed to load archive');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArchived(); }, [fetchArchived]);

  const restore = async (habit) => {
    setRestoring(habit.id);
    try {
      await habitsApi.restore(habit.id);
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
      toast.success(`"${habit.name}" restored!`);
    } catch {
      toast.error('Failed to restore');
    } finally {
      setRestoring(null);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Archive</h1>
          <p className="page-subtitle">Archived habits with their full history intact</p>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Archive size={32} />
          </div>
          <h3>No archived habits</h3>
          <p>Habits you archive will appear here. Their history is always preserved.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0.75 }}
              id={`archived-${habit.id}`}
            >
              <HabitIcon icon={habit.icon} color={habit.color} size={18} bgSize={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{habit.name}</div>
                {habit.description && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                    {habit.description}
                  </div>
                )}
                <div style={{ marginTop: 4 }}>
                  <span className="habit-schedule-tag">
                    {habit.schedule_type === 'daily' ? 'Every day' :
                     habit.schedule_type === 'times_per_week' ? `${habit.times_per_week}× / week` :
                     'Specific days'}
                  </span>
                </div>
              </div>
              <button
                id={`restore-${habit.id}`}
                className="btn btn-ghost btn-sm"
                onClick={() => restore(habit)}
                disabled={restoring === habit.id}
              >
                <RotateCcw size={14} />
                {restoring === habit.id ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
