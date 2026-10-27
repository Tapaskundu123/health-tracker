import { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { statsApi } from '../api';
import { HabitIcon } from '../components/HabitIcons';

function RateColor(rate) {
  if (rate >= 80) return '#22c55e';
  if (rate >= 50) return '#f97316';
  return '#ef4444';
}

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi.get()
      .then((res) => setStats(res.data.stats))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen" style={{ minHeight: 300 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  const avg = stats.length
    ? Math.round(stats.reduce((s, x) => s + x.completion_rate, 0) / stats.length)
    : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stats</h1>
          <p className="page-subtitle">Completion rates for the last 30 days</p>
        </div>
      </div>

      {/* Summary card */}
      {stats.length > 0 && (
        <div className="card" style={{ marginBottom: 28, display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '3rem',
                fontWeight: 800,
                lineHeight: 1,
                color: RateColor(avg),
              }}
            >
              {avg}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Overall Average
            </div>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: 24 }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Average completion across all {stats.length} habits over the last 30 days.
            </div>
            <div
              style={{
                height: 8,
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${avg}%`,
                  height: '100%',
                  background: RateColor(avg),
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {stats.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <BarChart2 size={32} />
          </div>
          <h3>No data yet</h3>
          <p>Create and track habits to see your stats here.</p>
        </div>
      ) : (
        <div className="stats-list" id="stats-list">
          {[...stats].sort((a, b) => b.completion_rate - a.completion_rate).map((stat) => (
            <div key={stat.habit_id} className="stat-row" id={`stat-${stat.habit_id}`}>
              <div
                className="stat-icon"
                style={{ background: stat.habit_color + '22', border: `1px solid ${stat.habit_color}44` }}
              >
                <HabitIcon icon={stat.habit_icon} color={stat.habit_color} size={18} bgSize={40} />
              </div>

              <div className="stat-info">
                <div className="flex items-center gap-2 mb-2">
                  <div className="stat-name">{stat.habit_name}</div>
                  <span className="stat-schedule-badge">{stat.schedule_type.replace('_', ' ')}</span>
                </div>
                <div className="stat-bar-track">
                  <div
                    className="stat-bar-fill"
                    style={{
                      width: `${stat.completion_rate}%`,
                      background: `linear-gradient(90deg, ${stat.habit_color}, ${stat.habit_color}cc)`,
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Last 30 days
                </div>
              </div>

              <div
                className="stat-rate"
                style={{ color: RateColor(stat.completion_rate) }}
              >
                {stat.completion_rate}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
