import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import { ScaleIcon, MailIcon, ArrowRightIcon } from './Icons';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setMessage('Check your email for a link to reset your password. If you don’t see it, check your spam folder.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
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
          <h1 className="text-xl font-bold text-text-primary mb-1">Reset password</h1>
          <p className="text-sm text-text-tertiary mb-6">
            Enter your email and we’ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-accent text-sm">
                {message}
              </div>
            )}
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-medium text-text-tertiary mb-1.5">
                Email
              </label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  id="forgot-email"
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
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent-hover text-bg font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send reset link'}
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-tertiary">
            <Link to="/login" className="text-accent hover:text-accent-hover font-medium">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
