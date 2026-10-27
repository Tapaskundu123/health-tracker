import { useState, useEffect, useCallback } from 'react';
import { Plus, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { habitsApi } from '../api';
import HabitCard from '../components/HabitCard';
import HabitModal from '../components/HabitModal';

export default function Dashboard() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await habitsApi.list(false);
      setHabits(res.data.habits);
    } catch {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const handleEdit = (habit) => {
    setEditingHabit(habit);
    setShowModal(true);
  };

  const handleArchive = async (habit) => {
    try {
      await habitsApi.archive(habit.id);
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
      toast.success(`"${habit.name}" archived`);
    } catch {
      toast.error('Failed to archive habit');
    }
  };

  const handleSaved = (saved) => {
    setHabits((prev) => {
      const exists = prev.find((h) => h.id === saved.id);
      return exists
        ? prev.map((h) => (h.id === saved.id ? saved : h))
        : [saved, ...prev];
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHabit(null);
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
          <h1 className="page-title">My Habits</h1>
          <p className="page-subtitle">
            {habits.length === 0
              ? 'Start building better habits today'
              : `${habits.length} active habit${habits.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          id="new-habit-btn"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={17} />
          New Habit
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Target size={32} />
          </div>
          <h3>No habits yet</h3>
          <p>Create your first habit to start tracking your progress and building streaks.</p>
          <button
            className="btn btn-primary"
            id="first-habit-btn"
            onClick={() => setShowModal(true)}
          >
            <Plus size={17} />
            Create your first habit
          </button>
        </div>
      ) : (
        <div className="habits-grid">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onRefresh={fetchHabits}
            />
          ))}
        </div>
      )}

      {showModal && (
        <HabitModal
          habit={editingHabit}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
