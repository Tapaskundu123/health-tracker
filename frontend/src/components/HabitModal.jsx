import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { habitsApi } from '../api';
import { ColorPicker, IconPicker } from './HabitIcons';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_FORM = {
  name: '',
  description: '',
  color: '#6366f1',
  icon: 'star',
  schedule_type: 'daily',
  schedule_days: [1, 2, 3, 4, 5],
  times_per_week: 3,
};

export default function HabitModal({ habit, onClose, onSaved }) {
  const isEdit = !!habit;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState(
    isEdit
      ? {
          name: habit.name,
          description: habit.description || '',
          color: habit.color,
          icon: habit.icon,
          schedule_type: habit.schedule_type,
          schedule_days: habit.schedule_days || [1, 2, 3, 4, 5],
          times_per_week: habit.times_per_week || 3,
        }
      : { ...DEFAULT_FORM }
  );

  const set = (field) => (val) => {
    const value = val?.target ? val.target.value : val;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const toggleWeekday = (day) => {
    setForm((f) => ({
      ...f,
      schedule_days: f.schedule_days.includes(day)
        ? f.schedule_days.filter((d) => d !== day)
        : [...f.schedule_days, day],
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.schedule_type === 'weekdays' && form.schedule_days.length === 0) {
      errs.schedule_days = 'Select at least one day';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color,
        icon: form.icon,
        schedule_type: form.schedule_type,
        schedule_days: form.schedule_type === 'weekdays' ? form.schedule_days : undefined,
        times_per_week: form.schedule_type === 'times_per_week' ? Number(form.times_per_week) : undefined,
      };

      let res;
      if (isEdit) {
        res = await habitsApi.update(habit.id, payload);
        toast.success('Habit updated!');
      } else {
        res = await habitsApi.create(payload);
        toast.success('Habit created! 🎉');
      }

      onSaved(res.data.habit);
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) {
        const fieldErrors = {};
        data.details.forEach(({ field, message }) => { fieldErrors[field] = message; });
        setErrors(fieldErrors);
      } else {
        toast.error(data?.error || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit habit' : 'New habit'}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Habit' : 'New Habit'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="habit-form">
          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="habit-name">Habit Name *</label>
            <input
              id="habit-name"
              className="form-input"
              placeholder="e.g. Morning Meditation"
              value={form.name}
              onChange={set('name')}
              maxLength={100}
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="habit-desc">Description</label>
            <input
              id="habit-desc"
              className="form-input"
              placeholder="Optional notes..."
              value={form.description}
              onChange={set('description')}
              maxLength={500}
            />
          </div>

          {/* Icon */}
          <div className="form-group">
            <label className="form-label">Icon</label>
            <IconPicker value={form.icon} onChange={set('icon')} />
          </div>

          {/* Color */}
          <div className="form-group">
            <label className="form-label">Color</label>
            <ColorPicker value={form.color} onChange={set('color')} />
          </div>

          {/* Schedule Type */}
          <div className="form-group">
            <label className="form-label">Schedule</label>
            <div className="schedule-tabs">
              {[
                { value: 'daily', label: 'Every Day' },
                { value: 'weekdays', label: 'Specific Days' },
                { value: 'times_per_week', label: 'X Times / Week' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`schedule-tab ${form.schedule_type === opt.value ? 'selected' : ''}`}
                  onClick={() => set('schedule_type')(opt.value)}
                  id={`schedule-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekday Picker */}
          {form.schedule_type === 'weekdays' && (
            <div className="form-group">
              <label className="form-label">Days of Week</label>
              <div className="weekday-picker">
                {WEEKDAYS.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    className={`weekday-btn ${form.schedule_days.includes(i) ? 'selected' : ''}`}
                    onClick={() => toggleWeekday(i)}
                    id={`weekday-${day}`}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
              {errors.schedule_days && (
                <div className="form-error">{errors.schedule_days}</div>
              )}
            </div>
          )}

          {/* Times per week */}
          {form.schedule_type === 'times_per_week' && (
            <div className="form-group">
              <label className="form-label" htmlFor="times-per-week">
                Times per Week (1–7)
              </label>
              <input
                id="times-per-week"
                type="number"
                className="form-input"
                min={1}
                max={7}
                value={form.times_per_week}
                onChange={set('times_per_week')}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="habit-submit">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
