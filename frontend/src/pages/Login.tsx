import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogoIcon, UserIcon, LockIcon, AlertCircleIcon, EyeIcon, EyeOffIcon } from '../components/Icons';

const DEMO_CREDENTIALS = [
  { username: 'admin', role: 'Administrator', description: 'Full system access' },
  { username: 'dmo', role: 'Disaster Management Officer', description: 'Risk, red zones, alerts, reports' },
  { username: 'gis', role: 'GIS Analyst', description: 'GIS data, hazards, habitations, infrastructure' },
  { username: 'planner', role: 'Planning Officer', description: 'Capacity, relocation sites, recommendations' },
  { username: 'field', role: 'Field Officer', description: 'Assigned habitations, hazards, alerts' },
  { username: 'viewer', role: 'Viewer', description: 'Dashboard, map, basic risk info' },
];

const DEMO_PASSWORD = 'Demo@123';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (user: string) => {
    setUsername(user);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <LogoIcon className="text-primary-600 w-12 h-12" />
            <span className="text-2xl font-bold text-surface-900">Disaster Risk Platform</span>
          </Link>
          <h1 className="text-2xl font-semibold text-surface-900">Sign In</h1>
          <p className="mt-2 text-surface-500">Enter your credentials to access the platform</p>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm" role="alert">
              <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-surface-700 mb-1">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  placeholder="Enter username or email"
                  required
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1">
                Password
              </label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-sm font-medium text-surface-700 mb-3 text-center">Demo Credentials</p>
          <p className="text-xs text-surface-500 text-center mb-3">
            Password for all demo accounts: <code className="bg-surface-100 px-1.5 py-0.5 rounded text-primary-700 font-mono">{DEMO_PASSWORD}</code>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.username}
                type="button"
                onClick={() => fillDemoCredentials(cred.username)}
                className="p-2 text-left bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg transition-colors text-xs"
              >
                <p className="font-medium text-surface-900">{cred.username}</p>
                <p className="text-surface-500">{cred.role}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-surface-500">
          <p>Demo Mode: Fictional/sample data only</p>
        </div>
      </div>
    </div>
  );
}