import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login, loginWithGoogle } from '../services/authService';
import { ScaleIcon, MailIcon, LockIcon, ArrowRightIcon, GoogleIcon } from './Icons';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign in failed. Please try again.';
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <Link to="/" className="inline-flex items-center gap-2.5 text-text-secondary hover:text-text-primary mb-8 transition-colors">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <ScaleIcon className="text-accent w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">Legal AI</span>
        </Link>

        <div className="bg-bg-secondary border border-border rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-text-primary mb-1">Sign in</h1>
          <p className="text-sm text-text-tertiary mb-6">Use your email and password to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-text-tertiary mb-1.5">
                Email
              </label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-text-tertiary mb-1.5">
                Password
              </label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                />
              </div>
            </div>
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent-hover text-bg font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              <ArrowRightIcon className="w-4 h-4" />
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-bg-secondary px-2 text-text-tertiary">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-bg border border-border hover:border-border-light hover:bg-bg-tertiary text-text-primary font-medium rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              {googleLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-tertiary">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent hover:text-accent-hover font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
