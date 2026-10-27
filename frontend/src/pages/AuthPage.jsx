import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((e2) => ({ ...e2, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (tab === 'register' && form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const payload = { email: form.email, password: form.password };
      const res = tab === 'login'
        ? await authApi.login(payload)
        : await authApi.register({ ...payload, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

      login(res.data.token, res.data.user);
      toast.success(tab === 'login' ? 'Welcome back! 👋' : 'Account created! 🎉');
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) {
        const fieldErrors = {};
        data.details.forEach(({ field, message }) => {
          fieldErrors[field] = message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error(data?.error || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-bg-glow-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Zap size={28} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1>HabitFlow</h1>
            <p>Build better habits, one day at a time</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            id="tab-login"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrors({}); }}
          >
            Sign In
          </button>
          <button
            id="tab-register"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrors({}); }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} id="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              required
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder={tab === 'register' ? 'Min 8 chars, 1 uppercase, 1 number' : 'Your password'}
              value={form.password}
              onChange={set('password')}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                autoComplete="new-password"
                required
              />
              {errors.confirmPassword && (
                <div className="form-error">{errors.confirmPassword}</div>
              )}
            </div>
          )}

          <button
            id="auth-submit"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading
              ? 'Please wait…'
              : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Demo: <strong>demo@habits.com</strong> / <strong>Demo1234!</strong>
        </div>
      </div>
    </div>
  );
}
